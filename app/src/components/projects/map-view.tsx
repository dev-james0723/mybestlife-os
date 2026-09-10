"use client";

import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjects } from "@/hooks/use-projects";
import { connectionFailure, useProjectMapConnections } from "@/hooks/use-project-map-connections";
import { useAppStore } from "@/stores/app-store";
import { getProjectMapUiCopy, relationshipSentence, type ProjectMapUiCopy } from "@/lib/i18n/project-map-ui";
import { getProjectStatusLabel } from "@/lib/projects/presentation";
import { buildRelations, CONNECTION_KINDS, neighborhood, validateConnection, type ConnectionInput, type MapRelation, type ProjectConnection } from "@/lib/projects/connections";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";
import type { Project, Idea } from "@/types/database";
import { cn } from "@/lib/utils";
import styles from "./project-map.module.css";

const ProjectMapCanvas = dynamic(() => import("./project-map-canvas").then((module) => module.ProjectMapCanvas), { ssr: false });

interface Props {
  projects: { project: Project }[];
  ideas: Idea[];
  onSelectProject: (project: Project) => void;
  ui: ProjectsUiCopy;
}
type Selection = { type: "project" | "edge"; id: string } | null;
type Editor = { input: ConnectionInput; existing?: ProjectConnection };

function subscribeViewport(listener: () => void) {
  const query = window.matchMedia("(min-width: 1280px)");
  const phone = window.matchMedia("(max-width: 649px)");
  query.addEventListener("change", listener); phone.addEventListener("change", listener);
  return () => { query.removeEventListener("change", listener); phone.removeEventListener("change", listener); };
}
const viewportSnapshot = () => window.innerWidth < 650 ? "phone" : window.innerWidth >= 1280 ? "desktop" : "tablet";
const serverSnapshot = () => "tablet";

/** Reuse the Projects query so canvas filters never become the validation dataset. */
export function ProjectMapView(props: Props) {
  const { data } = useProjects();
  const allProjects = data ?? props.projects.map((item) => item.project);
  const owner = allProjects[0]?.user_id ?? "";
  return <ProjectMapWorkspace key={owner} {...props} allProjects={allProjects} owner={owner} />;
}

function ProjectPicker({ label, value, onChange, projects, copy }: {
  label: string; value: string; onChange: (value: string) => void; projects: Project[]; copy: ProjectMapUiCopy;
}) {
  const [search, setSearch] = useState("");
  const id = useId();
  const choices = projects.filter((project) => project.id === value || project.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className={styles.picker}>
    <label htmlFor={id}>{label}</label>
    <input type="search" aria-label={`${copy.search} ${label}`} placeholder={copy.search} value={search} onChange={(event) => setSearch(event.target.value)} />
    <select id={id} required value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{copy.choose}</option>
      {choices.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
    </select>
  </div>;
}

/** Exported for a UI test harness; production always supplies authenticated project data. */
export function ProjectMapWorkspace({ projects, ideas, onSelectProject, ui, allProjects, owner }: Props & { allProjects: Project[]; owner: string }) {
  const language = useAppStore((state) => state.language);
  const copy = getProjectMapUiCopy(language);
  const viewport = useSyncExternalStore(subscribeViewport, viewportSnapshot, serverSnapshot);
  const database = useProjectMapConnections(owner);
  const [mode, setMode] = useState<"map" | "list" | null>(null);
  const actualMode = mode ?? (viewport === "phone" ? "list" : "map");
  const [selection, setSelection] = useState<Selection>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ProjectConnection | null>(null);
  const [undo, setUndo] = useState<ProjectConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const busyRef = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const inspectorId = useId();
  const mutationBusy = database.save.isPending || database.remove.isPending;
  const writesDisabled = !owner || database.isPending || database.isError || mutationBusy;
  const byId = useMemo(() => new Map(allProjects.filter((project) => project.user_id === owner).map((project) => [project.id, project])), [allProjects, owner]);
  const projectIds = useMemo(() => new Set(byId.keys()), [byId]);
  const records = database.data ?? [];
  const relations = useMemo(() => buildRelations(database.data ?? [], ideas.filter((idea) => idea.user_id === owner), projectIds), [database.data, ideas, projectIds, owner]);
  const filteredIds = new Set(projects.map((item) => item.project.id).filter((id) => byId.has(id)));
  const focus = focusId && filteredIds.has(focusId) ? neighborhood(relations, focusId) : null;
  const visibleProjects = projects.map((item) => item.project).filter((project) => byId.has(project.id) && (!focus || focus.has(project.id)));
  const visibleIds = new Set(visibleProjects.map((project) => project.id));
  const visibleRelations = relations.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const counts = new Map<string, number>();
  for (const edge of relations) { counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1); counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1); }
  const activeSelection = selection && (selection.type === "project" ? visibleIds.has(selection.id) : visibleRelations.some((edge) => edge.id === selection.id)) ? selection : null;
  const selectedProject = activeSelection?.type === "project" ? byId.get(activeSelection.id) : undefined;
  const selectedEdge = activeSelection?.type === "edge" ? relations.find((edge) => edge.id === activeSelection.id) : undefined;
  const name = (id: string) => byId.get(id)?.name ?? copy.noMatches;
  const sentence = (edge: MapRelation) => relationshipSentence(edge, name, copy);
  const rememberFocus = () => {
    const element = document.activeElement;
    // Keep the original canvas/list trigger when opening an editor from the mobile sheet.
    if (element instanceof HTMLElement && !element.closest('[role="dialog"]')) returnFocus.current = element;
  };
  const selectProject = (id: string) => { rememberFocus(); setSelection({ type: "project", id }); if (focusId) setFocusId(id); };
  const selectEdge = (id: string) => { rememberFocus(); setSelection({ type: "edge", id }); };
  const clear = () => { setSelection(null); setFocusId(null); };
  const start = (source = "") => { rememberFocus(); setError(null); setEditor({ input: { source_id: source, target_id: "", kind: "related" } }); };
  const edit = (record: ProjectConnection) => { rememberFocus(); setError(null); setEditor({ input: { source_id: record.source_id, target_id: record.target_id, kind: record.kind }, existing: record }); };
  const askRemove = (record: ProjectConnection) => { rememberFocus(); setError(null); setRemoveTarget(record); };
  const validate = editor ? validateConnection(editor.input, records, projectIds, editor.existing?.id) : null;
  const canSubmit = editor && !validate && !writesDisabled;

  async function save() {
    if (!editor || !canSubmit || busyRef.current) return;
    busyRef.current = true; setError(null);
    try {
      const saved = await database.save.mutateAsync(editor);
      setEditor(null); setSelection({ type: "edge", id: saved.id }); setNotice(copy.saved);
    } catch (failure) { setError(copy.errors[connectionFailure(failure)]); }
    finally { busyRef.current = false; }
  }
  async function remove() {
    if (!removeTarget || writesDisabled || busyRef.current) return;
    busyRef.current = true; setError(null);
    try {
      const removed = await database.remove.mutateAsync(removeTarget);
      setUndo(removed); setRemoveTarget(null); setSelection(null); setNotice(copy.removed);
    } catch (failure) { setError(copy.errors[connectionFailure(failure)]); }
    finally { busyRef.current = false; }
  }
  async function restore() {
    if (!undo || writesDisabled || busyRef.current) return;
    const invalid = validateConnection(undo, records, projectIds);
    if (invalid) { setError(copy.errors[invalid]); return; }
    busyRef.current = true; setError(null);
    try {
      await database.save.mutateAsync({ input: undo });
      setUndo(null); setNotice(copy.restored);
    } catch (failure) { setError(copy.errors[connectionFailure(failure)]); }
    finally { busyRef.current = false; }
  }

  const connectionActions = (edge: MapRelation) => edge.record ? <div className={styles.actions}>
    <Button type="button" variant="outline" disabled={writesDisabled} onClick={() => edit(edge.record!)}>{copy.edit}</Button>
    <Button type="button" variant="outline" disabled={writesDisabled} onClick={() => askRemove(edge.record!)}>{copy.remove}</Button>
  </div> : <p>{copy.readOnly}</p>;

  const inspector = <div className={styles.inspector}>
    {selectedProject ? <>
      <h3>{selectedProject.name}</h3><p>{getProjectStatusLabel(selectedProject.status, ui)} · {copy.count(counts.get(selectedProject.id) ?? 0)}</p>
      <div className={styles.actions}>
        <Button type="button" disabled={writesDisabled || allProjects.length < 2} onClick={() => start(selectedProject.id)}>{copy.connect}</Button>
        <Button type="button" variant="outline" onClick={() => { clear(); onSelectProject(selectedProject); }}>{copy.open}</Button>
        <Button type="button" variant="outline" aria-pressed={!!focus} onClick={() => { setFocusId(focus ? null : selectedProject.id); if (viewport !== "desktop") setSelection(null); }}>{focus ? copy.showAll : copy.connectedOnly}</Button>
      </div>
      {selectedProject.description && <p className={styles.description}>{selectedProject.description}</p>}
      <div className={styles.list}>
        {relations.filter((edge) => edge.source === selectedProject.id || edge.target === selectedProject.id).map((edge) => <div key={edge.id} className={styles.row}>
          <p>{sentence(edge)}</p>
          {!visibleRelations.some((visible) => visible.id === edge.id) && <p>{copy.filtered}</p>}
          {connectionActions(edge)}
        </div>)}
        {!counts.get(selectedProject.id) && <p>{copy.noProjectLinks}</p>}
      </div>
    </> : selectedEdge ? <>
      <h3>{copy.relationship}</h3><p>{sentence(selectedEdge)}</p>
      {selectedEdge.kind !== "shared-idea" && <p>{copy.hints[selectedEdge.kind]}</p>}
      {selectedEdge.ideaIds.length > 0 && <p>{copy.ideaCount(selectedEdge.ideaIds.length)}</p>}
      {connectionActions(selectedEdge)}
    </> : <><h3>{copy.selectTitle}</h3><p>{copy.selectBody}</p></>}
  </div>;

  return <section className={styles.workspace} aria-labelledby={headingId}>
    <header className={styles.header}>
      <div><h2 id={headingId}>{copy.title}</h2><p>{copy.description}</p></div>
      <Button type="button" onClick={() => start()} disabled={writesDisabled || allProjects.length < 2}>{copy.createTitle}</Button>
    </header>
    {database.isPending && owner && <p role="status">{copy.loading}</p>}
    {database.isError && <div role="alert" className={styles.error}>{copy.errors[connectionFailure(database.error)]} <Button type="button" variant="outline" disabled={database.isFetching} onClick={() => void database.refetch()}>{copy.retry}</Button></div>}
    {!owner && <p role="alert" className={styles.error}>{copy.errors.access}</p>}
    {database.isSuccess && !relations.length && <div className={styles.callout}><div><h3>{copy.firstTitle}</h3><p>{copy.firstBody}</p></div><Button type="button" onClick={() => start()} disabled={writesDisabled || allProjects.length < 2}>{copy.firstAction}</Button></div>}
    <div className={styles.notice}>
      <p role="status" aria-live="polite">{notice}</p>
      {undo && <><Button type="button" variant="outline" disabled={writesDisabled} onClick={() => void restore()}>{copy.undo}</Button><Button type="button" variant="ghost" disabled={mutationBusy} onClick={() => { setUndo(null); setNotice(""); setError(null); }}>{copy.dismiss}</Button></>}
    </div>
    {error && !editor && !removeTarget && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.body}>
      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <div role="group" aria-label={copy.title}>
            <Button type="button" variant={actualMode === "map" ? "secondary" : "ghost"} aria-pressed={actualMode === "map"} onClick={() => setMode("map")}>{copy.map}</Button>
            <Button type="button" variant={actualMode === "list" ? "secondary" : "ghost"} aria-pressed={actualMode === "list"} onClick={() => setMode("list")}>{copy.list}</Button>
          </div>
          <span>{copy.visibleCount(visibleRelations.length, relations.length)}</span>
          {focusId && <Button type="button" variant="outline" onClick={() => setFocusId(null)}>{copy.showAll}</Button>}
        </div>
        {actualMode === "map" && <ProjectMapCanvas projects={visibleProjects.map((project) => ({ id: project.id, name: project.name, status: project.status, statusLabel: getProjectStatusLabel(project.status, ui) }))} relations={visibleRelations} selected={activeSelection} counts={counts} copy={copy} disabled={writesDisabled || allProjects.length < 2} selectProject={selectProject} selectEdge={selectEdge} connect={start} clear={clear} sentence={sentence} />}
        {actualMode === "list" && <div className={styles.list}>
          <h3>{copy.projects}</h3>
          <div className={styles.projectList}>{visibleProjects.map((project) => <div className={styles.row} key={project.id}>
            <button type="button" aria-controls={inspectorId} onClick={() => selectProject(project.id)}>{project.name}</button>
            <p>{getProjectStatusLabel(project.status, ui)} · {copy.count(counts.get(project.id) ?? 0)}</p>
            <Button type="button" variant="outline" disabled={writesDisabled || allProjects.length < 2} onClick={() => start(project.id)}>{copy.connect}</Button>
          </div>)}</div>
          <h3>{copy.list}</h3>
          {visibleRelations.map((edge) => <div className={styles.row} key={edge.id}><button type="button" aria-controls={inspectorId} onClick={() => selectEdge(edge.id)}>{sentence(edge)}</button>{connectionActions(edge)}</div>)}
          {!visibleRelations.length && <p>{copy.empty}</p>}
        </div>}
        {!visibleProjects.length && <p className={styles.help}>{copy.noMatches}</p>}
      </div>
      {viewport === "desktop" && <aside id={inspectorId} className={styles.panel} aria-label={copy.selectTitle}>{inspector}{activeSelection && <Button type="button" variant="ghost" className={styles.closeInspector} onClick={clear}>{copy.close}</Button>}</aside>}
    </div>
    <Dialog open={viewport !== "desktop" && !!activeSelection && !editor && !removeTarget} onOpenChange={(open) => { if (!open) setSelection(null); }}>
      <DialogContent size="md" className={cn(styles.dialog, styles.sheet)} finalFocus={returnFocus}>
        <DialogHeader><DialogTitle>{copy.title}</DialogTitle><DialogDescription>{copy.selectBody}</DialogDescription></DialogHeader>
        <div id={viewport !== "desktop" ? inspectorId : undefined}>{inspector}</div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!editor} onOpenChange={(open) => { if (!open && !busyRef.current) { setEditor(null); setError(null); } }}>
      <DialogContent size="md" className={styles.dialog} showCloseButton={!mutationBusy} finalFocus={returnFocus}>
        <DialogHeader><DialogTitle>{editor?.existing ? copy.editTitle : copy.createTitle}</DialogTitle><DialogDescription>{copy.description}</DialogDescription></DialogHeader>
        {editor && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <fieldset disabled={mutationBusy}>
            <ProjectPicker label={copy.source} value={editor.input.source_id} projects={[...byId.values()]} copy={copy} onChange={(source_id) => { setError(null); setEditor({ ...editor, input: { ...editor.input, source_id } }); }} />
            <label>{copy.relationship}<select value={editor.input.kind} onChange={(event) => { setError(null); setEditor({ ...editor, input: { ...editor.input, kind: event.target.value as ConnectionInput["kind"] } }); }}>{CONNECTION_KINDS.map((kind) => <option key={kind} value={kind}>{copy.kinds[kind]}</option>)}</select></label>
            <ProjectPicker label={copy.target} value={editor.input.target_id} projects={[...byId.values()]} copy={copy} onChange={(target_id) => { setError(null); setEditor({ ...editor, input: { ...editor.input, target_id } }); }} />
          </fieldset>
          <p>{copy.hints[editor.input.kind]}</p>
          {editor.input.source_id && editor.input.target_id && <p className={styles.preview} aria-live="polite">{sentence({ id: "preview", source: editor.input.source_id, target: editor.input.target_id, kind: editor.input.kind, ideaIds: [] })}</p>}
          {validate && editor.input.source_id && editor.input.target_id && <p role="alert" className={styles.error}>{copy.errors[validate]}</p>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={mutationBusy} onClick={() => { setEditor(null); setError(null); }}>{copy.cancel}</Button><Button type="submit" disabled={!canSubmit}>{mutationBusy ? copy.saving : copy.save}</Button></DialogFooter>
        </form>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open && !busyRef.current) { setRemoveTarget(null); setError(null); } }}>
      <DialogContent size="sm" className={styles.dialog} showCloseButton={!mutationBusy} finalFocus={returnFocus}>
        <DialogHeader><DialogTitle>{copy.removeTitle}</DialogTitle><DialogDescription>{copy.removeBody}</DialogDescription></DialogHeader>
        {removeTarget && <p>{sentence({ id: removeTarget.id, source: removeTarget.source_id, target: removeTarget.target_id, kind: removeTarget.kind, ideaIds: [] })}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={mutationBusy} onClick={() => { setRemoveTarget(null); setError(null); }}>{copy.cancel}</Button><Button type="button" variant="destructive" disabled={writesDisabled} onClick={() => void remove()}>{copy.remove}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}

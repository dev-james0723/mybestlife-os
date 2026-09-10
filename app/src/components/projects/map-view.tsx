"use client";

import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { CircleHelp, Focus, Link2, List, Loader2, Network, Pencil, Unlink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjects } from "@/hooks/use-projects";
import { useProjectConnections } from "@/hooks/use-project-connections";
import { useAppStore } from "@/stores/app-store";
import { getProjectStatusLabel } from "@/lib/projects/presentation";
import { getProjectMapUiCopy, type ProjectMapUiCopy } from "@/lib/i18n/project-map-ui";
import { CONNECTION_KINDS, ProjectConnectionError, buildProjectMapEdges, projectNeighborhood, validateConnection, type ConnectionDraft, type ProjectConnection, type ProjectMapEdge } from "@/lib/projects/connections";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project, Idea } from "@/types/database";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";
import { ProjectMapCanvas } from "./project-map-canvas";
import styles from "./project-map.module.css";

type Props = { projects: ProjectWithMeta[]; ideas: Idea[]; onSelectProject: (project: Project) => void; ui: ProjectsUiCopy };
type Store = ReturnType<typeof useProjectConnections>;
type EditorState = { id: string; sourceId: string; previous?: ProjectConnection };
const EMPTY_RECORDS: ProjectConnection[] = [];
function message(error: unknown, ui: ProjectMapUiCopy): string {
  return ui.errors[error instanceof ProjectConnectionError ? error.problem : "failed"];
}
function useMedia(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function ProjectMapView(props: Props) {
  const store = useProjectConnections();
  const { data: allProjects } = useProjects();
  const language = useAppStore((s) => s.language);
  const copy = getProjectMapUiCopy(language);
  // Remount transient selections and undo state on an account switch. The cache
  // and all mutations are independently scoped to the authenticated owner.
  return <ProjectConnectionsWorkspace key={store.userId} {...props} store={store} copy={copy}
    allProjects={(allProjects ?? props.projects.map((p) => p.project)).filter((p) => p.user_id === store.userId)} />;
}

function ProjectConnectionsWorkspace({ projects, ideas, onSelectProject, ui: projectUi, store, copy: ui, allProjects }: Props & { store: Store; copy: ProjectMapUiCopy; allProjects: Project[] }) {
  const desktop = useMedia("(min-width: 1200px)");
  const phone = useMedia("(max-width: 649px)");
  const [viewChoice, setViewChoice] = useState<"map" | "list" | null>(null);
  const view = viewChoice ?? (phone ? "list" : "map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [removing, setRemoving] = useState<ProjectConnection | null>(null);
  const [removed, setRemoved] = useState<ProjectConnection | null>(null);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");
  const lastTrigger = useRef<HTMLElement | null>(null);
  const connectButton = useRef<HTMLButtonElement>(null);
  const records = store.query.data ?? EMPTY_RECORDS;
  const lookup = useMemo(() => new Map(allProjects.map((p) => [p.id, p])), [allProjects]);
  const knownIds = useMemo(() => new Set(lookup.keys()), [lookup]);
  const allEdges = useMemo(() => buildProjectMapEdges(records, ideas, knownIds), [records, ideas, knownIds]);
  const baseProjects = projects.map((p) => p.project).filter((p) => knownIds.has(p.id));
  const baseIds = new Set(baseProjects.map((p) => p.id));
  const selected = selectedId && baseIds.has(selectedId) ? lookup.get(selectedId) : undefined;
  const selectedEdge = allEdges.find((edge) => edge.id === selectedEdgeId);
  const focusActive = focused && !!selected;
  const highlighted = selected ? projectNeighborhood(selected.id, allEdges) : new Set(selectedEdge ? [selectedEdge.source, selectedEdge.target] : []);
  const visibleProjects = focusActive ? baseProjects.filter((p) => highlighted.has(p.id)) : baseProjects;
  const visibleIds = new Set(visibleProjects.map((p) => p.id));
  const visibleEdges = allEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  const counts = new Map<string, number>();
  for (const edge of allEdges) { counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1); counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1); }
  const disabled = store.busy || store.loading || store.query.isError || !store.userId;
  const name = (id: string) => lookup.get(id)?.name ?? ui.unknown;
  const sentence = (edge: ProjectMapEdge | ConnectionDraft) => {
    const source = "source" in edge ? edge.source : edge.source_id;
    const target = "target" in edge ? edge.target : edge.target_id;
    return `${name(source)} ${edge.kind === "shared-idea" ? `· ${ui.shared} ·` : ui.kinds[edge.kind]} ${name(target)}`;
  };
  function captureFocus() { lastTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }
  function restoreFocus() { requestAnimationFrame(() => { (lastTrigger.current?.isConnected ? lastTrigger.current : connectButton.current)?.focus({ preventScroll: true }); }); }
  function inspect(id: string) {
    captureFocus(); setSelectedId(id); setSelectedEdgeId(null); setPanelOpen(true);
    setAnnouncement(ui.selected(name(id), counts.get(id) ?? 0));
  }
  function inspectEdge(id: string) { captureFocus(); setSelectedId(null); setSelectedEdgeId(id); setPanelOpen(true); }
  function closePanel() { setPanelOpen(false); restoreFocus(); }
  function connect(sourceId = "") {
    captureFocus(); setPanelOpen(false); setError("");
    setEditor({ id: crypto.randomUUID(), sourceId });
  }
  function edit(row: ProjectConnection) { captureFocus(); setPanelOpen(false); setError(""); setEditor({ id: row.id, sourceId: row.source_id, previous: row }); }
  function connectionRow(edge: ProjectMapEdge) {
    return <button type="button" className={styles.connectionRow} key={edge.id} onClick={() => inspectEdge(edge.id)}>
      {sentence(edge)}
      {(!baseIds.has(edge.source) || !baseIds.has(edge.target)) && <span>{ui.outside}</span>}
      {edge.kind === "shared-idea" && <span>{ui.derived}</span>}
    </button>;
  }
  const panel = <>
    <div className={styles.panelHeader}><span className={styles.muted}>{selectedEdge ? ui.connection : ui.inspect}</span>
      {panelOpen && <Button type="button" variant="ghost" size="icon" onClick={closePanel} aria-label={ui.close}><X /></Button>}
    </div>
    <div className={styles.section}>
      {panelOpen && selected ? <>
        <span className={styles.status} data-status={selected.status}>{getProjectStatusLabel(selected.status, projectUi)}</span>
        <h3>{selected.name}</h3>
        <p className={styles.muted}>{ui.connections(counts.get(selected.id) ?? 0)}</p>
        <Button type="button" onClick={() => connect(selected.id)} disabled={disabled || allProjects.length < 2}><Link2 />{ui.connect}</Button>
        <Button type="button" variant="outline" onClick={() => { setPanelOpen(false); onSelectProject(selected); }}>{ui.openProject}</Button>
        <div className={styles.connectionList}>
          {allEdges.filter((edge) => edge.source === selected.id || edge.target === selected.id).map(connectionRow)}
          {!counts.get(selected.id) && <p className={styles.muted}>{ui.noConnections}</p>}
        </div>
      </> : panelOpen && selectedEdge ? <>
        <p className={styles.preview}>{sentence(selectedEdge)}</p>
        <p className={styles.muted}>{selectedEdge.kind === "shared-idea" ? ui.derived : ui.hints[selectedEdge.kind]}</p>
        {selectedEdge.record && <>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => edit(selectedEdge.record!)}><Pencil />{ui.edit}</Button>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => { captureFocus(); setPanelOpen(false); setError(""); setRemoving(selectedEdge.record!); }}><Unlink />{ui.remove}</Button>
        </>}
        {[selectedEdge.source, selectedEdge.target].map((id) => <Button key={id} type="button" variant="outline" disabled={!lookup.has(id)} onClick={() => { const p = lookup.get(id); if (p) { setPanelOpen(false); onSelectProject(p); } }}>{ui.openProject}: {name(id)}</Button>)}
      </> : <><Network aria-hidden="true" /><h3>{ui.title}</h3><p className={styles.muted}>{ui.emptySelection}</p><p className={styles.muted}>{ui.helpConnect}</p></>}
    </div>
  </>;

  return <section className={styles.root} aria-label={ui.title}>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    <header className={styles.header}>
      <div><h2>{ui.title}</h2><p className={styles.muted}>{ui.description}</p></div>
      <Button ref={connectButton} type="button" onClick={() => connect()} disabled={disabled || allProjects.length < 2}><Link2 />{ui.connectProjects}</Button>
    </header>
    {store.loading && <p role="status" className={styles.muted}>{ui.loading}</p>}
    {store.query.isError && <div className={styles.error} role="alert"><span>{message(store.query.error, ui)}</span><Button type="button" variant="outline" disabled={store.query.isFetching} onClick={() => { void store.query.refetch(); }}>{ui.retry}</Button></div>}
    {!store.loading && !store.userId && <p className={styles.error} role="alert">{ui.errors.forbidden}</p>}
    {error && !removing && <p className={styles.error} role="alert">{error}</p>}
    {notice && <div className={styles.notice}><span role="status" aria-live="polite">{notice}</span>
      {removed && <Button type="button" variant="outline" disabled={disabled} onClick={async () => {
        if (store.busy) return;
        setError("");
        try { await store.restore.mutateAsync(removed); setRemoved(null); setNotice(ui.restored); }
        catch (e) { setError(message(e, ui)); }
      }}>{ui.undo}</Button>}
    </div>}
    <div className={styles.toolbar}>
      <div className={styles.toggle} role="group" aria-label={ui.title}>
        <Button type="button" variant={view === "map" ? "secondary" : "ghost"} aria-pressed={view === "map"} onClick={() => setViewChoice("map")}><Network />{ui.map}</Button>
        <Button type="button" variant={view === "list" ? "secondary" : "ghost"} aria-pressed={view === "list"} onClick={() => setViewChoice("list")}><List />{ui.list}</Button>
      </div>
      <div className={styles.controls}>
        <Button type="button" variant="outline" disabled={!selected} aria-pressed={focusActive} onClick={() => setFocused(!focusActive)}><Focus />{focusActive ? ui.showAll : ui.focus}</Button>
        <Button type="button" variant="ghost" size="icon" aria-label={ui.help} onClick={() => { captureFocus(); setHelp(true); }}><CircleHelp /></Button>
      </div>
    </div>
    <div className={styles.workspace}>
      <div className={styles.board}>
        <div className={styles.summary}><span>{ui.counts(visibleProjects.length, visibleEdges.length)}</span><span>{store.busy ? ui.saving : ""}</span></div>
        {!store.loading && !store.query.isError && allEdges.length === 0 && visibleProjects.length >= 2 && <div className={styles.firstUse}>
          <div><h3>{ui.startTitle}</h3><p className={styles.muted}>{ui.startDescription}</p></div>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => connect()}>{ui.firstConnection}</Button>
        </div>}
        {visibleProjects.length === 0 ? <div className={styles.empty}><Network aria-hidden="true" /><h3>{ui.noProjects}</h3><p className={styles.muted}>{ui.noProjectsHint}</p></div>
          : view === "map" ? <ProjectMapCanvas projects={visibleProjects} edges={visibleEdges} counts={counts} highlighted={highlighted}
            selectedId={selected?.id ?? null} selectedEdgeId={selectedEdge?.id ?? null} disabled={disabled || allProjects.length < 2} ui={ui}
            status={(p) => getProjectStatusLabel(p.status, projectUi)} sentence={sentence} onInspect={inspect} onConnect={connect} onInspectEdge={inspectEdge} />
          : <div className={styles.projectList}>{visibleProjects.map((project) => <article key={project.id} className={styles.projectItem}>
            <span className={styles.status} data-status={project.status}>{getProjectStatusLabel(project.status, projectUi)}</span>
            <div className={styles.controls}><button type="button" className={styles.projectName} onClick={() => inspect(project.id)}>{project.name}</button>
              <Button type="button" variant="outline" disabled={disabled || allProjects.length < 2} onClick={() => connect(project.id)}><Link2 />{ui.connect}</Button></div>
            <div className={styles.connectionList}>{allEdges.filter((edge) => edge.source === project.id || edge.target === project.id).map(connectionRow)}</div>
            {!counts.get(project.id) && <p className={styles.muted}>{ui.noConnections}</p>}
          </article>)}</div>}
        {allEdges.length > visibleEdges.length && <p className={styles.hint}>{ui.hidden(allEdges.length - visibleEdges.length)}</p>}
      </div>
      {desktop && <aside className={styles.inspector} aria-label={ui.inspect}>{panel}</aside>}
    </div>
    <Dialog open={!desktop && panelOpen && !editor && !removing && !help} onOpenChange={(open) => { if (!open) closePanel(); }}>
      <DialogContent className={`${styles.modal} ${styles.sheet}`} showCloseButton={false}>
        <DialogTitle className="sr-only">{ui.inspect}</DialogTitle><DialogDescription className="sr-only">{ui.description}</DialogDescription>{panel}
      </DialogContent>
    </Dialog>
    <Dialog open={!!editor} onOpenChange={(open) => { if (!open && !store.busy) { setEditor(null); restoreFocus(); } }}>
      <DialogContent size="lg" className={styles.modal} showCloseButton={false}>
        <DialogHeader><DialogTitle>{editor?.previous ? ui.editTitle : ui.createTitle}</DialogTitle><DialogDescription>{ui.formDescription}</DialogDescription></DialogHeader>
        {editor && <ConnectionEditor key={editor.id} editor={editor} projects={allProjects} records={records} store={store} ui={ui}
          onCancel={() => { setEditor(null); restoreFocus(); }} onSaved={(row) => {
            setEditor(null); setRemoved(null); setError(""); setNotice(ui.saved); setSelectedId(null); setSelectedEdgeId(row.id); setPanelOpen(desktop); restoreFocus();
          }} />}
      </DialogContent>
    </Dialog>
    <Dialog open={!!removing} onOpenChange={(open) => { if (!open && !store.busy) { setRemoving(null); setError(""); restoreFocus(); } }}>
      <DialogContent size="md" className={styles.modal} showCloseButton={false}>
        <DialogHeader><DialogTitle>{ui.removeTitle}</DialogTitle><DialogDescription>{ui.removeDescription}</DialogDescription></DialogHeader>
        {removing && <p className={styles.preview}>{sentence(removing)}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={store.busy} onClick={() => { setRemoving(null); setError(""); restoreFocus(); }}>{ui.cancel}</Button>
          <Button type="button" disabled={store.busy} onClick={async () => {
            if (!removing || store.busy) return;
            setError("");
            try { const row = await store.remove.mutateAsync(removing); setRemoved(row); setRemoving(null); setSelectedEdgeId(null); setPanelOpen(false); setNotice(ui.removed); restoreFocus(); }
            catch (e) { setError(message(e, ui)); }
          }}>{store.busy ? ui.saving : ui.remove}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={help} onOpenChange={(open) => { setHelp(open); if (!open) restoreFocus(); }}>
      <DialogContent size="md" className={styles.modal} showCloseButton={false}>
        <DialogHeader><DialogTitle>{ui.help}</DialogTitle><DialogDescription>{ui.description}</DialogDescription></DialogHeader>
        <p>{ui.helpExplore}</p><p>{ui.helpConnect}</p><p>{ui.navigationHint}</p><p>{ui.keyboardHint}</p><p>{ui.helpList}</p>
        <DialogFooter><Button type="button" onClick={() => { setHelp(false); restoreFocus(); }}>{ui.close}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}

function ConnectionEditor({ editor, projects, records, store, ui, onCancel, onSaved }: {
  editor: EditorState; projects: Project[]; records: ProjectConnection[]; store: Store; ui: ProjectMapUiCopy;
  onCancel: () => void; onSaved: (row: ProjectConnection) => void;
}) {
  const prefix = useId();
  const [draft, setDraft] = useState<ConnectionDraft>(editor.previous ?? { source_id: editor.sourceId, target_id: "", kind: "related" });
  const [requestId, setRequestId] = useState(editor.id);
  const [sourceSearch, setSourceSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [error, setError] = useState("");
  function change(update: Partial<ConnectionDraft>) {
    setDraft((old) => ({ ...old, ...update })); setError("");
    if (!editor.previous) setRequestId(crypto.randomUUID());
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (store.busy) return;
    const problem = validateConnection(draft, records, new Set(projects.map((p) => p.id)), editor.previous?.id ?? requestId);
    if (problem) { setError(ui.errors[problem]); return; }
    setError("");
    try { onSaved(await store.save.mutateAsync({ id: requestId, draft, previous: editor.previous })); }
    catch (e) { setError(message(e, ui)); }
  }
  const picker = (field: "source_id" | "target_id", label: string, search: string, setSearch: (s: string) => void) => <div className={styles.field}>
    <label htmlFor={`${prefix}-${field}`}>{label}</label>
    {projects.length > 8 && <input type="search" value={search} disabled={store.busy} onChange={(event) => setSearch(event.target.value)} placeholder={ui.searchProjects} aria-label={`${label}: ${ui.searchProjects}`} />}
    <select id={`${prefix}-${field}`} required disabled={store.busy} value={draft[field]} onChange={(event) => change({ [field]: event.target.value })}>
      <option value="" disabled>{ui.chooseProject}</option>
      {projects.filter((p) => p.id === draft[field] || p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  </div>;
  const source = projects.find((p) => p.id === draft.source_id);
  const target = projects.find((p) => p.id === draft.target_id);
  return <form className={styles.editor} onSubmit={submit} aria-busy={store.busy}>
    {picker("source_id", ui.first, sourceSearch, setSourceSearch)}
    <div className={styles.field}><label htmlFor={`${prefix}-kind`}>{ui.relationship}</label>
      <select id={`${prefix}-kind`} value={draft.kind} disabled={store.busy} onChange={(event) => change({ kind: event.target.value as ConnectionDraft["kind"] })} aria-describedby={`${prefix}-hint`}>
        {CONNECTION_KINDS.map((kind) => <option key={kind} value={kind}>{ui.kinds[kind]}</option>)}
      </select><p id={`${prefix}-hint`} className={styles.muted}>{ui.hints[draft.kind]}</p>
    </div>
    {picker("target_id", ui.second, targetSearch, setTargetSearch)}
    <div className={styles.preview} aria-live="polite"><p>{ui.preview}</p><p>{source?.name ?? ui.chooseProject} <strong>{ui.kinds[draft.kind]}</strong> {target?.name ?? ui.chooseProject}</p></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <DialogFooter><Button type="button" variant="outline" disabled={store.busy} onClick={onCancel}>{ui.cancel}</Button>
      <Button type="submit" disabled={store.busy || !source || !target}>{store.busy && <Loader2 aria-hidden="true" />}{store.busy ? ui.saving : ui.save}</Button></DialogFooter>
  </form>;
}

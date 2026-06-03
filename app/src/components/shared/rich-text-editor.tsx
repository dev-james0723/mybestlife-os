"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ClipboardEvent,
} from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ImageIcon,
  Indent,
  Italic,
  Link2,
  List,
  ListOrdered,
  Outdent,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { createLocaleCopyMap } from "@/lib/i18n/copy-helpers";

const INLINE_IMAGE_MAX_BYTES = 900_000;

const BLOCK_OPTIONS = [
  { value: "p", label: "Paragraph" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "blockquote", label: "Quote" },
  { value: "pre", label: "Code block" },
] as const;

const FONT_FAMILIES = [
  { value: "system-ui", label: "System" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: '"Times New Roman", Times, serif', label: "Times" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: '"Courier New", monospace', label: "Courier" },
] as const;

const FONT_SIZES = [
  { value: "1", label: "Small" },
  { value: "2", label: "Smaller" },
  { value: "3", label: "Normal" },
  { value: "4", label: "Medium" },
  { value: "5", label: "Large" },
  { value: "6", label: "Larger" },
  { value: "7", label: "Huge" },
] as const;

const TEXT_COLORS = [
  "#171717",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#db2777",
] as const;

const HIGHLIGHT_COLORS = [
  "#fef08a",
  "#bbf7d0",
  "#bae6fd",
  "#e9d5ff",
  "#fecdd3",
  "#f5f5f4",
  "transparent",
] as const;

const inlineImageToastCopy = createLocaleCopyMap(
  {
    tooLarge: "Inline images must be under about 900 KB.",
  },
  {
    "zh-TW": { tooLarge: "內嵌圖片大小需小於約 900 KB。" },
    "zh-CN": { tooLarge: "内嵌图片大小需小于约 900 KB。" },
    ja: { tooLarge: "インライン画像は約 900 KB 未満である必要があります。" },
    ko: { tooLarge: "인라인 이미지는 약 900KB 미만이어야 합니다." },
    fr: { tooLarge: "Les images intégrées doivent faire moins d’environ 900 Ko." },
    it: { tooLarge: "Le immagini inline devono essere inferiori a circa 900 KB." },
    es: { tooLarge: "Las imágenes incrustadas deben pesar menos de unos 900 KB." },
    vi: { tooLarge: "Hình nhúng phải nhỏ hơn khoảng 900 KB." },
  },
);

export type RichTextEditorHandle = {
  getHtml: () => string;
  getText: () => string;
  /** Full DOM text including &lt;style&gt;/&lt;script&gt; bodies (unlike innerText). Use when persisting pasted HTML/source. */
  getCodeSource: () => string;
  reset: () => void;
  setHtml: (html: string) => void;
};

export type RichTextEditorProps = {
  initialHtml?: string | null;
  placeholder?: string;
  minHeightClass?: string;
  onChange?: () => void;
  className?: string;
};

function ToolbarDivider() {
  return <div className="mx-0.5 hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      initialHtml = "",
      placeholder = "Write something…",
      minHeightClass = "min-h-[180px]",
      onChange,
      className,
    },
    imperativeRef
  ) {
    const language = useAppStore((s) => s.language);
    const localizedUi = inlineImageToastCopy[language] ?? inlineImageToastCopy.en;
    const innerRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [editorEmpty, setEditorEmpty] = useState(true);
    const [blockType, setBlockType] = useState<string>("p");
    const [fmtTick, setFmtTick] = useState(0);

    const syncEmptyFromDom = useCallback(() => {
      const text = innerRef.current?.innerText?.trim() ?? "";
      setEditorEmpty(!text);
    }, []);

    const refresh = useCallback(() => {
      syncEmptyFromDom();
      setFmtTick((n) => n + 1);
      onChange?.();
    }, [onChange, syncEmptyFromDom]);

    const exec = (command: string, value?: string) => {
      innerRef.current?.focus();
      try {
        document.execCommand(command, false, value);
      } catch {
        /* ignore */
      }
      refresh();
    };

    const getHtml = () => innerRef.current?.innerHTML?.trim() ?? "";
    const getText = () => innerRef.current?.innerText?.trim() ?? "";
    const getCodeSource = () => {
      const el = innerRef.current;
      if (!el) return "";
      const parts: string[] = [];
      function walk(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
          parts.push(node.textContent ?? "");
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const tag = (node as HTMLElement).tagName;
        if (tag === "BR") {
          parts.push("\n");
          return;
        }
        const isBlock = /^(DIV|P|PRE|H[1-6]|LI|BLOCKQUOTE|TABLE|TR|UL|OL)$/.test(tag);
        if (isBlock && parts.length > 0 && !/\n$/.test(parts[parts.length - 1])) {
          parts.push("\n");
        }
        for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
        if (isBlock && parts.length > 0 && !/\n$/.test(parts[parts.length - 1])) {
          parts.push("\n");
        }
      }
      for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i]);
      return parts.join("").replace(/\u00A0/g, " ").trim();
    };

    const setHtml = useCallback((html: string) => {
      if (!innerRef.current) return;
      innerRef.current.innerHTML = html;
      syncEmptyFromDom();
      setFmtTick((n) => n + 1);
    }, [syncEmptyFromDom]);

    const reset = useCallback(() => {
      if (innerRef.current) innerRef.current.innerHTML = "";
      setBlockType("p");
      setEditorEmpty(true);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }, []);

    useLayoutEffect(() => {
      if (!innerRef.current) return;
      innerRef.current.innerHTML = initialHtml ?? "";
      queueMicrotask(() => {
        syncEmptyFromDom();
        setFmtTick((n) => n + 1);
      });
    }, [initialHtml, syncEmptyFromDom]);

    useImperativeHandle(imperativeRef, () => ({
      getHtml,
      getText,
      getCodeSource,
      reset,
      setHtml,
    }));

    const cmdActive = (name: string) => {
      void fmtTick;
      try {
        return document.queryCommandState(name);
      } catch {
        return false;
      }
    };

    const handleBlockChange = (next: string) => {
      setBlockType(next);
      exec("formatBlock", `<${next}>`);
    };

    const insertImageFromFile = (files: FileList | null) => {
      const file = files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      if (file.size > INLINE_IMAGE_MAX_BYTES) {
        toast.error(localizedUi.tooLarge);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        innerRef.current?.focus();
        const src = JSON.stringify(reader.result);
        const html = `<img src=${src} alt="" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:10px 0" />`;
        try {
          document.execCommand("insertHTML", false, html);
        } catch {
          /* ignore */
        }
        refresh();
      };
      reader.readAsDataURL(file);
      if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handlePaste = useCallback(
      (e: ClipboardEvent<HTMLDivElement>) => {
        const plain = e.clipboardData.getData("text/plain");
        if (!plain) return;

        const hasHtmlStructure =
          /<!doctype html>/i.test(plain) ||
          /<html[\s>]/i.test(plain) ||
          /<(head|body|style|script|table|form)[\s>]/i.test(plain);
        const hasCodePatterns =
          /^```[\s\S]*```$/m.test(plain) ||
          /^<\?php/m.test(plain) ||
          /^\s*import\s+.*from\s+/m.test(plain) ||
          /^\s*#include\s*</m.test(plain) ||
          /\{[\s\S]*:[\s\S]*\}/.test(plain) && /<[a-z]/i.test(plain);
        const multiLineTagCount = (plain.match(/<\/?[a-z][a-z0-9]*[\s>]/gi) || []).length;
        const looksLikeCode = hasHtmlStructure || hasCodePatterns || multiLineTagCount >= 6;

        if (!looksLikeCode) return;
        e.preventDefault();
        try {
          document.execCommand("insertText", false, plain);
        } catch {
          const sel = window.getSelection();
          if (sel?.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(plain));
            range.collapse(false);
          }
        }
        refresh();
      },
      [refresh],
    );

    const insertLink = () => {
      const url = window.prompt("Link URL (https://…)", "https://");
      if (!url?.trim()) return;
      exec("createLink", url.trim());
    };

    const applyForeColor = (hex: string) => exec("foreColor", hex);
    const applyHilite = (hex: string) => {
      if (hex === "transparent") exec("backColor", "transparent");
      else exec("hiliteColor", hex);
    };

    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm",
          className
        )}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => insertImageFromFile(e.target.files)}
        />

        <div className="flex flex-col gap-1 border-b border-border bg-muted/40 px-1.5 py-1.5 sm:px-2">
          <div className="flex flex-wrap items-center gap-1 sm:gap-0.5">
            <ToolbarIcon aria-label="Undo" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("undo")}>
              <Undo2 className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon aria-label="Redo" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("redo")}>
              <Redo2 className="size-3.5" />
            </ToolbarIcon>
            <ToolbarDivider />
            <ToolbarIcon
              aria-label="Bold"
              active={cmdActive("bold")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("bold")}
            >
              <span className="text-xs font-bold">B</span>
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Italic"
              active={cmdActive("italic")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("italic")}
            >
              <Italic className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Underline"
              active={cmdActive("underline")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("underline")}
            >
              <Underline className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Strikethrough"
              active={cmdActive("strikeThrough")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("strikeThrough")}
            >
              <Strikethrough className="size-3.5" />
            </ToolbarIcon>
            <ToolbarDivider />
            <ToolbarIcon
              aria-label="Bullet list"
              active={cmdActive("insertUnorderedList")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("insertUnorderedList")}
            >
              <List className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Numbered list"
              active={cmdActive("insertOrderedList")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("insertOrderedList")}
            >
              <ListOrdered className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon aria-label="Outdent" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("outdent")}>
              <Outdent className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon aria-label="Indent" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("indent")}>
              <Indent className="size-3.5" />
            </ToolbarIcon>
            <ToolbarDivider />
            <ToolbarIcon
              aria-label="Align left"
              active={cmdActive("justifyLeft")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("justifyLeft")}
            >
              <AlignLeft className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Align center"
              active={cmdActive("justifyCenter")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("justifyCenter")}
            >
              <AlignCenter className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Align right"
              active={cmdActive("justifyRight")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("justifyRight")}
            >
              <AlignRight className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Justify"
              active={cmdActive("justifyFull")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("justifyFull")}
            >
              <AlignJustify className="size-3.5" />
            </ToolbarIcon>
            <ToolbarDivider />
            <ToolbarIcon aria-label="Insert link" onMouseDown={(e) => e.preventDefault()} onClick={insertLink}>
              <Link2 className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Insert image"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon className="size-3.5" />
            </ToolbarIcon>
            <ToolbarIcon
              aria-label="Clear formatting"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec("removeFormat")}
            >
              <RemoveFormatting className="size-3.5" />
            </ToolbarIcon>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-t border-border pt-1 sm:border-t-0 sm:pt-0">
            <Select
              value={blockType}
              onValueChange={(v) => {
                if (v != null && v !== "") handleBlockChange(String(v));
              }}
            >
              <SelectTrigger
                size="sm"
                className="!h-11 min-w-[6.5rem] text-xs sm:!h-8"
                title="Block style"
              >
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(v) => {
                if (v != null && v !== "") exec("fontName", String(v));
              }}
            >
              <SelectTrigger size="sm" className="!h-11 min-w-[5.5rem] text-xs sm:!h-8" title="Font">
                <span className="truncate text-muted-foreground">Font</span>
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((f) => (
                  <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(v) => {
                if (v != null && v !== "") exec("fontSize", String(v));
              }}
            >
              <SelectTrigger size="sm" className="!h-11 min-w-[4.5rem] text-xs sm:!h-8" title="Size">
                <span className="truncate text-muted-foreground">Size</span>
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Text</span>
            <div className="flex flex-wrap items-center gap-1 sm:gap-0.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={`Text ${c}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyForeColor(c)}
                  className="size-11 shrink-0 rounded-lg border border-border shadow-sm transition hover:scale-105 sm:size-6 sm:rounded-md"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Highlight</span>
            <div className="flex flex-wrap items-center gap-1 sm:gap-0.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c === "transparent" ? "Clear highlight" : `Highlight ${c}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHilite(c)}
                  className={cn(
                    "size-11 shrink-0 rounded-lg border border-border shadow-sm transition hover:scale-105 sm:size-6 sm:rounded-md",
                    c === "transparent" &&
                      "bg-[repeating-linear-gradient(45deg,#e4e4e7,#e4e4e7_3px,#fafafa_3px,#fafafa_6px)] dark:bg-[repeating-linear-gradient(45deg,#3f3f46,#3f3f46_3px,#27272a_3px,#27272a_6px)]"
                  )}
                  style={c === "transparent" ? undefined : { backgroundColor: c }}
                />
              ))}
            </div>

            <label className="ml-auto flex min-h-11 cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-muted/60 sm:min-h-0 sm:px-2">
              <span>Custom</span>
              <input
                type="color"
                className="h-11 w-11 cursor-pointer overflow-hidden rounded border-0 bg-transparent p-0 sm:h-6 sm:w-8"
                defaultValue="#171717"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => applyForeColor(e.target.value)}
                title="Custom text color"
              />
            </label>
          </div>
        </div>

        <div className={cn("relative bg-background", minHeightClass)}>
          {editorEmpty && (
            <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">{placeholder}</div>
          )}
          <div
            ref={innerRef}
            role="textbox"
            tabIndex={0}
            aria-multiline
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onInput={refresh}
            onMouseUp={refresh}
            onKeyUp={refresh}
            onPaste={handlePaste}
            className={cn(
              minHeightClass,
              "px-3 py-3 text-sm leading-relaxed text-foreground outline-none",
              "[&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400 [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-medium [&_img]:max-w-full [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-muted/40 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
            )}
          />
        </div>
      </div>
    );
  }
);

function ToolbarIcon({
  children,
  active,
  className,
  ...rest
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground transition sm:size-8",
        active
          ? "bg-pink-100 text-foreground dark:bg-pink-950/45 dark:text-foreground"
          : "hover:bg-muted/80",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

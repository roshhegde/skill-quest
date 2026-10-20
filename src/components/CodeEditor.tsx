import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

const theme = EditorView.theme(
  {
    "&": { backgroundColor: "#0B0F1C", fontSize: "14px" },
    ".cm-gutters": { backgroundColor: "#0B0F1C", border: "none" },
    ".cm-content": { fontFamily: "'JetBrains Mono', monospace" },
    ".cm-scroller": { fontFamily: "'JetBrains Mono', monospace", lineHeight: "1.6" },
  },
  { dark: true },
);

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Ctrl/Cmd+Enter runs the code. */
  onRun?: () => void;
  label: string;
};

export function CodeEditor({ value, onChange, onRun, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  // Latest callbacks, so the editor is created once but never calls stale ones.
  const callbacks = useRef({ onChange, onRun });
  callbacks.current = { onChange, onRun };

  useEffect(() => {
    const editor = new EditorView({
      doc: value,
      parent: host.current!,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        theme,
        keymap.of([
          { key: "Mod-Enter", run: () => (callbacks.current.onRun?.(), true) },
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({ "aria-label": label }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
        }),
      ],
    });
    view.current = editor;
    return () => editor.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outside changes (e.g. Reset) replace the document.
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div className="editor" ref={host} />;
}

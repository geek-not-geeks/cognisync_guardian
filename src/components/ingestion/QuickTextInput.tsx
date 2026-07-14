import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Mic, Sparkles, ShieldCheck } from "lucide-react";
import { sanitizeText, type SanitizeFlag } from "@/utils/privacySanitizer";


interface QuickTextInputProps {
  onClose: () => void;
  onProcess: (text: string) => void;
}

export function QuickTextInput({ onClose, onProcess }: QuickTextInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const handleDictation = () => {
    // Simulate dictation toggle; Web Speech API integration wires later.
    setIsListening((prev) => !prev);
  };

  const handleProcess = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onProcess(trimmed);
  };

  return (
    <section className="flex h-full flex-col gap-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-3d-base transition-all active:scale-95 active:shadow-3d-pressed"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-text-secondary" strokeWidth={2} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">Quick Text</h1>
        <div className="h-12 w-12" />
      </header>

      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-1 flex-col">
          <label
            htmlFor="quick-text"
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary"
          >
            Describe your task
          </label>
          <textarea
            id="quick-text"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="e.g., Chemistry lab report due next Thursday, standard effort..."
            className="w-full flex-1 resize-none rounded-4xl bg-slate-deep p-5 text-base leading-relaxed text-foreground shadow-3d-pressed outline-none placeholder:text-text-secondary focus:ring-2 focus:ring-accent-mint/40"
            style={{ minHeight: "50vh" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleDictation}
            className={`flex items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed ${
              isListening
                ? "bg-warning-amber text-slate-deep"
                : "bg-surface text-foreground"
            }`}
          >
            <Mic
              className={`h-5 w-5 ${isListening ? "text-slate-deep" : "text-text-secondary"}`}
              strokeWidth={2}
            />
            {isListening ? "Listening..." : "Start Dictation"}
          </button>

          <button
            type="button"
            onClick={handleProcess}
            disabled={!text.trim()}
            className="flex items-center justify-center gap-2 rounded-full bg-accent-mint px-5 py-4 text-base font-semibold text-slate-deep shadow-3d-base transition-all active:scale-[0.98] active:shadow-3d-pressed disabled:opacity-40 disabled:active:scale-100"
          >
            <Sparkles className="h-5 w-5 text-slate-deep" strokeWidth={2} />
            Process Task
          </button>
        </div>
      </div>
    </section>
  );
}

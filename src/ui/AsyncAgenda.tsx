import React, { useEffect, useId, useRef, useState } from "react";
import type { AreaKey, AsyncItem, Mood, Person } from "../domain/types";
import { AREA_KEYS, AREA_LABELS } from "../domain/types";
import { AreaTag } from "./atoms/AreaTag";

interface AsyncAgendaProps {
  person: Person;
  items: AsyncItem[];
  /** Called when the user submits a new async item. */
  onAdd: (item: { text: string; area: AreaKey; mood: Mood }) => void;
}

/** Human-readable mood labels */
const MOOD_LABELS: Record<Mood, string> = {
  energized: "Energized",
  neutral: "Neutral",
  unsure: "Unsure",
  stressed: "Stressed",
};

/** Maps mood to a display color CSS var. Stressed uses cold/alert color.
 *  Color is ALWAYS paired with the word (WCAG 1.4.1). */
function moodCssVar(mood: Mood): string {
  switch (mood) {
    case "energized": return "var(--ooo-fresh)";
    case "neutral":   return "var(--matcha)";
    case "unsure":    return "var(--ooo-stale)";
    case "stressed":  return "var(--ooo-cold)";
  }
}

function moodBgCssVar(mood: Mood): string {
  switch (mood) {
    case "energized": return "var(--matcha-tint)";
    case "neutral":   return "var(--neutral-bg)";
    case "unsure":    return "var(--yolk-tint)";
    case "stressed":  return "var(--bad-bg)";
  }
}

/** Small mood chip — always shows the word (color-not-alone). */
function MoodChip({ mood }: { mood: Mood }) {
  const label = MOOD_LABELS[mood];
  return (
    <span
      className="inline-flex items-center font-mono text-xs px-1.5 py-0.5 rounded-sm"
      style={{
        color: moodCssVar(mood),
        backgroundColor: moodBgCssVar(mood),
      }}
      aria-label={`Mood: ${label}`}
    >
      {label}
    </span>
  );
}

/**
 * "From [name]" — displays report-authored async agenda items and an add form.
 *
 * Each item shows an AreaTag + MoodChip (stressed = var(--ooo-cold) + the word).
 * The add form has fully labelled controls for textarea, area select, mood select.
 */
export function AsyncAgenda({ person, items, onAdd }: AsyncAgendaProps) {
  const formId = useId();
  const textareaId = `${formId}-text`;
  const areaSelectId = `${formId}-area`;
  const moodSelectId = `${formId}-mood`;

  const [text, setText] = useState("");
  const [area, setArea] = useState<AreaKey>("growth");
  const [mood, setMood] = useState<Mood>("neutral");
  const [showForm, setShowForm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea whenever the form is opened (showForm transitions false→true).
  // useEffect runs after the DOM is painted so the element is guaranteed to be mounted.
  useEffect(() => {
    if (showForm) {
      textareaRef.current?.focus();
    }
  }, [showForm]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ text: trimmed, area, mood });
    // Reset form
    setText("");
    setArea("growth");
    setMood("neutral");
    setShowForm(false);
  }

  return (
    <section aria-label={`From ${person.name}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-sans font-semibold text-sm text-ink uppercase tracking-wide">
          From {person.name}
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
          }}
          aria-expanded={showForm}
          aria-controls={`${formId}-add-form`}
          className="text-xs font-mono text-matcha-deep hover:text-matcha transition-colors"
        >
          {showForm ? "Cancel" : "+ Add item"}
        </button>
      </div>

      {/* Item list */}
      {items.length === 0 && !showForm && (
        <p className="text-sm text-muted py-2">Nothing raised yet.</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2 mb-3" role="list" aria-label={`Items raised by ${person.name}`}>
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1.5 py-2.5 px-3 rounded-md bg-paper border border-line"
            >
              {/* Tags row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <AreaTag area={item.area} variant="tint" />
                <MoodChip mood={item.mood} />
              </div>
              {/* Item text */}
              <p className="text-sm text-ink-2 leading-snug">{item.text}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      {showForm && (
        <form
          id={`${formId}-add-form`}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 py-3 px-3 rounded-md bg-matcha-tint border border-matcha-tint-border"
          aria-label={`Add item for ${person.name}`}
        >
          {/* Text area */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor={textareaId}
              className="font-mono text-xs text-matcha-deep uppercase tracking-wide"
            >
              What do you want to raise?
            </label>
            <textarea
              id={textareaId}
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Type something…"
              required
              className="text-sm text-ink bg-paper border border-matcha-tint-border rounded-sm px-2.5 py-2 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
            />
          </div>

          {/* Area select */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor={areaSelectId}
              className="font-mono text-xs text-matcha-deep uppercase tracking-wide"
            >
              Area
            </label>
            <select
              id={areaSelectId}
              value={area}
              onChange={(e) => setArea(e.target.value as AreaKey)}
              className="text-sm text-ink bg-paper border border-matcha-tint-border rounded-sm px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
            >
              {AREA_KEYS.map((k) => (
                <option key={k} value={k}>
                  {AREA_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Mood select */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor={moodSelectId}
              className="font-mono text-xs text-matcha-deep uppercase tracking-wide"
            >
              Mood
            </label>
            <select
              id={moodSelectId}
              value={mood}
              onChange={(e) => setMood(e.target.value as Mood)}
              className="text-sm text-ink bg-paper border border-matcha-tint-border rounded-sm px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-deep"
            >
              {(["energized", "neutral", "unsure", "stressed"] as Mood[]).map((m) => (
                <option key={m} value={m}>
                  {MOOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="self-start px-4 py-2 bg-matcha-deep text-paper rounded-md font-sans font-semibold text-sm transition-colors hover:bg-matcha"
          >
            Add to agenda
          </button>
        </form>
      )}
    </section>
  );
}

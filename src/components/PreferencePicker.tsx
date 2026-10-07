import { X } from "lucide-react";
import { useState } from "react";

import { labelFor, normalizeLabel, searchCatalog, type CatalogEntry } from "@/lib/diet";

/** How many suggestions to show under the search box. */
const SUGGESTIONS_SHOWN = 8;

/**
 * Pick any number of labels from a catalog, or add your own: chosen ones show as
 * chips with a remove button, and a search box suggests catalog entries as you
 * type, offering to add the typed text when nothing in the catalog matches.
 */
export function PreferencePicker({
  catalog,
  selected,
  onChange,
  placeholder,
  max,
  disabled,
}: {
  catalog: CatalogEntry[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  max: number;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  const typed = normalizeLabel(query, catalog);
  const suggestions = searchCatalog(query, catalog)
    .filter((e) => !selected.includes(e.key))
    .slice(0, SUGGESTIONS_SHOWN);
  const offerCustom =
    typed !== null && !selected.includes(typed) && !catalog.some((e) => e.key === typed);
  const full = selected.length >= max;

  function add(key: string | null) {
    if (!key || selected.includes(key) || full) return;
    onChange([...selected, key]);
    setQuery("");
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 text-sagedark border border-sage/30 pl-3 pr-2 py-1.5 text-sm font-semibold"
            >
              {labelFor(key, catalog)}
              <button
                onClick={() => onChange(selected.filter((k) => k !== key))}
                disabled={disabled}
                aria-label={`Remove ${labelFor(key, catalog)}`}
                className="opacity-60 hover:opacity-100 disabled:opacity-30"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Enter picks the best suggestion, or adds what was typed.
          add(offerCustom ? typed : (suggestions[0]?.key ?? null));
        }}
        className={selected.length > 0 ? "mt-3 max-w-lg" : "max-w-lg"}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={full ? `You've added the most you can (${max})` : placeholder}
          aria-label={placeholder}
          disabled={disabled || full}
          maxLength={60}
          className="w-full rounded-full border border-ink/15 bg-paper px-5 py-3 text-sm outline-none focus:border-sage disabled:opacity-60"
        />
      </form>

      {!full && (suggestions.length > 0 || offerCustom) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((entry) => (
            <button
              key={entry.key}
              onClick={() => add(entry.key)}
              disabled={disabled}
              className="rounded-full bg-paper border border-ink/15 px-3 py-1.5 text-sm font-medium hover:border-sage"
            >
              + {entry.label}
            </button>
          ))}
          {offerCustom && (
            <button
              onClick={() => add(typed)}
              disabled={disabled}
              className="rounded-full bg-paper border border-ink/15 px-3 py-1.5 text-sm font-medium hover:border-sage"
            >
              + Add “{labelFor(typed ?? "", catalog)}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

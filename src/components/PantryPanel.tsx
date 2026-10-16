import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PANTRY_CATEGORIES, guessCategory, type PantryCategory } from "@/lib/categorize";
import type { PantryRow } from "@/lib/kitchen.functions";

export function PantryPanel({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: PantryRow[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, patch: { category?: string; inStock?: boolean }) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const inStock = items.filter((i) => i.in_stock).length;
  const used = PANTRY_CATEGORIES.filter((cat) =>
    items.some((i) => i.category === cat),
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    setDraft("");
  }

  return (
    <div className="bg-cream rounded-2xl border border-ink/10 p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl">Your kitchen</h3>
        <span className="text-xs text-ink/50">{inStock} in stock</span>
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an item — e.g. sweet potatoes"
          aria-label="Add a grocery item"
          className="flex-1 rounded-full border border-ink/15 bg-paper px-4 py-2 text-sm outline-none focus:border-sage"
        />
        <button
          type="submit"
          className="rounded-full bg-terracotta text-cream px-4 py-2 text-sm font-semibold whitespace-nowrap"
        >
          Add item
        </button>
      </form>
      {draft.trim() && (
        <p className="mt-2 text-xs text-ink/50">
          Will go into <strong>{guessCategory(draft)}</strong> — you can move it later if
          that's wrong.
        </p>
      )}

      <div className="mt-5 space-y-4">
        {used.map((cat: PantryCategory) => (
          <div
            key={cat}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setDragOver(cat);
            }}
            onDragLeave={() => setDragOver((c) => (c === cat ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) onUpdate(dragId, { category: cat });
              setDragId(null);
              setDragOver(null);
            }}
            className={
              dragOver === cat
                ? "rounded-xl bg-sage/10 ring-2 ring-sage/40 p-2 -m-2"
                : "rounded-xl p-2 -m-2"
            }
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">
              {cat}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {items
                .filter((i) => i.category === cat)
                .map((item) => (
                  <span
                    key={item.id}
                    className={
                      item.in_stock
                        ? "inline-flex items-center rounded-full bg-sage/15 text-sagedark border border-sage/30 text-[13px] font-semibold"
                        : "inline-flex items-center rounded-full bg-paper text-ink/45 border border-ink/10 text-[13px] font-medium"
                    }
                  >
                    <button
                      draggable
                      onDragStart={() => setDragId(item.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOver(null);
                      }}
                      onClick={() => onUpdate(item.id, { inStock: !item.in_stock })}
                      aria-pressed={item.in_stock}
                      title="Click to mark in or out of stock; drag to move category"
                      className={
                        item.in_stock
                          ? "pl-2.5 pr-1 py-1 cursor-grab active:cursor-grabbing"
                          : "pl-2.5 pr-1 py-1 line-through cursor-grab active:cursor-grabbing"
                      }
                    >
                      {item.name}
                    </button>
                    {/* Drag-and-drop doesn't work on touch screens, so every chip
                        also gets a menu for re-filing and removing. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`More options for ${item.name}`}
                        className="pl-0.5 pr-1.5 py-1 opacity-60 hover:opacity-100 rounded-r-full"
                      >
                        <ChevronDown className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl font-body">
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.16em] text-ink/45">
                          Move to
                        </DropdownMenuLabel>
                        {PANTRY_CATEGORIES.filter((c) => c !== item.category).map((c) => (
                          <DropdownMenuItem
                            key={c}
                            onSelect={() => onUpdate(item.id, { category: c })}
                          >
                            {c}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => onRemove(item.id)}
                          className="text-terracotta focus:text-terracotta"
                        >
                          Remove from kitchen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="mt-4 text-sm text-ink/55">
          Nothing here yet — add your first grocery item above.
        </p>
      )}

      <p className="mt-5 text-xs text-ink/50">
        Click an item to mark it in or out of stock. Drag it onto another heading, or use
        its arrow menu, to re-file or remove it.
      </p>
    </div>
  );
}

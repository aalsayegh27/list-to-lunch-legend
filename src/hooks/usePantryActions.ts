import { useServerFn } from "@tanstack/react-start";

import { guessCategory, normalizeCategory } from "@/lib/categorize";
import {
  addPantryItems,
  removePantryItem,
  seedStarterPantry,
  updatePantryItem,
  type PantryRow,
} from "@/lib/kitchen.functions";
import type { StarterItem } from "@/lib/starter-pantry";
import { useKitchenCache } from "./useKitchenCache";

/** Items shown before the server has saved them carry a placeholder id. */
const PENDING = "pending:";

/**
 * Adding, ticking off, re-filing and removing pantry items. Each shows on screen
 * immediately; `onError` hears about any save that fails (the screen then resyncs).
 */
export function usePantryActions(onError: (message: string) => void) {
  const cache = useKitchenCache();
  const addFn = useServerFn(addPantryItems);
  const seedFn = useServerFn(seedStarterPantry);
  const updateFn = useServerFn(updatePantryItem);
  const removeFn = useServerFn(removePantryItem);

  async function save(work: () => Promise<unknown>, message: string) {
    try {
      await work();
    } catch {
      onError(message);
      await cache.resync();
    }
  }

  /** Show placeholder rows now, then swap in the saved ones. */
  async function insert(
    rows: Omit<PantryRow, "id">[],
    saveRows: () => Promise<{ items: PantryRow[] }>,
  ) {
    const placeholders = rows.map((r) => ({ ...r, id: `${PENDING}${r.name.toLowerCase()}` }));
    const ids = new Set(placeholders.map((p) => p.id));
    let fresh = placeholders;
    cache.patch((k) => {
      const taken = new Set(k.items.map((i) => i.name.toLowerCase()));
      fresh = placeholders.filter((p) => !taken.has(p.name.toLowerCase()));
      return { ...k, items: [...k.items, ...fresh] };
    });
    if (fresh.length === 0) return;
    await save(async () => {
      const { items } = await saveRows();
      cache.patch((k) => ({
        ...k,
        items: [...k.items.filter((i) => !ids.has(i.id)), ...items],
      }));
    }, "Couldn't add that. Try again in a bit.");
  }

  return {
    add(names: string[]) {
      const rows = names
        .map((n) => n.trim())
        .filter(Boolean)
        .map((name) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          category: guessCategory(name),
          in_stock: true,
        }));
      return insert(rows, () => addFn({ data: { names } }));
    },

    seed(starter: StarterItem[]) {
      const rows = starter.map((i) => ({
        name: i.name,
        category: normalizeCategory(i.category),
        in_stock: i.inStock,
      }));
      return insert(rows, () =>
        seedFn({
          data: {
            items: starter.map((i) => ({ name: i.name, category: i.category, inStock: i.inStock })),
          },
        }),
      );
    },

    update(id: string, patch: { category?: string; inStock?: boolean }) {
      if (id.startsWith(PENDING)) return;
      cache.patch((k) => ({
        ...k,
        items: k.items.map((i) =>
          i.id === id
            ? {
                ...i,
                ...(patch.category !== undefined && {
                  category: normalizeCategory(patch.category),
                }),
                ...(patch.inStock !== undefined && { in_stock: patch.inStock }),
              }
            : i,
        ),
      }));
      return save(
        () => updateFn({ data: { id, ...patch } }),
        "Couldn't save that change. Try again in a bit.",
      );
    },

    remove(id: string) {
      if (id.startsWith(PENDING)) return;
      cache.patch((k) => ({ ...k, items: k.items.filter((i) => i.id !== id) }));
      return save(() => removeFn({ data: { id } }), "Couldn't remove that. Try again in a bit.");
    },
  };
}

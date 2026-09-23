/**
 * Word-aware matching for grocery names. Plain substring checks misfire on
 * things like "egg" inside "eggplant" or "ham" inside "champagne", so these
 * helpers compare whole words and tolerate simple plurals.
 */

/** Lowercase, accent-free words: "Jalapeño peppers" → ["jalapeno", "peppers"]. */
export function toWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/** The spellings a word can take: "berry" → berry, berrys, berryes, berries. */
function forms(base: string): string[] {
  const out = [base, `${base}s`, `${base}es`];
  if (base.endsWith("y")) out.push(`${base.slice(0, -1)}ies`);
  return out;
}

export function sameWord(word: string, base: string): boolean {
  return forms(base).includes(word);
}

/** True when `word` is `base` or a compound ending in it ("blueberries" → "berry"). */
function endsWithWord(word: string, base: string): boolean {
  return forms(base).some((f) => word.endsWith(f));
}

/**
 * Where `phrase` appears in `words` as consecutive whole words, as the index
 * of its last word, or -1. With `compound`, the phrase's first word may also
 * be the tail of a longer word, so "berry" is found in "blueberries".
 */
export function findPhrase(
  words: string[],
  phrase: string[],
  { compound = false }: { compound?: boolean } = {},
): number {
  for (let start = 0; start + phrase.length <= words.length; start++) {
    const hit = phrase.every((p, i) => {
      const w = words[start + i]!;
      return i === 0 && compound ? endsWithWord(w, p) : sameWord(w, p);
    });
    if (hit) return start + phrase.length - 1;
  }
  return -1;
}

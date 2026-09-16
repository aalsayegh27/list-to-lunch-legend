# Mise: saved recipes + editable pantry

Two new features, both saved to your account so they survive grocery-list changes and follow you across devices.

## 1. Accounts

Adding sign-in is required for anything to be saved to "you" rather than one browser.

- Email + password sign-up/sign-in, plus "Continue with Google".
- Small account area in the header: shows your email when signed in, with sign out.
- Browsing meals and the pantry stays open to everyone; hearts and added items ask you to sign in first.

## 2. Favorite ("heart") recipes

- A heart button on every meal card — the featured cards and the matched-meals list.
- Tapping it fills the heart and saves that recipe to your account instantly.
- Hearted recipes are stored with their full details (title, time, blurb, steps, ingredients), so they stay readable even if your grocery list changes or that meal stops matching.

## 3. Saved recipes page

- New page at `/library`, linked from the header ("Saved") with a count.
- Same warm journal styling: cards in a grid, lunch/dinner filter, tap to expand the method.
- Each card shows which of its ingredients are currently on your list and which you'd need to grab.
- Unheart from here to remove it.
- Empty state points back to the planner.

## 4. Add your own pantry items

- "Add item" button on the pantry panel opens a small inline field.
- Type a name, press enter — it's added, marked in stock, and dropped into the category it belongs to.
- Category is guessed from a built-in word list (produce, proteins, dairy, grains, canned/jars, frozen, herbs). Unrecognised names land in a "Other" group so nothing is lost.
- Each added item can be removed.
- Your added items are saved to your account and reload every visit.

## 5. Manual re-sorting

- Any item chip can be dragged onto a different category heading to move it there.
- Works for both your added items and the original list items, so a bad guess is one drag away from fixed.
- The moved category is remembered per item on your account.
- On touch screens, dragging is supplemented by a small menu on each chip ("Move to…") so phones aren't left out.

## Technical notes

- Enable Lovable Cloud; email auth enabled and Google configured via the social-auth tool.
- Migration creates three tables, all owner-scoped with RLS on `auth.uid()` and explicit grants:
  - `favorite_recipes` (user_id, meal_id, snapshot jsonb, created_at, unique per user+meal)
  - `pantry_items` (user_id, name, category, created_at)
  - `item_overrides` (user_id, item_id, category) for manual re-categorisation of built-in items
- Reads/writes go through `createServerFn` with `requireSupabaseAuth`; TanStack Query holds the client cache.
- `/library` lives under `src/routes/_authenticated/library.tsx` (managed auth gate); `/auth` route added for sign-in.
- New `src/lib/categorize.ts` holds the keyword→category map; pure function, no AI call, so it's instant and free.
- Drag-and-drop uses native HTML5 drag events on the existing chips — no new dependency.
- `src/lib/kitchen-data.ts` grows an "Other" category and merged-item helpers so custom items flow through the existing meal-matching logic.
- Each new route gets its own `head()` metadata.

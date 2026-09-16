# Mise: accounts, saved recipes, personal pantry

The app becomes multi-user: everyone signs in first, builds their own pantry, then gets meals matched to it. Your current grocery list becomes an optional starter template rather than the built-in default.

## The flow

```text
Sign in / sign up  →  Build your pantry  →  See & heart meals  →  Edit pantry anytime
```

## 1. Sign-in is the front door

- `/` becomes a short welcome screen: the hero image, one line about what Mise does, and Sign up / Sign in. No meals or pantry visible yet.
- Email + password, plus "Continue with Google".
- Signed-in visitors landing on `/` go straight to the planner.
- Header shows your email and a sign-out option once signed in.

## 2. Build your pantry (first-run)

- Right after account creation, a "Stock your kitchen" step.
- Type items one at a time; each is sorted into a category automatically.
- Two shortcuts: a set of common staples you can tap to add, and "Start from a sample list" which loads the existing recurring grocery list as a starting point you can edit or clear.
- Oils and spices stay assumed for everyone.
- "Done — show me meals" moves you into the planner. Skipping is allowed; the planner then shows an empty state pointing back to the pantry.

## 3. The planner

- Meals are matched against *your* pantry only.
- Same layout as today: ready-now count, ingredient chips you can toggle in/out of stock, lunch/dinner filter, expandable cooking method.
- Featured cards up top now pick from meals you can actually cook.

## 4. Favorite ("heart") recipes

- A heart button on every meal card.
- Tapping it fills the heart and saves the recipe to your account instantly.
- Saved recipes keep their own copy of the details (title, time, blurb, steps, ingredients), so they never disappear when your pantry changes.

## 5. Saved recipes page

- New page at `/library`, linked from the header ("Saved") with a count.
- Cards in a grid, lunch/dinner filter, tap to expand the method.
- Each card shows which ingredients you currently have and which you'd need to grab.
- Unheart to remove. Empty state points back to the planner.

## 6. Add and re-sort pantry items

- "Add item" button on the pantry panel, always available.
- Category is guessed from a built-in word list (produce, proteins, dairy, grains, canned/jars, frozen, herbs); anything unrecognised lands in "Other" so nothing is lost.
- Drag any item chip onto a different category heading to move it. A "Move to…" menu on each chip covers phones.
- Items can be removed, and every change is saved to your account.

## 7. Your list, kept as a reusable CSV

- Your uploaded grocery list is exported to a spreadsheet file (`grocery_list.csv`, item name + category) saved in Files.
- It doubles as the sample list the "Start from a sample list" shortcut loads, and as the dummy data for a test account we can use to try out new features.
- I'll also remember that this list is your test-account data, so future work uses it rather than treating it as everyone's default.

## Technical notes


- Enable Lovable Cloud; email auth enabled and Google configured via the social-auth tool.
- Migration creates owner-scoped tables with RLS on `auth.uid()` and explicit grants:
  - `pantry_items` (user_id, name, category, in_stock, created_at)
  - `favorite_recipes` (user_id, meal_id, snapshot jsonb, created_at, unique per user+meal)
  - `profiles` (user_id, onboarded_at) so first-run routing knows whether to show the pantry setup
- `/` stays a public SSR route (welcome + auth entry). Planner, `/library`, and `/onboarding` live under `src/routes/_authenticated/` behind the managed gate; `/auth` is the public sign-in route.
- Reads/writes go through `createServerFn` with `requireSupabaseAuth`; TanStack Query holds the client cache; loaders under `_authenticated` prefetch.
- No item-override table needed now — category lives directly on each user's own `pantry_items` row, so a drag is a simple update.
- New `src/lib/categorize.ts` holds the keyword→category map (pure function, instant, no AI cost). The current grocery list moves into `src/lib/starter-pantry.ts` as the sample template.
- `src/lib/kitchen-data.ts` keeps the 12 meals but matches on item *names* rather than fixed IDs, so user-typed items participate in matching.
- Drag-and-drop uses native HTML5 drag events — no new dependency.
- Each route gets its own `head()` metadata.
- `grocery_list.csv` written to `/mnt/documents`, generated from the same source as `src/lib/starter-pantry.ts`; a project memory records it as the dummy test-account dataset.


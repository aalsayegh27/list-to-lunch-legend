import {
  Bean,
  Beef,
  Carrot,
  Citrus,
  Drumstick,
  Egg,
  Fish,
  Ham,
  LeafyGreen,
  Milk,
  Shrimp,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import type { Meal } from "@/lib/kitchen-data";
import { bannerIcons, type IconName } from "@/lib/meal-icons";

const ICONS: Record<IconName, LucideIcon> = {
  Bean,
  Beef,
  Carrot,
  Citrus,
  Drumstick,
  Egg,
  Fish,
  Ham,
  LeafyGreen,
  Milk,
  Shrimp,
  Sprout,
  Wheat,
};

/** A short strip of icons for a recipe's main ingredients, shown on every card. */
export function MealBanner({ meal }: { meal: Meal }) {
  const icons = bannerIcons(meal);
  return (
    <div
      role="img"
      aria-label={`Made with ${icons.map((i) => i.label.toLowerCase()).join(", ")}`}
      className="flex h-16 items-center justify-center gap-5 bg-butter/45 border-b border-ink/10"
    >
      {icons.map(({ icon, tone }) => {
        const Icon = ICONS[icon];
        return (
          <Icon
            key={icon}
            aria-hidden="true"
            strokeWidth={1.6}
            className={tone === "terracotta" ? "size-7 text-terracotta" : "size-7 text-sagedark"}
          />
        );
      })}
    </div>
  );
}

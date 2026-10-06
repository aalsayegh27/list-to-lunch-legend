import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { itemName, type Meal } from "@/lib/kitchen-data";
import { mealImages } from "@/lib/meal-images";
import { REPORT_REASON_LABELS, REPORT_REASONS, type ReportReason } from "@/lib/recipe-library";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="M12 20.3s-7.5-4.6-7.5-9.4A4.4 4.4 0 0 1 12 8.1a4.4 4.4 0 0 1 7.5 2.8c0 4.8-7.5 9.4-7.5 9.4Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MealCard({
  meal,
  missing,
  favorite,
  onToggleFavorite,
  vote,
  onVote,
  onReport,
}: {
  meal: Meal;
  missing?: string[];
  favorite: boolean;
  onToggleFavorite: () => void;
  /** The cook's own vote; voting buttons only show when onVote is given. */
  vote?: 1 | -1 | 0;
  onVote?: (vote: 1 | -1 | 0) => void;
  onReport?: (reason: ReportReason) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const missingList = missing ?? [];
  const image = mealImages[meal.id];

  return (
    <article className="overflow-hidden bg-paper rounded-2xl border border-ink/10">
      {image && (
        <img
          src={image}
          alt={`Two-color illustration of ${meal.title}`}
          loading="lazy"
          width={1024}
          height={768}
          className="aspect-[4/3] w-full object-cover border-b border-ink/10"
        />
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta">
          {meal.meal}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink/50">{meal.minutes} min</span>
          {onVote && (
            <>
              <button
                onClick={() => onVote(vote === 1 ? 0 : 1)}
                aria-pressed={vote === 1}
                aria-label={vote === 1 ? `Remove thumbs up from ${meal.title}` : `Thumbs up ${meal.title}`}
                className={
                  vote === 1
                    ? "text-sagedark transition-colors"
                    : "text-ink/30 hover:text-sagedark transition-colors"
                }
              >
                <ThumbsUp
                  className="size-[18px]"
                  strokeWidth={1.6}
                  fill={vote === 1 ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
              <button
                onClick={() => onVote(vote === -1 ? 0 : -1)}
                aria-pressed={vote === -1}
                aria-label={
                  vote === -1 ? `Remove thumbs down from ${meal.title}` : `Thumbs down ${meal.title}`
                }
                className={
                  vote === -1
                    ? "text-ink/70 transition-colors"
                    : "text-ink/30 hover:text-ink/70 transition-colors"
                }
              >
                <ThumbsDown
                  className="size-[18px]"
                  strokeWidth={1.6}
                  fill={vote === -1 ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            </>
          )}
          <button
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? `Remove ${meal.title} from saved` : `Save ${meal.title}`}
            className={
              favorite
                ? "text-terracotta transition-colors"
                : "text-ink/30 hover:text-terracotta transition-colors"
            }
          >
            <Heart filled={favorite} />
          </button>
        </div>
        </div>

        <h3 className="font-display text-xl leading-tight mt-2">{meal.title}</h3>
        <p className="text-sm text-ink/60 mt-1">{meal.blurb}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
        {missing ? (
          missingList.length === 0 ? (
            <span className="text-xs bg-sage/15 text-sagedark font-semibold px-2.5 py-1 rounded-full">
              All on hand
            </span>
          ) : (
            <span className="text-xs bg-butter/60 text-terracotta font-semibold px-2.5 py-1 rounded-full">
              Grab {missingList.map(itemName).join(", ").toLowerCase()}
            </span>
          )
        ) : null}
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto text-sm font-semibold text-ink"
        >
          {open ? "Hide method" : "How to cook →"}
        </button>
        </div>

        {open && (
          <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">
            You'll need
          </p>
          <p className="text-sm text-ink/70 mt-1">
            {meal.uses.map(itemName).join(", ")}
          </p>
          <ol className="mt-4 space-y-2">
            {meal.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink/75">
                <span className="shrink-0 size-5 rounded-full bg-sage/15 text-sagedark grid place-items-center text-[11px] font-semibold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {meal.source === "ai" && (
            <p className="mt-4 text-xs text-ink/50">
              Created by AI — double-check allergens and cooking times.
            </p>
          )}
          {onReport &&
            (reporting ? (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                  What's wrong?
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => onReport(reason)}
                      className="rounded-full bg-paper border border-ink/15 px-3 py-1 text-xs font-medium hover:border-sage"
                    >
                      {REPORT_REASON_LABELS[reason]}
                    </button>
                  ))}
                  <button
                    onClick={() => setReporting(false)}
                    className="px-1 text-xs font-semibold text-ink/50 underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setReporting(true)}
                className="mt-4 text-xs font-semibold text-ink/50 underline"
              >
                Report a problem
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

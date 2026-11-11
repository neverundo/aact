"use client";

import type { AppLocale } from "@/i18n/config";

type LanguageSwitcherProps = {
  locale: AppLocale;
  onChange: (locale: AppLocale) => void;
  ariaLabel: string;
  className?: string;
};

const OPTIONS: AppLocale[] = ["pt", "en"];

export function LanguageSwitcher({
  locale,
  onChange,
  ariaLabel,
  className,
}: LanguageSwitcherProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={["inline-flex items-center gap-1 text-sm", className]
        .filter(Boolean)
        .join(" ")}
    >
      {OPTIONS.map((option, index) => {
        const active = option === locale;
        return (
          <span key={option} className="inline-flex items-center gap-1">
            {index > 0 ? (
              <span className="text-stone-300" aria-hidden>
                |
              </span>
            ) : null}
            <button
              type="button"
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "font-semibold text-stone-900"
                  : "text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
              }
              onClick={() => {
                if (!active) onChange(option);
              }}
            >
              {option.toUpperCase()}
            </button>
          </span>
        );
      })}
    </div>
  );
}

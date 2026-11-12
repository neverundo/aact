"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { HelpKey } from "@/content/help";
import type { HelpContent } from "@/content/help/types";

export function resolveHelp(
  catalog: Record<string, unknown> | undefined,
  helpKey: HelpKey,
): HelpContent | undefined {
  if (!catalog) return undefined;
  const [ns, ...rest] = helpKey.split(".");
  const leaf = rest.join(".");
  const group = catalog[ns];
  if (!group || typeof group !== "object") return undefined;
  const content = (group as Record<string, unknown>)[leaf];
  if (!content || typeof content !== "object") return undefined;
  return content as HelpContent;
}

export function PageHelpToggle({
  open,
  onToggle,
  panelId,
}: {
  open: boolean;
  onToggle: () => void;
  panelId: string;
}) {
  const t = useTranslations("common");

  return (
    <button
      type="button"
      className="min-h-11 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={panelId}
    >
      {open ? t("hideHelp") : t("help")}
    </button>
  );
}

export function PageHelpPanel({
  helpKey,
  content,
  id,
}: {
  helpKey: HelpKey;
  content: HelpContent;
  id: string;
}) {
  const t = useTranslations("common");
  const headingId = useId();

  return (
    <section
      id={id}
      className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
      aria-labelledby={headingId}
      data-help-key={helpKey}
    >
      <h2 id={headingId} className="font-semibold text-stone-900">
        {t("helpTitle", { title: content.title })}
      </h2>
      <p>{content.summary}</p>

      <div className="space-y-2">
        <h3 className="font-medium text-stone-900">{t("helpActions")}</h3>
        <ul className="list-disc space-y-1 pl-5">
          {content.actions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {content.prerequisites?.length ? (
        <div className="space-y-2">
          <h3 className="font-medium text-stone-900">
            {t("helpPrerequisites")}
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            {content.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {content.pitfalls?.length ? (
        <div className="space-y-2">
          <h3 className="font-medium text-stone-900">{t("helpPitfalls")}</h3>
          <ul className="list-disc space-y-1 pl-5">
            {content.pitfalls.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {content.docsHref ? (
        <p className="text-xs text-stone-500">
          {t("helpDocs", { path: content.docsHref })}
        </p>
      ) : null}
    </section>
  );
}

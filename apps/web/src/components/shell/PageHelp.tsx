"use client";

import { useMessages, useTranslations } from "next-intl";
import type { HelpKey } from "@/content/help";
import type { HelpContent } from "@/content/help/types";
import { useShell } from "./ShellProvider";

function resolveHelp(
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

export function PageHelpButton({ helpKey }: { helpKey: HelpKey }) {
  const { openDrawer, closeDrawer } = useShell();
  const t = useTranslations("common");
  const messages = useMessages();
  const help = resolveHelp(
    messages.help as Record<string, unknown> | undefined,
    helpKey,
  );

  if (!help) {
    return null;
  }

  const content = help;

  function openHelp() {
    openDrawer({
      id: `help-${helpKey}`,
      title: t("helpTitle", { title: content.title }),
      description: content.summary,
      content: (
        <div className="space-y-4 text-sm text-stone-700">
          <section className="space-y-2">
            <h3 className="font-medium text-stone-900">{t("helpActions")}</h3>
            <ul className="list-disc space-y-1 pl-5">
              {content.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {content.prerequisites?.length ? (
            <section className="space-y-2">
              <h3 className="font-medium text-stone-900">
                {t("helpPrerequisites")}
              </h3>
              <ul className="list-disc space-y-1 pl-5">
                {content.prerequisites.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.pitfalls?.length ? (
            <section className="space-y-2">
              <h3 className="font-medium text-stone-900">{t("helpPitfalls")}</h3>
              <ul className="list-disc space-y-1 pl-5">
                {content.pitfalls.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {content.docsHref ? (
            <p className="text-xs text-stone-500">
              {t("helpDocs", { path: content.docsHref })}
            </p>
          ) : null}

          <button
            type="button"
            className="min-h-11 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100"
            onClick={closeDrawer}
          >
            {t("close")}
          </button>
        </div>
      ),
    });
  }

  return (
    <button
      type="button"
      className="min-h-11 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100"
      onClick={openHelp}
      aria-haspopup="dialog"
    >
      {t("help")}
    </button>
  );
}

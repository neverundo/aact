"use client";

import { useId, useState, type ReactNode } from "react";
import { useMessages } from "next-intl";
import type { HelpKey } from "@/content/help";
import { PageHelpPanel, PageHelpToggle, resolveHelp } from "./PageHelp";

export function PageHeader({
  title,
  description,
  actions,
  helpKey,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  helpKey?: HelpKey;
}) {
  const messages = useMessages();
  const help = helpKey
    ? resolveHelp(
        messages.help as Record<string, unknown> | undefined,
        helpKey,
      )
    : undefined;
  const [showHelp, setShowHelp] = useState(false);
  const panelId = useId();

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions || help ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {help && helpKey ? (
              <PageHelpToggle
                open={showHelp}
                onToggle={() => setShowHelp((value) => !value)}
                panelId={panelId}
              />
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>

      {help && helpKey && showHelp ? (
        <PageHelpPanel helpKey={helpKey} content={help} id={panelId} />
      ) : null}
    </>
  );
}

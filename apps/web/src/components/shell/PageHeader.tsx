import type { ReactNode } from "react";
import type { HelpKey } from "@/content/help";
import { PageHelpButton } from "./PageHelp";

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
  return (
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
      {actions || helpKey ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {helpKey ? <PageHelpButton helpKey={helpKey} /> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

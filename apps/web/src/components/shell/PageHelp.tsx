"use client";

import { getHelp, type HelpKey } from "@/content/help";
import { useShell } from "./ShellProvider";

export function PageHelpButton({ helpKey }: { helpKey: HelpKey }) {
  const { openDrawer, closeDrawer } = useShell();
  const help = getHelp(helpKey);

  function openHelp() {
    openDrawer({
      id: `help-${helpKey}`,
      title: `Ajuda · ${help.title}`,
      description: help.summary,
      content: (
        <div className="space-y-4 text-sm text-stone-700">
          <section className="space-y-2">
            <h3 className="font-medium text-stone-900">Ações neste ecrã</h3>
            <ul className="list-disc space-y-1 pl-5">
              {help.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {help.prerequisites?.length ? (
            <section className="space-y-2">
              <h3 className="font-medium text-stone-900">Pré-requisitos</h3>
              <ul className="list-disc space-y-1 pl-5">
                {help.prerequisites.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {help.pitfalls?.length ? (
            <section className="space-y-2">
              <h3 className="font-medium text-stone-900">Atenção</h3>
              <ul className="list-disc space-y-1 pl-5">
                {help.pitfalls.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {help.docsHref ? (
            <p className="text-xs text-stone-500">
              Documentação completa no repositório:{" "}
              <code className="rounded bg-stone-100 px-1">{help.docsHref}</code>
            </p>
          ) : null}

          <button
            type="button"
            className="min-h-11 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100"
            onClick={closeDrawer}
          >
            Fechar
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
      Ajuda
    </button>
  );
}

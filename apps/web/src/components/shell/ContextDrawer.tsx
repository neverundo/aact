"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useShell, type DrawerState } from "./ShellProvider";

const DRAWER_MS = 250;

export function ContextDrawer() {
  const { drawer, closeDrawer } = useShell();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const [prevDrawer, setPrevDrawer] = useState(drawer);
  const [rendered, setRendered] = useState<DrawerState>(drawer);
  const [open, setOpen] = useState(false);

  if (drawer !== prevDrawer) {
    setPrevDrawer(drawer);
    if (drawer) {
      setRendered(drawer);
    }
  }

  useEffect(() => {
    if (drawer) {
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setOpen(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const frame = window.requestAnimationFrame(() => setOpen(false));
    const timeout = window.setTimeout(() => setRendered(null), DRAWER_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [drawer]);

  useEffect(() => {
    if (!rendered || !open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));

      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [rendered, open, closeDrawer]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-hidden={!open}>
      <button
        type="button"
        aria-label="Fechar painel"
        className={[
          "absolute inset-0 bg-stone-900/40 transition-opacity duration-[250ms] ease-out",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
        onClick={closeDrawer}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={rendered.description ? descriptionId : undefined}
        className={[
          "relative flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-xl",
          "transition-transform duration-[250ms] ease-out will-change-transform",
          // open: slide in from-right-to-left; close: slide out from-left-to-right
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <h2 id={titleId} className="text-lg font-semibold text-stone-900">
              {rendered.title}
            </h2>
            {rendered.description ? (
              <p id={descriptionId} className="text-sm text-stone-600">
                {rendered.description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            aria-label="Fechar"
            onClick={closeDrawer}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{rendered.content}</div>
      </div>
    </div>
  );
}

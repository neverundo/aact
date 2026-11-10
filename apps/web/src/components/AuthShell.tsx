import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-2">
        <Link
          href="/"
          className="text-sm font-medium tracking-[0.2em] text-stone-500 uppercase"
        >
          AACT
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
      </div>
      {children}
    </main>
  );
}

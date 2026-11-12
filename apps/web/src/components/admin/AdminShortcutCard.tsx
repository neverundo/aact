import Link from "next/link";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";

type AdminShortcutCardProps = {
  href: string;
  icon: IconType;
  title: string;
  subtitle: string;
  total: number | null;
  loading?: boolean;
  error?: string | null;
  loadingLabel: string;
  emptyLabel: string;
  children?: ReactNode;
};

export function AdminShortcutCard({
  href,
  icon: Icon,
  title,
  subtitle,
  total,
  loading = false,
  error = null,
  loadingLabel,
  emptyLabel,
  children,
}: AdminShortcutCardProps) {
  const hasPreview = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <li>
      <Link
        href={href}
        className="flex min-h-28 flex-col gap-3 rounded-md border border-stone-200 bg-white p-4 text-stone-900 transition hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-stone-700" />
            <span className="truncate text-sm font-semibold">{title}</span>
          </div>
          <span className="shrink-0 text-[11px] font-medium tracking-wide text-stone-400 uppercase">
            {subtitle}
          </span>
        </div>

        <AdminShortcutCardBody
          loading={loading}
          error={error}
          total={total}
          hasPreview={hasPreview}
          loadingLabel={loadingLabel}
          emptyLabel={emptyLabel}
        >
          {children}
        </AdminShortcutCardBody>
      </Link>
    </li>
  );
}

function AdminShortcutCardBody({
  loading,
  error,
  total,
  hasPreview,
  loadingLabel,
  emptyLabel,
  children,
}: Readonly<{
  loading: boolean;
  error: string | null;
  total: number | null;
  hasPreview: boolean;
  loadingLabel: string;
  emptyLabel: string;
  children?: ReactNode;
}>) {
  if (loading) {
    return <p className="text-sm text-stone-500">{loadingLabel}</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }

  let preview: ReactNode = null;
  if (hasPreview) {
    preview = (
      <div className="min-w-0 flex-1 divide-y divide-stone-100">{children}</div>
    );
  } else if (total === 0) {
    preview = <p className="pt-2 text-sm text-stone-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex min-h-12 items-start gap-4">
      <p className="shrink-0 text-3xl font-semibold tabular-nums tracking-tight text-stone-900">
        {total ?? 0}
      </p>
      {preview}
    </div>
  );
}

export function AdminShortcutPreviewRow({
  primary,
  secondary,
  badge,
  meta,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="space-y-0.5 py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-medium text-stone-900">{primary}</p>
        {badge}
      </div>
      {secondary ? (
        <p className="truncate text-xs text-stone-500">{secondary}</p>
      ) : null}
      {meta ? <p className="truncate text-xs text-stone-400">{meta}</p> : null}
    </div>
  );
}

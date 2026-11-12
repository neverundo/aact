import type { DocStatus } from "@/content/docs/types";

const styles: Record<DocStatus, string> = {
  implemented: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  partially_implemented: "bg-amber-50 text-amber-950 ring-amber-200",
  planned: "bg-sky-50 text-sky-900 ring-sky-200",
  unsupported: "bg-stone-100 text-stone-700 ring-stone-200",
};

const labelsEn: Record<DocStatus, string> = {
  implemented: "implemented",
  partially_implemented: "partially implemented",
  planned: "planned",
  unsupported: "unsupported",
};

const labelsPt: Record<DocStatus, string> = {
  implemented: "implementado",
  partially_implemented: "parcialmente implementado",
  planned: "planeado",
  unsupported: "não suportado",
};

export function DocsStatusBadge({
  status,
  label,
  locale,
}: {
  status: DocStatus;
  label: string;
  locale: "en" | "pt";
}) {
  const statusLabel = locale === "pt" ? labelsPt[status] : labelsEn[status];
  return (
    <p
      className={`inline-flex flex-wrap items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span>{label}</span>
      <span className="opacity-80">· {statusLabel}</span>
    </p>
  );
}

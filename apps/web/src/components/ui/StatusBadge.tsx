const tones = {
  neutral: "bg-stone-100 text-stone-700",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-900",
  danger: "bg-red-50 text-red-800",
} as const;

export type StatusTone = keyof typeof tones;

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function toneForStatus(status: string): StatusTone {
  const value = status.toLowerCase();
  if (
    ["active", "ativo", "approved", "aprovado", "paid", "pago", "clean"].some(
      (s) => value.includes(s),
    )
  ) {
    return "success";
  }
  if (
    ["pending", "pendente", "review", "expired", "expirado"].some((s) =>
      value.includes(s),
    )
  ) {
    return "warning";
  }
  if (
    ["rejected", "rejeitado", "revoked", "revogado", "inactive", "inativo"].some(
      (s) => value.includes(s),
    )
  ) {
    return "danger";
  }
  return "neutral";
}

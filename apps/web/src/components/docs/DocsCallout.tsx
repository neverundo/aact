const tones = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  limit: "border-stone-300 bg-stone-100 text-stone-900",
} as const;

export function DocsCallout({
  tone,
  title,
  text,
}: {
  tone: keyof typeof tones;
  title: string;
  text: string;
}) {
  return (
    <aside
      className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`}
      role="note"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed opacity-95">{text}</p>
    </aside>
  );
}

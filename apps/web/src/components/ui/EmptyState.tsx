export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 border-y border-stone-200 py-8">
      <p className="text-sm font-medium text-stone-900">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-stone-500">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

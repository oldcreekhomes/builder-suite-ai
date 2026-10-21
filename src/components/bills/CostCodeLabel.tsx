/** Shows a cost code label with its "+n" multiple-code indicator pinned so truncation never hides it. */
export function CostCodeLabel({ display }: { display: string }) {
  const m = display.match(/^(.*) (\+\d+)$/);
  if (!m) return <span className="block truncate cursor-default">{display}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1 cursor-default">
      <span className="truncate">{m[1]}</span>
      <span className="shrink-0 font-medium text-muted-foreground">{m[2]}</span>
    </span>
  );
}

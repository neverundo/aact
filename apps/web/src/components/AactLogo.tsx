type AactLogoProps = {
  className?: string;
};

export function AactLogo({ className }: AactLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/aact.svg"
      alt=""
      className={["shrink-0 object-contain", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    />
  );
}

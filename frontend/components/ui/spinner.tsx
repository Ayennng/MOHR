const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function Spinner({ size = 'md' }: { size?: keyof typeof sizes }) {
  return <span className={`inline-block animate-spin rounded-full border-b-2 border-current ${sizes[size]}`} aria-hidden />;
}

/** Centred spinner for a whole page or panel that is still loading. */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-moss-600" role="status">
      <Spinner size="lg" />
      {label && <p>{label}</p>}
    </div>
  );
}

const sizes = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-8 border-[3px]' };

/** Loading ring. It spins only while something is actually loading. */
export function Spinner({ size = 'md' }: { size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-current border-r-transparent opacity-80 ${sizes[size]}`}
    />
  );
}

/** Centred spinner for a whole page or panel that is still loading. */
export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-400 animate-fade" role="status">
      <Spinner size="lg" />
      <p className="text-sm text-ink-500">{label ?? 'Loading'}</p>
    </div>
  );
}

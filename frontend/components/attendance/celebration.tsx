const DOTS = 10;
const COLORS = ['bg-mint-300', 'bg-mint-200', 'bg-amber-300', 'bg-mint-400', 'bg-sky-300'];

/**
 * A one-off burst of dots, played when `run` changes (pass a counter). Purely
 * decorative; with reduced motion the dots are simply never seen.
 */
export function Celebration({ run }: { run: number }) {
  if (!run) return null;
  return (
    <span key={run} aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      {Array.from({ length: DOTS }, (_, i) => (
        <span
          key={i}
          className={`absolute size-2.5 rounded-full opacity-0 ${COLORS[i % COLORS.length]}`}
          style={{
            ['--angle' as string]: `${(360 / DOTS) * i}deg`,
            animation: `burst var(--dur-feature) var(--ease-out-soft) ${i % 2 ? 40 : 0}ms both`,
          }}
        />
      ))}
    </span>
  );
}

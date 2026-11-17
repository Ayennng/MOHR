import React from 'react';

/** Equal-width options with a mint pill that slides to the selected one. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative grid w-full max-w-full rounded-full border border-ink-900/8 bg-white p-1 shadow-soft sm:w-fit"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-mint-200 transition-transform duration-300 ease-out-soft"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-150 ${
              selected ? 'text-mint-950' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

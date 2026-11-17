import { ReactNode } from 'react';
import { Leaf } from 'lucide-react';

// Five weeks of a team's attendance, Mon-Sun: 0 = weekend, 1 = on leave, 2 = late, 3 = in
const WEEKS = ['3332300', '3333300', '3133300', '3332300', '3333300'];
const CELL = ['bg-mint-950/5', 'bg-mint-300', 'bg-amber-300', 'bg-mint-800'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LEGEND = [
  { label: 'In', cell: CELL[3] },
  { label: 'Late', cell: CELL[2] },
  { label: 'On leave', cell: CELL[1] },
];

/** The attendance grid on the sign-in panel: each day settles in once, in a diagonal wave. */
function AttendanceGrid() {
  return (
    <div aria-hidden className="w-fit rounded-panel bg-white/55 p-5">
      <div className="mb-2 grid grid-cols-7 gap-2">
        {DAYS.map((d, i) => (
          <span key={i} className="text-center text-[11px] text-mint-900/70">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKS.flatMap((week, row) =>
          [...week].map((level, col) => (
            <span
              key={`${row}-${col}`}
              className={`size-9 rounded-lg animate-pop ${CELL[Number(level)]}`}
              style={{ animationDelay: `${200 + (row + col) * 45}ms` }}
            />
          ))
        )}
      </div>
      <div className="mt-4 flex gap-4">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-mint-900/80">
            <span className={`size-2 rounded-sm ${item.cell}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-mint-900 text-mint-200">
        <Leaf size={18} />
      </span>
      <span className="font-display text-lg font-semibold tracking-[-0.01em] text-mint-950">MoHR</span>
    </div>
  );
}

/** Sign-in and sign-up: the mint panel with the attendance grid on the left, the form on the right. */
export function AuthHero({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-mint-200 p-12 lg:flex">
        <div className="animate-rise">
          <Wordmark />
        </div>

        <div className="space-y-10">
          <AttendanceGrid />
          <div className="max-w-md animate-rise [animation-delay:150ms]">
            <h2 className="font-display text-[44px] font-medium leading-[1.05] tracking-[-0.02em] text-mint-950">{title}</h2>
            <p className="mt-4 text-lg text-mint-900/80">{subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-mint-900/70">Management of Human Resources</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-rise [animation-delay:80ms]">
          {/* On small screens the panel is hidden, so the brand sits above the form */}
          <div className="mb-10 lg:hidden">
            <Wordmark />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

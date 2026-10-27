import { ReactNode } from 'react';
import { Leaf } from 'lucide-react';

// Five weeks of a team's attendance, Mon-Sun: 0 = weekend, 1 = on leave, 2 = late, 3 = in
const WEEKS = ['3332300', '3333300', '3133300', '3332300', '3333300'];
const CELL = ['bg-mint-100/50', 'bg-mint-300', 'bg-mint-500', 'bg-mint-800'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The attendance grid on the login panel: each day lights up once, in a diagonal wave. */
function AttendanceGrid() {
  return (
    <div aria-hidden className="w-fit rounded-card bg-white/60 p-5 shadow-soft">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAYS.map((d, i) => (
          <span key={i} className="text-center text-[11px] font-semibold text-mint-800">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKS.flatMap((week, row) =>
          [...week].map((level, col) => (
            <span
              key={`${row}-${col}`}
              className={`size-9 rounded-xl animate-pop ${CELL[Number(level)]}`}
              style={{ animationDelay: `${200 + (row + col) * 45}ms` }}
            />
          ))
        )}
      </div>
    </div>
  );
}

/** Login/register screen: the mint panel with the attendance grid on the left, the form on the right. */
export function AuthHero({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-ground lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-mint-200 p-12">
        <div className="flex items-center gap-3 animate-rise">
          <div className="grid size-11 place-items-center rounded-2xl bg-mint-900 text-mint-200">
            <Leaf size={22} />
          </div>
          <p className="font-display text-xl font-bold text-mint-950">MoHR</p>
        </div>

        <div className="space-y-10">
          <AttendanceGrid />
          <div className="max-w-md animate-rise [animation-delay:150ms]">
            <h2 className="text-5xl font-bold leading-[1.05] text-mint-950">{title}</h2>
            <p className="mt-4 text-lg text-mint-800">{subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-mint-800">Leave, attendance and rooms for your whole team, in one place.</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md animate-rise [animation-delay:80ms]">
          {/* On small screens the panel is hidden, so the brand sits above the form */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-2xl bg-mint-200 text-mint-900">
              <Leaf size={20} />
            </div>
            <p className="font-display text-lg font-bold text-mint-950">MoHR</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

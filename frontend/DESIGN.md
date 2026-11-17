# MoHR design system

Steady, kind, exact. The chrome is quiet paper grey; **green is the trademark** and appears only
where it means something: the leaf mark, the page you are on, the main action, "good" status and
the Today panel. Tokens live in `app/globals.css` (`@theme`); components in `components/ui`. Use
these, never raw hex values or other palettes, except the semantic tints below.

## Colour

Two ramps. `ink-*` carries every surface, border and piece of text. `mint-*` is the brand.

| Token | Hex | Use |
|---|---|---|
| `ink-50` / `ground` | `#F6F7F6` | Page background, hover rows, table header, quiet fills |
| `ink-100` | `#EEF0EE` | Tracks, icon tiles, ghost hover |
| `ink-300` | `#C6CBC7` | Chart neutrals, decoration (never text) |
| `ink-400` | `#959C97` | Placeholders, idle icons (never body text) |
| `ink-500` | `#677069` | Muted text: hints, meta, labels (5.1:1 on white, the lightest text step) |
| `ink-600` | `#4D5550` | Secondary text (7.7:1) |
| `ink-900` | `#151916` | Primary text and titles (17.8:1) |
| `ink-900/8` | | Hairline borders; `/6` between rows, `/12` on inputs and outline buttons |
| `mint-200` | `#C2F8CB` | Active nav pill, selected tab, avatar, sign-in panel, text on forest |
| `mint-500` | `#34B85A` | The one highlighted value in a chart, progress that shows what's left |
| `mint-600` | `#23934A` | Focus ring and focused input border |
| `mint-900` | `#134429` | Primary buttons (with `mint-200` text, 9.3:1), current page number |
| `mint-950` | `#0A2817` | The Today panel and the attendance clock panel |

Where green may appear: the leaf mark, the active nav pill and selected `Segmented` option,
primary buttons, the current page in `Pagination`, the leave count in the sidebar, focus, the
`success` badge and alert, the forest panels, and one highlight per chart. Anywhere else, use ink.

Semantic tints use Tailwind's `rose`, `amber` and `sky` as a `-50`/`-100` fill with `-800` text
(see `components/ui/badge.tsx`). Destructive confirm buttons use `red-600`.

## Type

- Display: **Bricolage Grotesque** (`font-display`), weight 500. Page titles (`h1`, 30px,
  tracking -0.02em), big figures (stats, clocks) and the wordmark.
- Body: **Figtree** (`font-sans`) for everything else. Card and modal titles are Figtree 600 at
  16-18px. Body 14-15px, meta 12-13px.
- Weights 400 and 500, with 600 for card titles only. No 700 or heavier anywhere.
- Sentence case for every title, label, button and column header. No uppercase tracked labels.
- Numbers that change use `tabular-nums`.

## Shape and depth

- Cards: `rounded-card` (16px), white, `border-ink-900/8`, `shadow-soft` (a 1px neutral shadow),
  24px padding. Tables inside a card run to its edges.
- Forest panels and modals: `rounded-panel` (20px). Inputs: `rounded-xl` (12px).
- Buttons, badges, tabs, pagination and nav rows: fully round pills.
- Stats sit in one panel split by hairlines (`<Stats>` + `<StatCard>`): a label, a figure, a hint.
  No icons, no tinted tiles.
- `shadow-lift` only for things that float: modals, menus, tooltips.

## Layout

- Full-height sidebar (248px, 72px collapsed): leaf mark, navigation (36px rows, 18px icons),
  account menu at the foot. Icon centres line up 36px from the left edge in both states.
- Content capped at 1440px with 40px side padding on desktop. Pages start with `PageHeader`
  (title, description, one action on the right).

## Motion

Quick and soft, never in the way. Only `transform` and `opacity` animate.

| | Value |
|---|---|
| Durations | press/hover 150ms, enter 240-320ms, feature 600ms (count-up, bars, check-in burst) |
| Easing | `ease-out-soft` cubic-bezier(0.22,1,0.36,1) for everything |
| Entrances | `animate-rise` (10px up + fade), `animate-fade`, `animate-pop` (scale .96 + fade, no overshoot) |
| Stagger | put `stagger` on a parent: children rise 45ms apart. Every page's sections do this via `app/(app)/template.tsx` |
| Hover | a colour or surface step. Arrows may nudge 2px. Nothing lifts, tilts or scales |
| Press | buttons scale to 0.97 |
| Signature | the sliding mint pill in the sidebar and `Segmented`; stats count up (`lib/use-count-up.ts`); the attendance-grid wave on sign-in; the burst on check-in |

Forbidden: animating layout properties (the sidebar collapse is the one exception), looping
decoration, bounce or overshoot, hover lifts, gradient text, glows, blur. `prefers-reduced-motion`
turns every animation off (`globals.css`) and makes counters jump.

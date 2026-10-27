# MoHR design system

Calm and airy. Pale mint `#C2F8CB` is the signature surface; a deep forest-green ink carries
text and primary actions. Tokens live in `app/globals.css` (`@theme`); components in
`components/ui`. Use these, never raw hex values or other palettes, except the semantic tints below.

## Colour

| Token | Hex | Use |
|---|---|---|
| `mint-50` | `#F3FEF5` | Hover wash, table header |
| `mint-100` | `#E2FDE7` | Chips, quiet fills, tracks |
| `mint-200` | `#C2F8CB` | **Brand.** Page banners, active nav pill, secondary buttons, text on ink |
| `mint-300`-`500` | | Bars, dots, decoration (never text) |
| `mint-600` | `#23934A` | Focus ring, icons, boundaries (3.9:1 on white, not for body text) |
| `mint-700` | `#1C743D` | Muted text, hints (5.8:1 on white, the lightest text step) |
| `mint-800` | `#185B33` | Secondary text on mint |
| `mint-900` | `#134429` | Body ink, primary buttons (11.1:1 on white; `mint-200` on it is 9.3:1) |
| `mint-950` | `#0A2817` | Headings, the attendance clock panel |
| `ground` | `#F6FBF7` | Page background |

Semantic tints use Tailwind's `rose`, `amber`, `sky` and `stone` as `-100` fill + `-800` text
(see `components/ui/badge.tsx`). Destructive confirm buttons use `red-600`.

## Type

- Display: **Bricolage Grotesque** (`font-display`, all `h1`-`h3`), bold, tracking -0.02em.
- Body: **Figtree** (`font-sans`). Numbers that change use `tabular-nums`.
- Both are self-hosted by `next/font` (no browser request to Google).

## Shape and depth

- Cards: `rounded-card` (20px), white, `border-mint-900/8`, `shadow-soft`; `shadow-lift` on hover.
- Buttons, badges, tabs, pagination: fully round pills. Inputs: `rounded-xl`.

## Motion

Quick and soft, never in the way. Only `transform` and `opacity` animate.

| | Value |
|---|---|
| Durations | press 120ms, hover 200ms, enter 320ms, feature 600ms (count-up, bars, check-in burst) |
| Easings | `ease-out-soft` cubic-bezier(0.22,1,0.36,1); `ease-in-out-soft`; `ease-pop` (overshoot, only for pops) |
| Entrances | `animate-rise` (10px up + fade), `animate-fade`, `animate-pop` (scale .94 + fade) |
| Stagger | put `stagger` on a parent: children rise 45ms apart. Every page's sections do this via `app/(app)/template.tsx` |
| Hover | cards lift 4px; icon chips tilt; arrows nudge 4px right |
| Press | buttons scale to 0.97 |
| Signature | sliding mint pill in the sidebar and `Segmented`; stats count up (`lib/use-count-up.ts`); attendance-grid wave on login; burst on check-in |

Forbidden: animating layout properties (the sidebar collapse is the one exception), looping
decoration, bounce on anything but small pops, gradient text, frosted-glass panels (a modal
backdrop is the only blur). `prefers-reduced-motion` turns every animation off (`globals.css`)
and makes counters jump.

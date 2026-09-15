---
name: Torneo Pro Athletic Intelligence
colors:
  # Canvas & surfaces (slate neutrals)
  canvas: '#f8fafc'
  surface: '#ffffff'
  surface-sunken: '#f1f5f9'
  surface-hover: '#f8fafc'
  border: '#e2e8f0'
  border-strong: '#cbd5e1'
  # Text
  text-heading: '#0f172a'
  text-body: '#334155'
  text-muted: '#64748b'
  # Brand accents
  primary: '#0052cc'
  primary-hover: '#0043a8'
  on-primary: '#ffffff'
  primary-soft: '#eff6ff'
  primary-border: '#bfdbfe'
  secondary: '#0ea5e9'
  secondary-soft: '#e0f2fe'
  tertiary: '#10b981'
  tertiary-soft: '#ecfdf5'
  tertiary-border: '#a7f3d0'
  on-tertiary: '#065f46'
  danger: '#ef4444'
  danger-soft: '#fef2f2'
  caution: '#f59e0b'
  caution-soft: '#fffbeb'
  # Dark mode
  dark-canvas: '#0f172a'
  dark-surface: '#1e293b'
  dark-border: 'rgba(148, 163, 184, 0.2)'
  dark-text: '#e2e8f0'
  dark-text-muted: '#94a3b8'
  dark-primary: '#60a5fa'
  dark-secondary: '#38bdf8'
  dark-tertiary: '#34d399'
  dark-danger: '#f87171'
  dark-caution: '#fbbf24'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-score:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.03em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

> **Nota de implementación (MUI)**: los tokens `colors` de arriba son la fuente de verdad y están
> aplicados en `frontend/src/theme.js`. Mapeo: `primary` → `palette.primary.main`, `primary-hover` →
> `palette.primary.dark`, `secondary/info` → `palette.secondary/info.main`, `tertiary` →
> `palette.success.main`, `danger` → `palette.error.main`, `caution` → `palette.warning.main`,
> `canvas` → `palette.background.default`, `surface` → `palette.background.paper`,
> `border` → `palette.divider`, `text-heading/body` → `palette.text.primary/secondary`.
> Los tokens `dark-*` corresponden a `darkTheme`.

This design system channels the precision, momentum, and operational clarity demanded by top-tier football tournament coordinators and club directors. The personality fuses modern athletic performance with enterprise-grade SaaS utility: authoritative yet dynamic, high-cadence yet uncluttered.

The interface adheres to a **Modern Functional Sport** aesthetic—characterized by crisp, pristine neutral slate surfaces, razor-sharp architectural layout lines, tactile card elevation, and purposeful micro-interactions that mirror live sport telecasts. The visual hierarchy reduces cognitive friction during tense live match operations, fixture rescheduling, and bracket drafting, replacing chaotic sports management spreadsheets with clear, high-contrast tournament command centers.

## Colors

The color palette centers on intense athletic blue hues anchored by slate-tinted structural neutrals:

- **Primary (`#0052cc` - Cobalt Stadium)**: Used for primary calls to action, active navigation states, verified tournament badges, and high-priority states.
- **Secondary (`#0ea5e9` - Electric Pitch Azure)**: Drives real-time live telemetry, active score counters, fixture highlights, and secondary interactive nodes.
- **Tertiary (`#10b981` - Pitch Green)**: Applied to on-pitch status indicators (e.g., Live Match, Extra Time, Confirmed Results, Pitch Cleared).
- **Neutral (`#64748b` - Slate Gray)**: Provides a nuanced spectrum of backgrounds and borders:
  - Surface Canvas: `#f8fafc` (Ultra-light slate field)
  - Surface Raised / Cards: `#ffffff` (Crisp stadium white)
  - Surface Sunken / Field Stats: `#f1f5f9`
  - Subtle Dividing Lines: `#e2e8f0`
  - Body Text: `#334155`
  - Headings / Structural Typography: `#0f172a`
  - Live Alert / Red Card Accent: `#ef4444`
  - Caution / Yellow Card Accent: `#f59e0b`

## Typography

The design system relies on a single, systematic typographic powerhouse: **Inter**. By utilizing weight variations, tight negative letter tracking on headings, and tubular tabular numbers for live game clocks and scores, the typography matches the precision of high-end sports broadcast graphics.

- **Numerics**: When rendering game clocks, scores, standings points, or goal differentials, activate OpenType tabular figures (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during live match updates.
- **Match Labels & Subtitles**: Render match state tags and division indicators in uppercase tracking using `label-sm` to maintain high legibility at micro scales.

## Layout & Spacing

The system uses a fluid 12-column grid system bounded at an ultra-wide max-width of `1600px` for multi-pitch schedule command centers. It scales across three core targets:

- **Desktop & Command Displays (>1024px)**: 12 columns, 32px (`margin`) outer boundaries, 20px (`gutter`) column spacing. Accommodates dual sidebars (tournament tree/divisions navigation on the left, live fixture operations sheet on the right).
- **Tablet / Pitch-Side (768px - 1023px)**: 8 columns, 24px margins, 16px gutters. Sidebars fold into an off-canvas drawer or top horizontal tab matrix.
- **Mobile Handheld (<767px)**: 4 columns, 16px (`margin-mobile`), 12px (`gutter-mobile`). Fixtures collapse from a multi-column horizontal split into vertical scoreboard cards with stacked team rows.

## Elevation & Depth

Visual depth is achieved through crisp, light-absorbing borders paired with ambient diffused cobalt-slate dropshadows. High-density data tables and fixture grids remain flush, whereas live cards and modals layer gently above the canvas.

- **Level 0 (Field Canvas)**: `#f8fafc` flat background with hairline internal borders (`#e2e8f0`).
- **Level 1 (Surface Cards & Standings)**: Pure white `#ffffff`, enclosed with a 1px border (`#e2e8f0`) and an ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Active/Hover Scoreboard Card, Interactive Popover)**: `#ffffff` surface, 1px border (`#cbd5e1`), elevated shadow tinted with subtle stadium blue: `0 8px 20px -4px rgba(0, 82, 204, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals, Pitch Drag Previews, Slide-Over Lineups)**: Elevated shadow `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)` with an absolute border rim (`rgba(226, 232, 240, 0.8)`).

## Shapes

The design system pairs structural, moderately-rounded components for data containers with pill-shaped accents for athletic identifiers:

- **Containers & Match Cards**: Defined by 8px radius (`0.5rem` base, with large panels utilizing 12px `rounded-lg`), establishing a stable, tech-forward frame.
- **Status Badges, Category Chips, and Match Timers**: Always fully pill-shaped (`rounded-full`, 9999px) to communicate athletic dynamism and high visual priority against rectangular data grids.
- **Table Cells and Interactive Rows**: Chamfered 6px internal focus outlines with crisp corners.

## Components

### Buttons
- **Primary**: Deep cobalt background (`#0052cc`), pure white label, `0.5rem` border radius, subtle inner top bevel (`inset 0 1px 0 rgba(255,255,255,0.16)`). Hover state darkens to `#0043a8` with a subtle elevation shift.
- **Secondary / Pitch Action**: Ghost style with white background, 1px border `#e2e8f0`, text `#334155`. Hover transitions to `#f8fafc` surface with text `#0052cc`.
- **Live Action / Danger**: Pitch Red (`#ef4444`) fill for red cards, match forfeits, or urgent scheduling conflicts.

### Chips & Badges (Pills)
- **Live Match Chip**: Background `#ecfdf5`, text `#065f46`, border `1px solid #a7f3d0`. Preceded by a 6px pulsing green dot (`#10b981`).
- **Upcoming / Time Chip**: Background `#f1f5f9`, text `#475569`, border `1px solid #e2e8f0`, formatted with `label-sm`.
- **Tournament Stage Chip**: Background `#eff6ff`, text `#1d4ed8`, border `1px solid #bfdbfe`.

### Scoreboard Match Cards
- Compact composite card featuring a two-row fixture structure:
  - Header band: Pitch location, kickoff time, and stage badge in `label-sm`.
  - Body: Left-aligned club crest (24x24px), club name in `body-md` bold, and right-aligned score cell in `title-score` with tabular figures.
  - Winner accent: Bold text with an active azure `#0ea5e9` vertical marker line along the left border.
  - Footer toolbar: Quick-action referee triggers (Add Goal, Card, Conclude Half).

### Inputs & Selectors
- Background `#ffffff`, border 1px `#cbd5e1`, 8px radius. Active focus state removes default outline and introduces a 2px outer ring in `#0ea5e9` with a `#0052cc` border edge.
- Search inputs include built-in shortcut indicators (e.g., `⌘K`) in muted slate typography.

### Checkboxes & Radio Buttons
- 4px radius for checkboxes, full circle for radios. Default border 1.5px `#94a3b8`. Checked state transitions instantly to `#0052cc` fill with a crisp white tick or radial dot.

### Lists & Tournament Brackets
- Bracket connecting paths utilize 2px `#cbd5e1` stroke lines that shift to `#0052cc` upon hovering over a qualified team path.
- Standings tables employ alternating subtle rows, sticky header bars with uppercase `label-sm` descriptors, and visual form guides (W/D/L circular dots).
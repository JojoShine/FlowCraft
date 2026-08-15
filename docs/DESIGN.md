# Design System: TaskHub

## 1. Visual Theme & Atmosphere

A restrained, precision-engineered interface for serious builders. The atmosphere is **architectural** — like a drafting studio where every line has purpose. Density sits at 6 (cockpit-adjacent, information-rich but never cluttered). Variance at 4 (structured asymmetry, not chaotic). Motion at 5 (fluid CSS transitions, no cinematic choreography).

The monochrome palette is not a limitation — it is the statement. Hierarchy is communicated through **weight, spacing, and tonal contrast**, not color. The interface feels like machined aluminum: cool, precise, inevitable.

No decorative gradients. No colored badges. No rainbow status indicators. Depth through shadow and elevation only.

---

## 2. Color Palette & Roles

### Surfaces

| Token | Hex | Role |
|---|---|---|
| Canvas | `#FAFAFA` | Page background, negative space |
| Surface | `#FFFFFF` | Cards, panels, modals, elevated containers |
| Surface Raised | `#F4F4F5` | Hover states, active sidebar items, code blocks |
| Surface Sunken | `#F0F0F2` | Inset areas, disabled states, skeleton loaders |

### Borders & Dividers

| Token | Value | Role |
|---|---|---|
| Border Subtle | `rgba(0, 0, 0, 0.06)` | Card borders, table dividers, structural hairlines |
| Border Default | `rgba(0, 0, 0, 0.10)` | Input borders, focus rings, active boundaries |
| Border Strong | `rgba(0, 0, 0, 0.16)` | Emphasized separators, dragged element outlines |

### Text

| Token | Hex | Role |
|---|---|---|
| Ink Primary | `#18181B` | Headings, body text, primary labels — Zinc-950 |
| Ink Secondary | `#52525B` | Descriptions, metadata, timestamps — Zinc-600 |
| Ink Tertiary | `#A1A1AA` | Placeholders, disabled text, hints — Zinc-400 |
| Ink Inverse | `#FAFAFA` | Text on dark surfaces (dark mode reserved) |

### Semantic (Monochrome)

| Token | Hex | Role |
|---|---|---|
| Success | `#27272A` | Completion markers, done states — Zinc-800 |
| Warning | `#71717A` | Attention items, pending states — Zinc-500 |
| Error | `#18181B` | Error text, destructive actions — Zinc-950, bold weight |

**Constraint:** Zero chromatic color in the entire interface. No blue links, no green success badges, no red error backgrounds. All semantic meaning is carried by **weight, opacity, and position**, never hue.

---

## 3. Typography Rules

### Font Stack

| Role | Font | Fallback |
|---|---|---|
| Display / Headlines | **Geist** | system-ui, -apple-system, sans-serif |
| Body / UI | **Geist** | system-ui, -apple-system, sans-serif |
| Mono / Code / Data | **Geist Mono** | ui-monospace, SF Mono, monospace |

### Scale

| Level | Size | Weight | Tracking | Leading | Usage |
|---|---|---|---|---|---|
| Display | 2.25rem (36px) | 600 | -0.03em | 1.1 | Page titles, hero numbers |
| H1 | 1.5rem (24px) | 600 | -0.02em | 1.2 | Section headers |
| H2 | 1.25rem (20px) | 500 | -0.01em | 1.3 | Card titles, panel headers |
| H3 | 1.125rem (18px) | 500 | 0 | 1.4 | Sub-sections |
| Body | 0.875rem (14px) | 400 | 0 | 1.6 | Default text, descriptions |
| Small | 0.75rem (12px) | 400 | 0.01em | 1.5 | Metadata, labels, timestamps |
| Mono | 0.8125rem (13px) | 400 | 0 | 1.5 | Code, IDs, counts, data values |

### Rules

- Body text max-width: **65ch**. Never let descriptions run full-bleed.
- All numbers in data contexts (counts, IDs, dates, percentages) use **Geist Mono**.
- No font size below 12px. No font weight below 400 or above 700.
- Headlines achieve hierarchy through **weight contrast and tracking**, not excessive size.
- **Banned:** Inter, system-ui as primary font, generic serif fonts, font-smoothing overrides.

---

## 4. Spacing & Layout

### Spacing Scale

Base unit: **4px**. All spacing uses multiples of 4.

| Token | Value | Usage |
|---|---|---|
| xs | 4px (0.25rem) | Inline icon gaps, tight padding |
| sm | 8px (0.5rem) | Form field gaps, tag padding |
| md | 12px (0.75rem) | Card internal padding (compact) |
| lg | 16px (1rem) | Card padding, list item spacing |
| xl | 24px (1.5rem) | Section gaps, panel padding |
| 2xl | 32px (2rem) | Page section separation |
| 3xl | 48px (3rem) | Major section breaks |

### Layout Architecture

```
┌──────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content Area     │
│                         │  ┌──────────────────┐  │
│  Navigation             │  │  Content Header   │  │
│  - Workbench            │  ├──────────────────┤  │
│  - Projects             │  │                   │  │
│  - Templates            │  │  Body             │  │
│  - AI Assistant         │  │  (max-width:      │  │
│  - Reports              │  │   1200px)         │  │
│  - Settings             │  │                   │  │
│                         │  │                   │  │
│  ─────────────────      │  │                   │  │
│  Project Switcher       │  └──────────────────┘  │
│                         │                        │
│                         │  ┌──────────────────┐  │
│                         │  │  AI Side Panel    │  │
│                         │  │  (360px, toggle)  │  │
│                         │  └──────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Rules

- Sidebar: **240px** fixed width, collapsible to **64px** icon-only mode.
- AI Panel: **360px** fixed width, right side, toggleable.
- Content area: **max-width 1200px**, centered with auto margins.
- All multi-column layouts use **CSS Grid**, never flexbox percentage hacks.
- Cards in grids: minimum **280px** column width, auto-fill.
- No overlapping elements. Every element occupies its own spatial zone.
- Full-height containers: `min-h-[100dvh]`, never `h-screen`.

---

## 5. Component Stylings

### Buttons

| Variant | Style |
|---|---|
| Primary | `#18181B` fill, `#FAFAFA` text, `border-radius: 8px`, `height: 36px`. Active: `translateY(1px)` + darken 5%. |
| Secondary | `#FFFFFF` fill, `#18181B` text, `1px border rgba(0,0,0,0.10)`. Active: background `#F4F4F5`. |
| Ghost | Transparent, `#52525B` text. Active: background `#F4F4F5`. |
| Danger | Ghost variant, `#18181B` text with `font-weight: 600`. No red color. |

- No outer glow. No box-shadow on rest state. Hover: subtle background shift only.
- Minimum tap target: **44px** height for touch contexts.
- Disabled: `opacity: 0.4`, no pointer events.

### Cards

- `border-radius: 12px`
- `border: 1px solid rgba(0, 0, 0, 0.06)`
- `background: #FFFFFF`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)` — tinted to canvas hue
- Hover (interactive cards): shadow deepens to `0 4px 12px rgba(0, 0, 0, 0.06)`
- Internal padding: **16px** (compact) or **24px** (featured)
- In high-density views (kanban, tables): replace cards with **border-top dividers** only.

### Inputs

- `height: 36px`, `border-radius: 8px`
- `border: 1px solid rgba(0, 0, 0, 0.10)`
- Focus: `border-color: #18181B`, `box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.08)`
- Label above input, **12px** Small text, `#52525B`
- Error: text below input in `#18181B` bold, no red background
- Placeholder: `#A1A1AA`
- No floating labels.

### Kanban Board

- Column width: **280px** fixed
- Column header: H3 + count badge (Mono, `#71717A`)
- Card: Card styling with **12px** padding
- Drag state: `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12)`, `opacity: 0.9`
- Drop placeholder: `border: 2px dashed rgba(0, 0, 0, 0.10)`, `background: #F4F4F5`

### Sidebar Navigation

- Item height: **36px**, `border-radius: 8px`
- Active item: `background: #F4F4F5`, `font-weight: 500`, `color: #18181B`
- Inactive: `color: #52525B`, hover `background: #F4F4F5`
- Icon + label layout, **8px** gap
- Section dividers: `1px solid rgba(0, 0, 0, 0.06)` with **24px** vertical margin

### Tables

- Row height: **44px**
- Header: `font-weight: 500`, `color: #52525B`, `font-size: 12px`, uppercase tracking `0.05em`
- Cell: `border-bottom: 1px solid rgba(0, 0, 0, 0.06)`
- Hover row: `background: #FAFAFA`
- Numbers: Geist Mono, right-aligned

### Loading States

- **Skeleton loaders** matching exact layout dimensions
- Shimmer: linear-gradient sweep `#F0F0F2` → `#F4F4F5` → `#F0F0F2`, 1.5s infinite
- No circular spinners. No "Loading..." text.

### Empty States

- Centered composition: 48px icon (outline, `#A1A1AA`) + H2 + Body description + Primary CTA
- Never just "No data" text. Always guide toward the next action.

---

## 6. Motion & Interaction

### Transition Defaults

| Property | Duration | Easing |
|---|---|---|
| Background / Color | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Transform / Position | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Opacity | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Shadow | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` |

### Interaction Feedback

- Button active: `translateY(1px)`, 50ms
- Card hover: shadow transition, 200ms
- Sidebar item: background transition, 100ms
- Panel slide (AI panel): `translateX` + `opacity`, 250ms spring

### Staggered Reveals

- List items: cascade delay **30ms** per item, `opacity` + `translateY(8px)` → origin
- Page sections: cascade delay **80ms**, fade-in only
- Never mount lists instantly. Always orchestrate entry.

### Performance

- Animate only `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`.
- Skeleton shimmer: `translateX` on pseudo-element, GPU-composited.
- Isolate heavy animations in their own compositing layer (`will-change: transform`).

---

## 7. Iconography

- Style: **1.5px stroke**, rounded caps, 20x20 default size
- Color: inherits text color (`currentColor`)
- No filled icons unless indicating active/toggled state
- Consistent optical sizing — do not scale icons below 16px or above 24px
- Recommended set: **Lucide Icons** (monochrome, consistent stroke weight)

---

## 8. Anti-Patterns (Banned)

| Rule | Reason |
|---|---|
| No chromatic color anywhere | The monochrome constraint is the identity |
| No `#000000` pure black | Use `#18181B` (Zinc-950) for maximum depth |
| No Inter font | Use Geist for distinctive character |
| No emoji in UI | Degrades visual precision |
| No neon / outer glow shadows | Depth through subtle elevation only |
| No gradient text | No decorative color transitions on typography |
| No rounded avatar badges with colored backgrounds | Use initials on `#F4F4F5` or monochrome photos |
| No 3-column equal card layouts | Use asymmetric grids or 2-column zig-zag |
| No colored status badges | Use weight, opacity, or mono text labels |
| No floating labels on inputs | Label above, always |
| No circular spinners | Skeleton loaders only |
| No `h-screen` | Use `min-h-[100dvh]` |
| No flexbox percentage width hacks | CSS Grid for all structural layouts |
| No overlapping elements | Clean spatial separation |
| No AI copywriting clichés | "Elevate", "Seamless", "Unleash", "Next-Gen" are banned |
| No decorative illustrations | If visual is needed, use data or architecture diagrams |

---

## 9. Dark Mode (Reserved)

Dark mode is not implemented in Phase 1 but the token architecture supports it:

| Light Token | Dark Override |
|---|---|
| Canvas `#FAFAFA` | `#09090B` |
| Surface `#FFFFFF` | `#18181B` |
| Surface Raised `#F4F4F5` | `#27272A` |
| Ink Primary `#18181B` | `#FAFAFA` |
| Ink Secondary `#52525B` | `#A1A1AA` |
| Border Subtle | `rgba(255, 255, 255, 0.06)` |
| Border Default | `rgba(255, 255, 255, 0.12)` |

All tokens are CSS custom properties (`--color-canvas`, `--color-ink-primary`, etc.) to enable runtime theme switching.

# Design — Sprtan

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

Source: DNA studied from two user reference screenshots (a dark live-run screen
and a light home screen of a running app), with the Spartan crimson kept as the
brand accent. The lambda logomark and the SPRTAN wordmark are the only Spartan
elements carried over; Cinzel, Greek eyebrows and "Arena" were retired.

## Genre
playful (consumer sport app: soft surfaces, big friendly numbers, one loud accent)

## Macrostructure family
This is an app, not a marketing site. One family for every route:

- App pages: **Stacked Cards** — two-tone heading, then a stack (mobile) or a
  2-column grid (desktop) of rounded cards. One hero card per page at most.
- Content pages (Privasi): the same heading, then one prose card, max 720px.

## Navigation
- Four destinations only: Beranda, Catat, Lari, Progres (bottom tab bar on
  mobile, side rail on desktop). Do not add a fifth; nest new pages under one.
- Rekor pribadi = second tab inside Progres (`ProgressTabs`).
- Daftar gerakan = reached from Catat ("Kelola daftar gerakan") and Pengaturan.
- Pengaturan = gear icon (top-right on mobile, rail bottom on desktop), next to the theme toggle.
- Every non-tab page gets `PageHeader back={{ to, label }}`.

## Surfaces
- One theme for every page, chosen by the user: light, dark, or follow the
  device (default). `ThemeProvider` sets `data-theme` on `<html>`; a small
  pre-paint script in `index.html` applies it before first render.
- Quick toggle: sun/moon button top-right (mobile) or in the rail (desktop).
  Full choice (Terang / Gelap / Ikuti HP) in Pengaturan.
- `tokens.css` re-maps the same token names under `[data-theme='dark']`, so
  components never need their own dark variant. Filled "selected" pills use
  `--color-contrast` / `--color-contrast-ink`, never raw ink/paper. OSM tiles
  are inverted with a CSS filter in dark mode.

## Theme (light)
- `--color-paper`    oklch(96.5% 0.004 80)  page
- `--color-paper-2`  oklch(93.5% 0.006 80)  quiet cards, segmented tracks
- `--color-surface`  oklch(99.5% 0.002 80)  cards
- `--color-line`     oklch(88% 0.006 80)
- `--color-ink`      oklch(19% 0.01 60)
- `--color-ink-ghost` oklch(62% 0.006 70)   grey first line of headings
- `--color-accent`   oklch(54% 0.2 25)      Spartan crimson (hero card, primary CTA, route)
- `--color-lime`     oklch(88% 0.19 125)    goals, PR badge, "live" dot, active rail icon
- `--color-indigo`   oklch(52% 0.19 275)    pace pill, focus ring
- `--color-focus`    = indigo (light) / lime (dark)

Dark surface: paper oklch(17% 0.014 265), surface oklch(22% 0.016 265),
ink oklch(97% 0.005 265), accent oklch(58% 0.21 25). Full list in `src/styles/tokens.css`.

Accent budget: one crimson hero card per page, plus the primary CTA. Lime and
indigo are semantic (goal / pace), never decorative.

## Typography
- Display: **Bricolage Grotesque** 700–800, `letter-spacing: -0.025em` to `-0.045em`, roman only.
- Body: **Geist** 400–600.
- No mono face. Data numbers use `.num` (tabular numerals); big numbers use `.num-display`.
- Two-tone heading: `<PageHeader lead="Riwayat" title="Lari" />` renders the lead
  in `--color-ink-ghost` and the title in `--color-ink`, stacked.
- Scale anchors: `--text-mega` (live distance), `--text-hero` (hero numbers),
  `--text-display` (page titles).
- Labels: small uppercase Geist 600 with 0.08–0.1em tracking. No eyebrows above headings.

## Spacing
4-point named scale in `tokens.css` (`--space-2xs` … `--space-3xl`). Pages use
named tokens, never raw values.

## Radius & depth
- Cards 24px (`--radius-lg`), inputs and large CTA 14px (`--radius-md`), buttons/pills 999px.
- Soft two-layer shadow (`--shadow-card`), hover lift `translateY(-2px)` + `--shadow-lift`.
- Quiet cards (`paper-2`, no border, no shadow) for forms and secondary blocks.

## Motion
- Easings: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1), `--ease-in`, `--ease-in-out`.
- Only `transform`, `opacity`, colours and the ring's `stroke-dasharray`.
- No reveal-on-scroll. Reduced motion collapses everything (global rule).

## Microinteractions stance
- Silent success. New PR flashes the set row lime once (`.forge`).
- Destructive actions keep the native confirm dialog (existing behaviour).
- `:focus-visible` ring shows instantly, never animated.

## CTA voice
- Primary: crimson fill, white text, pill. `lg` size = 60px tall, 14px radius,
  Bricolage 700, used for the one main action (Catat Latihan, Mulai/Selesai Lari).
- Secondary: `ghost` (surface fill + hairline) or `ink` (dark fill).
- On mobile the main action is `position: sticky` above the tab bar.
- Router links styled as buttons use `buttonClass()`; never nest `<button>` in `<a>`.

## Iconography
Hand-drawn 24px stroke icons in `src/components/ui/Icon.tsx`. No emoji as icons.

## What pages MUST share
- Lambda badge + SPRTAN wordmark in Bricolage 800.
- Two-tone `PageHeader`.
- Crimson as the only loud colour; lime/indigo semantic only.
- Bricolage + Geist.
- Button shapes and the sticky mobile CTA pattern.

## What pages MAY differ on
- Hero card content (volume, total distance, run readout).
- Grid composition (dashboard areas, run track 2-column on desktop).

## Honest data
Only show numbers the app actually records. No heart rate, calories or social
"crew" cards: Sprtan is offline and tracks none of those.

## Exports

### tokens.css
See `src/styles/tokens.css` (source of truth, including the dark surface block).

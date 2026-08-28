---
name: GoneViral.in
description: A premium editorial signal board for India's sponsored internet leaderboard.
colors:
  signal: "#ff5a36"
  signal-hover: "#ea4322"
  signal-soft: "#ffe0d7"
  canvas: "#f4f1ea"
  surface: "#fffcf7"
  surface-raised: "#ffffff"
  surface-muted: "#ebe6dc"
  ink: "#14120f"
  ink-soft: "#5f5a52"
  ink-faint: "#8c867c"
  line: "#d8d1c5"
  line-strong: "#a9a094"
  success: "#1d6f4a"
  success-soft: "#dceee4"
  warning: "#9a5a00"
  warning-soft: "#f7e9ca"
  danger: "#b42318"
  danger-soft: "#fee4e2"
  gold: "#a87518"
  gold-soft: "#f4e8c9"
  focus: "#2855d9"
typography:
  headline:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 760
    lineHeight: 1.05
    letterSpacing: "-0.045em"
  title:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 720
    lineHeight: 1.2
  body:
    fontFamily: "Geist Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.08em"
rounded:
  compact: "6px"
  control: "10px"
  panel: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
    textColor: "{colors.surface-raised}"
  disclosure:
    backgroundColor: "{colors.signal-soft}"
    textColor: "{colors.ink}"
    padding: "16px 20px"
  board-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    padding: "14px 18px"
---

# Design System: GoneViral.in

## Overview

**Creative North Star: "The Editorial Signal Board"**

GoneViral feels like an independent magazine front page crossed with an airport departures board and a finely printed market index. The interface is warm, tactile, and information-dense. Money and movement are the visual signals; typography, whitespace, and rules provide trust.

The system is restrained and light because it is read in ordinary daylight by people scanning exact public positions. It rejects casino spectacle, crypto-terminal darkness, fake auction pressure, generic SaaS polish, and decorative components that hide the board.

**Key Characteristics:**

- Warm stone canvas with sharp ink and one scarce signal accent.
- Board-first density with exact tabular amounts.
- Editorial rules and flat tonal layers before cards or shadows.
- Honest empty, stale, estimate, disclosure, and legal states.
- Familiar navigation and controls with visible keyboard focus.

## Colors

The palette combines warm paper neutrals with a single orange-red signal that marks action and selection.

### Primary

- **Signal Vermilion:** Primary sponsorship actions, active controls, and the wordmark suffix. Its rarity creates urgency without fake live theatre.
- **Signal Wash:** Sponsored disclosures and selected surfaces that need to remain calm and readable.

### Secondary

- **Restrained Rank Gold:** A quiet marker for #1 only. It never becomes a general premium theme or substitutes for readable rank text.
- **Confirmed Green:** Confirmed or successful system state only. It never means a better rank.
- **Verification Amber:** Pending verification and caution, never payment success.
- **Action Red:** Errors and destructive states, never downward rank movement.

### Neutral

- **Warm Stone Canvas:** The continuous page background.
- **Printed Paper Surface:** Board rows and content surfaces.
- **Hard Ink:** Primary text, borders requiring emphasis, and exact numeric signals.
- **Soft and Faint Ink:** Supporting copy and quiet metadata while maintaining WCAG 2.2 AA contrast.
- **Rule Lines:** Structure tables, tabs, and sections without turning every area into a card.

### Named Rules

**The One Signal Rule.** Signal orange-red is reserved for primary actions and active state. Inactive data remains neutral.

**The Gold Restraint Rule.** Gold may mark #1 with a small rule or wash. Crowns, podiums, and gold-filled themes are forbidden.

## Typography

**Display Font:** Geist Sans (with Arial and sans-serif fallbacks)

**Body Font:** Geist Sans (with Arial and sans-serif fallbacks)

**Label/Mono Font:** Geist Mono (with monospace fallback)

**Character:** Geist Sans keeps identity and copy direct; Geist Mono makes money, ranks, dates, and system labels feel exact and auditable.

### Hierarchy

- **Headline** (760, 2.5rem desktop maximum on board surfaces, 1.05): Compact mastheads and route titles only.
- **Title** (720, 1.25rem, 1.2): Listing names, board section titles, and important empty-state lines.
- **Body** (400, 1rem, 1.5): Explanations and legal placeholder copy, with prose capped near 70ch.
- **Label** (700, 0.75rem, 0.08em letter spacing): Uppercase eyebrows, timestamps, category metadata, and disclosure labels.
- **Money and rank** (Geist Mono, tabular numerals): Exact Indian-grouped amounts and derived positions.

### Named Rules

**The Exact Figure Rule.** Primary transactional amounts are always complete, Indian-grouped values. Compact lakh notation is secondary only.

## Elevation

The system is flat by default. Tonal surface changes, one-pixel rules, spacing, and type weight create hierarchy. Small ambient shadows appear only where a control or exceptional panel genuinely lifts from the page.

### Shadow Vocabulary

- **Control Lift** (`0 1px 2px rgb(20 18 15 / 0.08)`): Compact interactive controls only.
- **Exceptional Panel Lift** (`0 10px 30px rgb(20 18 15 / 0.1)`): Error or temporary overlay surfaces, never ordinary board rows.

### Named Rules

**The Flat Board Rule.** Leaderboard rows are separated by rules and tone, not floating cards or glass.

## Components

### Buttons

- **Shape:** Gently compact corners (10px) and a minimum 44px target.
- **Primary:** Signal vermilion with hard ink, a strong border, and compact 10px by 16px padding.
- **Hover / Focus:** Signal deepens on hover. Focus uses a 3px blue outline with a 3px offset. Motion is 120 to 220ms and disappears under reduced-motion preferences.
- **Secondary / Ghost:** Paper or transparent surface with a one-pixel rule. Active route links use underlines, never glowing pills.

### Chips

- **Style:** Category and board filters use underlined tabs or restrained bordered controls, not decorative pills.
- **State:** Selected state uses ink weight and a signal rule. Meaning never depends on colour alone.

### Cards / Containers

- **Corner Style:** Board rows stay nearly square (0 to 8px). Exceptional panels may use 12px.
- **Background:** Printed paper or muted stone surfaces.
- **Shadow Strategy:** Flat by default, following the elevation rules above.
- **Border:** One-pixel warm rule lines.
- **Internal Padding:** Varies between 12px and 24px to create editorial rhythm.

### Inputs / Fields

- **Style:** Paper surface, one-pixel strong rule, 10px corners, and at least 44px height.
- **Focus:** Explicit blue outline with sufficient offset.
- **Error / Disabled:** Error red with text explanation; disabled state remains legible and never relies on opacity alone.

### Navigation

- **Style:** Compact wordmark, conventional top navigation, underline or ink active state, opaque sticky surface, and a bordered mobile drawer trigger.

### Leaderboard

Desktop uses a semantic dense table with 72 to 88px rows. Mobile becomes a semantic list of stacked rows without horizontal page scroll. Rank, identity, exact total, and current takeover estimate remain visually ordered and available without hover.

## Do's and Don'ts

### Do:

- **Do** begin the public board in the first desktop viewport.
- **Do** keep exact money and rank readable without colour.
- **Do** use the mandatory sponsored-ranking disclosure adjacent to every board.
- **Do** show real empty and low-population states without inventing absent ranks.
- **Do** preserve familiar keyboard, tab, link, table, and list semantics.
- **Do** support 320px layouts, 200% text zoom, 44px targets, and reduced motion.

### Don't:

- **Don't** resemble a casino, betting product, trading terminal, crypto product, purple or blue gradient SaaS dashboard, or neon dark-mode interface.
- **Don't** use glassmorphism, gradient text, decorative side-stripe borders, or a hero-metric template.
- **Don't** create identical card grids or wrap every board element in a card.
- **Don't** use fake live dots, fake viewers, fabricated urgency, countdown pressure, excessive crowns, flames, confetti, or tricolour branding.
- **Don't** copy Outbid or Million Dollar Homepage layouts.
- **Don't** push the board below a giant hero section or hide essential action behind hover.
- **Don't** use owner, provider, payment, report, ledger-source, or admin data in a public component or cache.

# FlatRun UI Agent Guide

Vue 3 (`<script setup>`) + Vite + Pinia. Icons via lucide (through the `Icon` base component). Run `npm run type-check`, `npm run lint`, `npm run format:check`, and `npm run test:run` before proposing changes.

## Component reuse (read before adding UI)

Reuse first. Building a one-off input, select, button, card, or modal is the most common source of visual and dark-mode drift here. Before writing markup:

1. Check `src/components/base/` for a primitive that already does it.
2. If one exists, use it. Do not hand-roll a styled `<input>`, `<select>`, `<button>`, or card surface.
3. If none fits, extend `src/components/base/` with a new primitive (built on the design tokens below) and use that, rather than styling inline in a view.

### Base primitives (`src/components/base/`)

| Component                                                                    | Use for                                                                                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `BaseButton`                                                                 | All buttons. Props: `variant` (primary/secondary/danger/ghost), `size`, `icon`, `loading`, `disabled`.   |
| `BaseInput`                                                                  | Text/number/password inputs. `v-model`, `type`, `placeholder`, `disabled`.                               |
| `BaseSelect`                                                                 | Dropdowns. `v-model`; `<option>`s go in the default slot. Themed chevron, no native-arrow inconsistency. |
| `BaseTextarea`                                                               | Multi-line input.                                                                                        |
| `BaseField`                                                                  | Label + hint wrapper around a control.                                                                   |
| `BaseCard`                                                                   | Titled surface with header/body/footer slots.                                                            |
| `Icon`                                                                       | lucide icon by `name`.                                                                                   |
| `BaseModal`, `SlidePanel`, `SubTabs`, `TimeRangePicker`, `SplitActionButton` | Overlays, tabbed sections, segmented range, split buttons.                                               |

Higher-level reusables outside `base/`: `DataTable`, `ConfirmModal`, `PermissionPicker`.

## Theming: never hardcode colors

The app themes with CSS custom properties. `<html>` carries `data-theme="light|dark"` (see `src/composables/useTheme.ts`); tokens and their dark overrides live in `src/assets/design-system.css`. There is one dark override block, so any hardcoded hex bypasses it and breaks in one theme.

Rules:

- Use semantic tokens, not hex: `var(--surface)` / `var(--surface-raised)` / `var(--surface-sunken)` / `var(--surface-inset)` for backgrounds; `var(--text)` / `var(--text-muted)` / `var(--text-subtle)` for text; `var(--border)` for borders; `var(--accent)` / `var(--accent-hover)` / `var(--accent-contrast)` for the primary accent.
- Status pills and tinted panels: `var(--color-{info,success,warning,danger,primary}-50)` background with the matching `-700` text. These flip per theme; the pale `#eff6ff`/`#fef3c7`/`#fee2e2` hexes do not.
- Solid saturated fills (a colored button background, a status dot, an icon) may stay as a saturated color; those read on both themes. Do not convert those to the `-50` tints.
- Inputs/selects must set both `background` and `color` (a missing `color` shows black text on a dark surface). Prefer `BaseInput`/`BaseSelect`, which handle this.

## Review checklist (UI changes)

- [ ] New inputs/selects/buttons/cards reuse `src/components/base/` rather than bespoke markup. Flag any hand-rolled control that duplicates a primitive.
- [ ] No hardcoded hex/`white`/`black` in `<style>` or inline `style=` for surfaces, text, borders, or status tints. Semantic tokens used instead.
- [ ] Rendered in both light and dark (toggle in the sidebar). Inputs, dropdowns, modals, and tables are readable in both.
- [ ] `type-check`, `lint`, `format:check`, and `test:run` pass.

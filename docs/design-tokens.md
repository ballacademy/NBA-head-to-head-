# Design tokens

Shared visual tokens live in `:root` inside `src/styles.css`. Hub surfaces also use `hub-accent--*` utility classes for mode-colored chrome.

## Accent palette

Mode and hub accents follow the same naming pattern:

| Token suffix | Example | Use |
| --- | --- | --- |
| `--accent-*` | `--accent-play` | Primary accent color |
| `--accent-*-bright` | `--accent-play-bright` | Text / highlights on dark |
| `--accent-*-soft` | `--accent-play-soft` | Tinted panel backgrounds |
| `--accent-*-border` | `--accent-play-border` | Borders and outlines |
| `--accent-*-glow` | `--accent-play-glow` | Subtle glow / shadow tint |

Modes: `play`, `daily`, `h2h`, `ranked`, `event`, `all-time`, `practice`, `roster`, `community`, `account`, `neutral`.

Apply accents in markup with `hub-accent hub-accent--<mode>` (for example `hub-accent--community` on community panels).

## Hub chrome

| Token | Purpose |
| --- | --- |
| `--hub-chrome-base`, `--hub-chrome-mid`, `--hub-chrome-deep` | Layered hub background stops |
| `--hub-chrome-bg`, `--hub-chrome-bg-size` | Full hub shell background |
| `--hub-chrome-border`, `--hub-chrome-shadow`, `--hub-chrome-sheen` | Border, depth, highlight |
| `--hub-subbox-*` | Nested cards inside hub panels |

## CTA, secondary, danger, modal

| Token | Purpose |
| --- | --- |
| `--btn-radius` | Default button corner radius (`12px`) |
| `--btn-min-height` | Minimum tap target height (`44px`) |
| `--cta-fg` | Foreground on light CTA buttons |
| `--secondary-bg`, `--secondary-border` | Ghost / secondary button fill and outline |
| `--danger`, `--danger-bright`, `--danger-soft`, `--danger-text` | Error and destructive states |
| `--modal-scrim` | Modal overlay backdrop |
| `--scroll-fade` | Bottom fade on scroll regions |

Secondary buttons use `--secondary-bg` and `--secondary-border`. Form errors use `--danger-bright` (alias of readable danger text).

## Scroll utilities

| Class | Behavior |
| --- | --- |
| `.u-scroll-region` | Touch momentum scrolling + contained overscroll |
| `.u-scroll-region--x` | Horizontal pan containment (`touch-action: pan-x pan-y`) |

These properties are also applied directly to long lists: `.player-pick-list`, `.stats-table-wrap`, `.tier-list__pool-grid`, `.community-posts-panel__viewer-card`, `.collection-tier-modal__list`.

## Empty and inline feedback

- **`EmptyState`** — `variant="hub"` (default) uses `.hub-empty`; `variant="draft"` uses `.draft-empty`. Optional `actions` slot renders `.hub-empty__actions`.
- **`InlineAlert`** — Uses `.form-error` for `tone="error"`; info/success use `.inline-alert` modifiers. Retry actions use `.daily-draft-results__sync-retry` / `.u-retry-button`.

## Retry button alias

`.u-retry-button` shares styles with `.daily-draft-results__sync-retry` for inline retry links inside alerts and results.

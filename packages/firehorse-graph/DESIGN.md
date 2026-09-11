# Design: firehorse-graph

## Mode

**Operate.** The visitor completes a task. Scanability, consistency, and the real
usage scene outrank expression. Brand lives in precise details.

## The world: dark instrument

The graph canvas is the lit surface; everything else recedes to the edges and
holds still. The reference is an observatory console or a mixing desk — a dark
field with one bright subject, where the chrome is legible but never competes.

This was chosen over a light shell for two reasons. The scene is a developer's
desk beside a dark editor, and `@supermemory/memory-graph` ships a dark-only
palette — a light shell would have meant authoring a light graph palette from
scratch and then fighting the seam between paper chrome and a dark viewport.

The instrument reading is what keeps this from being generic dark mode: measured
type, real numerals, no decoration that is not data.

## Tokens

Two greys do the structural work, and one accent does all the pointing.

| Token          | Value     | Role                                                   |
| -------------- | --------- | ------------------------------------------------------ |
| `--ink`        | `#0b0c0e` | The field the graph sits on                            |
| `--panel`      | `#131519` | Rails and panels, one step off the field               |
| `--raised`     | `#1a1d23` | Inputs, hover, the selected row                        |
| `--line`       | `#252932` | Hairlines. 1px, never a coloured slab                  |
| `--text`       | `#e8eaed` | Primary                                                |
| `--text-dim`   | `#9aa1ad` | Secondary — tinted from the ground, not grey           |
| `--text-faint` | `#646c7a` | Counts, timestamps, metadata                           |
| `--accent`     | `#6ea8fe` | Selection, focus, search hits. One accent, one meaning |
| `--accent-dim` | `#2b4a7d` | The accent at rest                                     |

Contrast: `--text` on `--ink` is 14.9:1, `--text-dim` 6.8:1, `--text-faint` 4.6:1.
All clear 4.5:1.

## Type

System sans for the interface. `ui-monospace` earns its place only where it is
doing a monospace job — container tags, identifiers, counts in columns — never as
a costume for "technical".

- Interface: 13px/1.5, the working size for a dense tool.
- Memory text in the detail panel: 14px/1.6, measure capped at 68ch.
- Section labels: 11px, `0.08em` tracking, `--text-faint`, uppercase. Used for the
  three rail headings only.

## Layout

```
┌──────────┬──────────────────────────────────────────┬────────────┐
│ projects │  search                          ⌘K      │            │
│          ├──────────────────────────────────────────┤  detail    │
│ firehorse│                                          │  panel     │
│    8  76 │            graph canvas                  │  (when a   │
│          │                                          │   node is  │
│ konstan… │                                          │   open)    │
│    1   4 │                                          │            │
│          │                                          │            │
│ ──────── │                                          │            │
│ graph    │                                          │            │
│ list     │                                          │            │
└──────────┴──────────────────────────────────────────┴────────────┘
```

The three jobs get one affordance each, none nested inside another: **search**
across the top, **projects** down the left, **graph / list** as a view switch
below the projects. The detail panel is the read surface and only exists when
something is selected.

Counts sit beside every project name because volume is the cheapest signal of
where the interesting data is, and the API gives them free.

## Motion

One authored moment: the detail panel slides in from the right over 180ms on an
exponential ease-out, from an already-visible default. Everything else is a
120ms colour transition on hover and focus. No entrance animations — this is a
tool that gets opened repeatedly, and a tool that performs on every open becomes
tiresome by the third time.

`prefers-reduced-motion` drops the slide to a fade.

## Browser surfaces

Themed rather than left default: selection (`--accent-dim`), caret (`--accent`),
scrollbars (`--line` on transparent, 10px), focus ring (2px `--accent` at a 2px
offset), and `font-variant-numeric: tabular-nums` on every count so columns of
numbers line up.

## What the component owns, and what this does not redraw

`MemoryGraph` owns rendering, layout, clustering, the force simulation, gestures,
the hover popover, the legend, the nav controls, and keyboard. The shell themes
it through the `colors` prop and otherwise leaves it alone.

`z`, `c`, `+` and `-` are taken by the component's global keydown listeners with
no opt-out, so no shell shortcut uses them and the search field must be reachable
without typing into the canvas.

## States

- **Loading:** the rail renders with its skeleton counts; the canvas holds an
  empty field rather than a spinner.
- **Supermemory down:** the whole shell is replaced by the 503's own sentence plus
  the command to start it. An empty graph would be a lie about the data.
- **No memories yet:** the project rail is empty and the canvas explains what
  creates memories, rather than showing an empty grid.
- **No search results:** the count line says so in place; the graph does not clear.

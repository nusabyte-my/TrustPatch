---
name: isometric-evidence-studio
description: Create interactive isometric product scenes for inspection, scoped change, repair, and verification. Use when adding meaningful isometric visuals to evidence-driven interfaces, agent workflows, or technical storytelling.
---

# Isometric Evidence Studio

Use small SVG scenes to explain a real state transition. The scene supports evidence; it never replaces evidence.

## Scene contract

Each scene receives:
- `stage`: `inspect | approve | repair | verify`
- `active`: whether motion is allowed
- `labels`: short accessible descriptions derived from actual product data

Map states mechanically:
- **Inspect:** scanner travels across the target plane; fault nodes are visible.
- **Approve:** a fixed cobalt boundary encloses the authorized file blocks.
- **Repair:** separated blocks reconnect; fault path changes to the active path.
- **Verify:** mint paths reach proof nodes; only observed checks appear completed.

## Construction rules

1. Use one 30° isometric plane and consistent block proportions across scenes.
2. Use system theme tokens: ink surfaces, cobalt active work, mint verified states, muted fault markers.
3. Keep text out of the artwork; use adjacent real content and an accessible scene label.
4. Animate only `transform` and `opacity`, 200–600ms for state changes. Ambient motion must be subtle and pausable.
5. Disable all motion for reduced-motion users and when the containing story is paused.
6. Do not invent metrics, file names, checks, or progress. Scene states must follow the selected actual repair stage.
7. At mobile widths, reduce scene height and keep the complete plane visible; never crop the proof nodes.

## Reuse

Use the same stage contract for landing stories, empty states, or agent progress. A landing environment may place specialist workstations around a central evidence core, but it must remain behind content, pointer-inert, decorative to assistive technology, and controlled by the same stage/pause state as the evidence player. Do not add isometric decoration to forms, evidence readers, or dense work areas where it competes with task completion.

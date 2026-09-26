# Account dropdown renders behind the card in Enter Multiple Deposits

## Problem
In the Enter Multiple Deposits (and Multiple Checks) table, the **Account** dropdown opens *inside* the card. The table area is a scrollable container, so the dropdown gets clipped and sits behind the card — the user can't see the full account list.

The **Deposit To (Bank)** field already avoids this: its dropdown (`AccountSearchInput`) renders in a fixed layer on top of the whole page, so every account is visible.

## Fix
Update `src/components/AccountSearchInputInline.tsx` (used by the Account column in both multi-entry tables) to use the exact same approach as `AccountSearchInput`:

- Render the dropdown into a top-level layer (portal) positioned right under the input, fixed to the page — never clipped or behind the card.
- Keep it glued under the input when the page or table scrolls.
- Cap its height (~240px) with its own scrollbar so long account lists stay usable.
- Same look as today (code - name rows, parents dimmed/unselectable, children indented).

## Scope
- One shared component change; no changes to the deposit/check tables themselves.
- The same inline dropdown is used on the standalone Make Deposits / Write Checks screens and edit dialogs, so those get the same fix automatically — consistent behavior everywhere.
- No data, saving, or math changes.

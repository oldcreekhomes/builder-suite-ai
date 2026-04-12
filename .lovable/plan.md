

## Split Card Input into Two Rows (Number on top, Expiry + CVC below)

### The Problem
The `CardElement` renders all fields (number, expiry, CVC) in a single row. On the current layout the CVC gets cut off screen. You want card number on line 1, and MM/YY + CVC on line 2.

### Solution
Replace `CardElement` with three separate Stripe Elements: `CardNumberElement`, `CardExpiryElement`, and `CardCvcElement`. This gives full layout control so we can stack them:
- Row 1: Card number (full width)
- Row 2: MM/YY (half width) + CVC (half width)

The submission logic changes from `elements.getElement(CardElement)` to `elements.getElement(CardNumberElement)` (Stripe only needs the number element reference to create the payment method; it automatically picks up expiry and CVC).

### Files to modify
1. **`src/components/SubscriptionGate.tsx`** — replace `CardElement` with split elements
2. **`src/components/PaywallDialog.tsx`** — same replacement

### Layout
```text
┌──────────────────────────────┐
│  Card number                 │
├──────────────┬───────────────┤
│  MM / YY     │  CVC          │
└──────────────┴───────────────┘
[        Start trial           ]
```


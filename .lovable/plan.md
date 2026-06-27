## BuilderSuite ML Seat-Based Subscription — Final Plan

### Pricing model
- Product `prod_UJkigiBSQD1O7e` / Price `price_1Tn0bo2M261MnJZCJRYDpnHF` ($39/user/month, licensed/quantity-based).
- Stripe `quantity` = number of active users on the home builder's account (owner counts as 1).

### Behavior rules
- **Add user mid-cycle** → quantity bumps immediately, Stripe charges card on file the prorated amount for remaining days. No Checkout redirect.
- **Remove user mid-cycle** → user keeps access through end of current billing period (already paid for). Quantity drops at next renewal. No refund. Owner can undo before that date.
- **Owner cancels (auto-renew off)** → everyone retains access until period end, then full lockout.
- **Payment failure → IMMEDIATE FULL LOCKOUT.** No grace period. The first `invoice.payment_failed` event locks the entire company (owner + all employees) until the invoice is paid.

---

### Database changes (migration)

New table `home_builder_subscriptions` (one row per owner):
- `id uuid pk`
- `home_builder_id uuid unique not null`
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `stripe_price_id text`
- `status text` (active, trialing, past_due, canceled, unpaid, incomplete)
- `quantity int`
- `current_period_start timestamptz`
- `current_period_end timestamptz`
- `cancel_at_period_end boolean default false`
- `created_at`, `updated_at`

Add to `users`:
- `pending_removal_at timestamptz null` — when set and in the past, user is locked out.

RLS: owner reads own row; service_role full access. Standard GRANTs.

### Edge functions

1. **`create-checkout`** — first-time signup only. Stripe Checkout Session, qty 1, returns URL.
2. **`check-subscription`** — pulls latest sub, upserts cache. Called on login and after seat mutations.
3. **`preview-seat-change`** — input `delta` (+1/-1). Returns prorated charge (add) or end-of-access date + new monthly total (remove), plus current card last4.
4. **`add-seat`** — owner-only. Stripe `subscriptions.update` with `proration_behavior:'create_prorations'`, `payment_behavior:'error_if_incomplete'`. Caller creates the user only on success.
5. **`remove-seat`** — owner-only. Sets `users.pending_removal_at = current_period_end`. Stripe `subscriptions.update` with `proration_behavior:'none'` (decrement applied at next renewal).
6. **`undo-remove-seat`** — owner-only. Clears flag and re-bumps Stripe quantity if needed.
7. **`customer-portal`** — Stripe Billing Portal for card updates.
8. **`stripe-webhook`** — **v1 required** (because payment failure must lock instantly). Verifies signature with `STRIPE_WEBHOOK_SECRET`. Handles:
   - `invoice.payment_failed` → set `status = 'past_due'` → frontend gates everyone in the company.
   - `invoice.payment_succeeded` → set `status = 'active'` → access restored instantly.
   - `customer.subscription.updated` / `.deleted` → sync quantity, period, cancel_at_period_end.
9. **Cron (`pg_cron` + `pg_net`, daily 00:05 UTC)** — `process-pending-removals`: hard-revokes users whose `pending_removal_at <= now()`.

### Frontend changes

**Add Employee flow:**
- Call `preview-seat-change(+1)` → confirm dialog:
  > *"Adding [Name] will charge **$16.77** to your Visa •••• 4242 today (prorated for 13 days remaining). Your monthly bill will increase to **$312/month** starting May 12, 2026."*
  > **Cancel** / **Confirm & Add User**
- On confirm → `add-seat` → on success create user; on decline show "Payment declined — update your card in Manage Subscription".

**Remove Employee flow:**
- Call `preview-seat-change(-1)` → confirm dialog:
  > *"[Name] will keep access through **May 12, 2026** (the end of your current billing period, which is already paid for). On that date their access will end and your bill will drop to **$234/month**. No refund will be issued. You can undo this anytime before May 12."*
  > **Cancel** / **Confirm Removal**
- User row shows badge **"Access ends May 12, 2026"** with **Undo** button until then.

**Payment-failure lockout (everyone in company):**
- Route guard checks cached `home_builder_subscriptions.status`. If `past_due` / `unpaid` / `canceled` with expired period → full-screen lockout:
  > **"Payment failed. Your company's access has been suspended. Please update your payment method to restore access."**
- Owner sees **"Update Payment Method"** button → opens Manage Subscription modal / Billing Portal.
- Employees see the same lockout screen with text directing them to contact their account owner.
- Webhook flips status back to `active` on successful payment → guard releases instantly on next page interaction (we'll also poll `check-subscription` every 30s on the lockout screen so it auto-redirects).

**Pending-removal user lockout:**
- If `auth.uid()` user has `pending_removal_at <= now()` → "Your access has ended" screen.

**Owner cancellation lockout:**
- If subscription `canceled` AND `current_period_end < now()` → "Subscription inactive — reactivate" screen.

**Manage Subscription modal (existing):** wire live data from `check-subscription`; no UI overhaul needed.

---

### Setup the user needs to do
- Set `STRIPE_WEBHOOK_SECRET` secret (I'll request it after creating the webhook endpoint so they can paste it from the Stripe dashboard).
- Confirm the price is licensed/quantity-based (I'll verify via Stripe API at build start; if it's flat-fee, create a new licensed price).

### Out of scope for v1
- Free trial on first checkout.
- Dunning emails (Stripe's default Smart Retries are disabled by the instant-lockout rule; recommend turning off Smart Retries in Stripe dashboard so the first failure truly is the lockout trigger).

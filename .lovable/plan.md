
# Add Marketplace Messaging Feature with Email Discovery & Tracking

## Overview

Build a Google-style messaging system that allows builders to contact marketplace suppliers directly. The modal will capture user details and message, send emails to suppliers, and track message counts for future monetization.

---

## Part 1: Database Changes

### New Table: `marketplace_messages`

Track every message sent to suppliers for analytics and billing:

```sql
CREATE TABLE marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_company_id UUID NOT NULL REFERENCES marketplace_companies(id),
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  sender_phone TEXT,
  message TEXT NOT NULL,
  response_method TEXT NOT NULL CHECK (response_method IN ('email', 'phone')),
  recipient_email TEXT,  -- The email it was actually sent to
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public messaging)
CREATE POLICY "Anyone can send messages" 
ON marketplace_messages FOR INSERT 
WITH CHECK (true);

-- Only admins can read (for analytics)
CREATE POLICY "Admins can read messages" 
ON marketplace_messages FOR SELECT 
USING (auth.role() = 'authenticated');
```

### Add Message Count Column

Add a denormalized counter to `marketplace_companies` for quick display:

```sql
ALTER TABLE marketplace_companies 
ADD COLUMN message_count INTEGER DEFAULT 0;
```

---

## Part 2: Email Discovery Strategy

### Challenge
- 809 companies, but only 5 have representative emails
- 759 companies have websites

### Solution: Multi-tier Email Discovery

1. **Tier 1: Representative Email** - If company has a representative with email, use it
2. **Tier 2: Website Domain Email** - Generate contact@domain.com or info@domain.com from website
3. **Tier 3: User Input** - Modal allows user to manually enter email if known

### Email Generation Logic

```typescript
function deriveEmailFromWebsite(website: string): string | null {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    const domain = url.hostname.replace('www.', '');
    return `info@${domain}`;
  } catch {
    return null;
  }
}
```

---

## Part 3: UI Components

### 3.1 Add Message Button to Table

Add a new column with a "Message" button icon for each row:

```
| Company | Location | Rating | Phone | Website | Message |
|---------|----------|--------|-------|---------|---------|
| ABC Co  | ...      | 4.8    | ...   | Visit   | [msg]   |
```

### 3.2 Message Modal (Google-style)

```text
+--------------------------------------------------+
|  ←  Send request to [Company Name]          [X]  |
+--------------------------------------------------+
|                                                   |
|  [Company Name]                                   |
|  ★ 4.9 (184)  · Contacted by 10 people           |
|                                                   |
|  Your message                                     |
|  +---------------------------------------------+ |
|  | Give details like what you need done and    | |
|  | how soon you need it                        | |
|  +---------------------------------------------+ |
|                                          0/600   |
|                                                   |
|  Name                                            |
|  +---------------------------------------------+ |
|  | Matt Gray                                   | |
|  +---------------------------------------------+ |
|                                          9/50    |
|                                                   |
|  How would you like to hear back?                |
|  ( ) SMS or phone call                           |
|  (●) Email                                       |
|                                                   |
|  Email                                           |
|  +---------------------------------------------+ |
|  | mgray@oldcreekhomes.com                     | |
|  +---------------------------------------------+ |
|                                                   |
|  [No thanks]                     [Send]          |
+--------------------------------------------------+
```

**Modal Fields:**
- Message textarea (max 600 chars)
- Name input (max 50 chars)
- Response preference (radio: SMS/phone or Email)
- Email input (if email selected)
- Phone input (if SMS/phone selected)

---

## Part 4: Edge Function

### `send-marketplace-message`

New edge function that:
1. Receives message data
2. Looks up supplier email (representative or derived from website)
3. Sends email via Resend
4. Records message in `marketplace_messages` table
5. Increments `message_count` on the company

```typescript
// supabase/functions/send-marketplace-message/index.ts

// Request body
interface MessageRequest {
  marketplaceCompanyId: string;
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  message: string;
  responseMethod: 'email' | 'phone';
}

// Response
interface MessageResponse {
  success: boolean;
  recipientEmail?: string;
  error?: string;
}
```

### Email Template

Professional HTML email template similar to existing PO emails:

```
Subject: New inquiry from [Sender Name] via Builder Suite

+--------------------------------------------------+
|                BUILDER SUITE AI                   |
+--------------------------------------------------+
|                                                   |
|  You have received a new message!                 |
|                                                   |
|  From: Matt Gray                                  |
|  Email: mgray@oldcreekhomes.com                   |
|  Phone: (555) 123-4567                            |
|                                                   |
|  Message:                                         |
|  "Looking for drywall services for a 3,000 sq ft |
|  home build. Need work completed by March 2025.  |
|  Please contact me to discuss scope and pricing."|
|                                                   |
|  Preferred Response: Email                        |
|                                                   |
+--------------------------------------------------+
```

---

## Part 5: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/components/marketplace/SendMarketplaceMessageModal.tsx` | Google-style message modal |
| `supabase/functions/send-marketplace-message/index.ts` | Edge function for sending |
| `supabase/migrations/XXXX_add_marketplace_messages.sql` | Database migration |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/marketplace/MarketplaceCompaniesTable.tsx` | Add Message button column |
| `src/integrations/supabase/types.ts` | Auto-regenerated with new table |

---

## Part 6: Message Flow

```text
1. User clicks "Message" button on company row
       ↓
2. Modal opens with company info and form
       ↓
3. User fills in name, message, contact preference
       ↓
4. User clicks "Send"
       ↓
5. Frontend calls send-marketplace-message edge function
       ↓
6. Edge function:
   a. Finds recipient email (rep → website-derived → error)
   b. Sends email via Resend
   c. Inserts record into marketplace_messages
   d. Increments company message_count
       ↓
7. Success toast shown to user
       ↓
8. Table shows "Contacted by X people" in future
```

---

## Part 7: Future Monetization Ready

The `marketplace_messages` table enables:

- **Per-message billing**: Charge suppliers $X per lead received
- **Subscription tiers**: Free tier = 5 messages/month, Pro = unlimited
- **Analytics dashboard**: Show suppliers how many leads they're getting
- **Lead quality scoring**: Track conversion rates

---

## Technical Notes

### Email Fallback Strategy
```
1. Check marketplace_company_representatives for email
2. If none, derive from website domain (info@domain.com)
3. If no website, show error "Contact info unavailable"
```

### Validation
- Message: 1-600 characters, required
- Name: 1-50 characters, required
- Email: Valid email format if email response selected
- Phone: Valid phone if phone response selected

### Message Count Display
Show "Contacted by X people this week" like Google does (optional enhancement later)

---

## Implementation Order

1. Create database migration for `marketplace_messages` table + message_count column
2. Create `SendMarketplaceMessageModal.tsx` component
3. Create `send-marketplace-message` edge function
4. Update `MarketplaceCompaniesTable.tsx` to add Message column/button
5. Test end-to-end flow
6. Deploy edge function

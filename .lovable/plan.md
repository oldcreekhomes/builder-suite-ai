

## Two-Path Signup: Home Builders vs. Marketplace Listings

### Overview

This plan creates two distinct signup paths to properly differentiate between:
1. **Home Builders / General Contractors** - Get full app access (like Old Creek Homes)
2. **Marketplace Companies** - Subcontractors, vendors, lenders, CPAs, etc. who want to be listed in the directory where builders can find them

### Key Design Decisions

**Email Verification**: Yes, both paths should require email verification. This ensures legitimate businesses, prevents spam listings, and sets the foundation for premium features later.

**Login Capability**: Marketplace companies will be able to log in and update their profile. They'll get a simple "Marketplace Portal" with just their profile management, not the full BuilderSuite app.

**Linking Companies Across Systems**: For the scenario where LPF Tech Services exists in your internal `companies` table AND wants a Marketplace listing:
- Add an optional `marketplace_company_id` column to the `companies` table
- This creates a soft link - home builders can optionally associate their vendor with a Marketplace listing
- Benefits: If a vendor updates their Marketplace profile (address, phone, insurance), home builders can see "linked" data

---

### Database Changes

**1. Add `user_id` to `marketplace_companies` table**

```sql
ALTER TABLE public.marketplace_companies 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow the company owner to update their own profile
CREATE POLICY "Marketplace company owners can update their own listing"
ON public.marketplace_companies
FOR UPDATE
USING (auth.uid() = user_id);
```

**2. Add `marketplace_company_id` to `companies` table (optional linking)**

```sql
ALTER TABLE public.companies
ADD COLUMN marketplace_company_id uuid REFERENCES public.marketplace_companies(id) ON DELETE SET NULL;
```

**3. Create `marketplace_user_type` enum and update users table**

```sql
-- Add user_type column to distinguish login types
ALTER TABLE public.users 
ADD COLUMN user_type text DEFAULT 'home_builder' 
CHECK (user_type IN ('home_builder', 'marketplace_vendor'));
```

**4. Update `handle_new_user()` trigger**

Modify the trigger to handle the new `marketplace_vendor` user type, creating appropriate records based on signup path.

---

### Landing Page Changes

**File: `src/pages/Landing.tsx`**

Add a new "Two Paths" section after the Hero, before the Founder's Message:

```text
+------------------------------------------------------------------+
|              Who Are You?                                        |
+------------------------------------------------------------------+
|                                                                  |
|  +------------------------+    +------------------------+        |
|  |  [Building Icon]       |    |  [Handshake Icon]      |        |
|  |                        |    |                        |        |
|  |  I'M A HOME BUILDER    |    |  I'M A SUBCONTRACTOR   |        |
|  |  or GENERAL CONTRACTOR |    |  VENDOR, OR SUPPLIER   |        |
|  |                        |    |                        |        |
|  |  I want to manage my   |    |  I want home builders  |        |
|  |  projects, budgets,    |    |  to find me in the     |        |
|  |  and accounting.       |    |  BuilderSuite          |        |
|  |                        |    |  Marketplace.          |        |
|  |  [Get Started Free]    |    |  [Join Marketplace]    |        |
|  +------------------------+    +------------------------+        |
|                                                                  |
+------------------------------------------------------------------+
```

- "Get Started Free" button → `/auth?tab=signup` (existing flow)
- "Join Marketplace" button → `/auth/marketplace` (new page)

---

### New Marketplace Signup Page

**File: `src/pages/MarketplaceSignup.tsx` (new)**

A dedicated signup flow for marketplace vendors with:

1. **Company Type Selection** (Subcontractor, Vendor, Lender, Municipality, CPA, Other)
2. **Company Name** (with Google Places autocomplete)
3. **Contact Info** (email, phone, website)
4. **Primary Representative** (name, email, phone)
5. **Specialties / Service Areas** (optional, can add later)
6. **Terms agreement** checkbox

On submit:
1. Create auth user with `user_type: 'marketplace_vendor'`
2. Create `marketplace_companies` record with `user_id` linked
3. Create `marketplace_company_representatives` record for primary contact
4. Send verification email
5. Redirect to "Check your email" page

---

### Marketplace Portal (Post-Login)

**File: `src/pages/MarketplacePortal.tsx` (new)**

A simple dashboard for marketplace vendors:

- View/edit company profile
- Manage representatives
- Upload insurance certificates
- View contact requests from builders (future feature)
- Premium listing upgrade (future feature)

**Routing Logic in `RootRoute.tsx`**:
```tsx
if (user) {
  const userType = user.user_metadata?.user_type;
  if (userType === 'marketplace_vendor') {
    return <MarketplacePortal />;
  }
  return <Index />;  // Full BuilderSuite app
}
return <Landing />;
```

---

### Files to Create/Modify

**New Files:**
1. `src/pages/MarketplaceSignup.tsx` - Marketplace registration form
2. `src/pages/MarketplacePortal.tsx` - Simple profile management dashboard
3. `src/components/marketplace/MarketplaceSignupForm.tsx` - Form component
4. `src/components/marketplace/MarketplaceProfileEditor.tsx` - Profile editing

**Modified Files:**
1. `src/pages/Landing.tsx` - Add "Two Paths" section
2. `src/components/RootRoute.tsx` - Route marketplace users to their portal
3. `src/App.tsx` - Add routes for `/auth/marketplace` and `/marketplace-portal`
4. `supabase/functions/send-signup-emails/index.ts` - Handle marketplace welcome emails

---

### Linking Existing Companies to Marketplace

For the LPF Tech Services scenario:

1. **In the Edit Company dialog** (`EditCompanyDialog.tsx`):
   - Add a "Link to Marketplace" button/section
   - Opens a search to find matching Marketplace listing
   - If found, associates `marketplace_company_id`
   - If not found, offers to "Invite to Marketplace" (sends email to vendor)

2. **Visual indicator in Companies table**:
   - Show a small "Marketplace" badge if a company is linked
   - Tooltip: "This vendor is also listed in BuilderSuite Marketplace"

3. **Future**: When viewing a linked company, show live data from their Marketplace profile (address updates, insurance status, etc.)

---

### User Flow Summary

**Path A: Home Builder / GC**
```
Landing → "Get Started Free" → /auth?tab=signup 
→ [Email, Password, Company Name] → Verify Email 
→ Full BuilderSuite App (blank slate)
```

**Path B: Marketplace Vendor**
```
Landing → "Join Marketplace" → /auth/marketplace 
→ [Company Type, Company Name, Contact, Representative] → Verify Email 
→ Marketplace Portal (profile management only)
```

---

### Technical Notes

1. **RLS Policies**: Marketplace companies need policies allowing:
   - Public SELECT for browsing
   - UPDATE only by `user_id` owner
   - INSERT for authenticated users (during signup)

2. **Email Templates**: Create welcome email for marketplace vendors explaining:
   - Their profile is now live
   - How to update their information
   - Future premium features coming

3. **Header Navigation**: When a marketplace user is logged in, show a simpler header with just "My Profile", "Logout" - not the full BuilderSuite navigation.


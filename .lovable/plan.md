
# Fix: Bill Upload Owner ID for All Employees

## Problem Summary

When employees/accountants upload bills via "Enter with AI", the `owner_id` is incorrectly set to their personal user ID instead of the company's `home_builder_id`. This causes bill approval to fail because the data becomes orphaned from the company's data scope.

---

## Solution

**Two code changes that apply to ALL employees** (accountant, project manager, construction manager, etc.):

### File 1: `src/components/bills/SimplifiedAIBillExtraction.tsx`

**Location**: Lines 166-222 (inside `handleFileUpload`)

**Current Code** (Line 172-173, 213):
```typescript
console.log('[Upload] Starting upload for', files.length, 'file(s), user:', user.id);
...
owner_id: user.id,  // BUG: Always uses current user's ID
```

**Fixed Code** (adds user role check before insert):
```typescript
// Determine effective owner_id for employees/accountants
const { data: userData } = await supabase
  .from('users')
  .select('role, home_builder_id')
  .eq('id', user.id)
  .single();

const effectiveOwnerId = (userData?.role !== 'owner' && userData?.home_builder_id)
  ? userData.home_builder_id
  : user.id;

console.log('[Upload] Starting upload for', files.length, 'file(s), user:', user.id, 'effectiveOwner:', effectiveOwnerId);
...
owner_id: effectiveOwnerId,  // FIXED: Use company owner, not individual user
uploaded_by: user.id,        // Keep track of who actually uploaded
```

---

### File 2: `supabase/functions/extract-bill-data/index.ts`

**Location**: Lines 445-456

**Current Code** (Line 452):
```typescript
const effectiveOwnerId = (uploaderUser?.role === 'employee' && uploaderUser?.home_builder_id) 
  ? uploaderUser.home_builder_id 
  : pendingUpload.owner_id;
```

**Fixed Code** (covers ALL non-owner roles):
```typescript
// Include ALL non-owner roles: employee, accountant, construction_manager, project_manager, etc.
const effectiveOwnerId = (uploaderUser?.role !== 'owner' && uploaderUser?.home_builder_id) 
  ? uploaderUser.home_builder_id 
  : pendingUpload.owner_id;
```

---

## Why This Fixes ALL Employees

The key logic is:
```typescript
userData?.role !== 'owner' && userData?.home_builder_id
```

This catches:
- `employee`
- `accountant`
- `construction_manager`
- `project_manager`
- Any future roles

If they have a `home_builder_id`, their uploads use the company's ID.

---

## Data Remediation for Jole's Stuck Upload

After the code fix is deployed, run this SQL to fix her current stuck record:

```sql
-- Fix Jole's pending upload owner_id
UPDATE pending_bill_uploads 
SET owner_id = '2653aba8-d154-4301-99bf-77d559492e19'
WHERE id = '62fa71ad-2373-4761-858f-70d36c03354b';

UPDATE pending_bill_lines 
SET owner_id = '2653aba8-d154-4301-99bf-77d559492e19'
WHERE pending_upload_id = '62fa71ad-2373-4761-858f-70d36c03354b';
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/bills/SimplifiedAIBillExtraction.tsx` | Add user role check, use `effectiveOwnerId` for insert |
| `supabase/functions/extract-bill-data/index.ts` | Change `=== 'employee'` to `!== 'owner'` |


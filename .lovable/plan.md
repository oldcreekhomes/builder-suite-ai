

# Auto-Sign-Out Deleted Users

## Problem
When a user account is fully deleted from `auth.users`, their browser still holds a cached JWT session token. The app loads this stale session and treats the user as authenticated, even though Supabase returns 403 "User from sub claim in JWT does not exist" on every API call. The user remains stuck in a broken signed-in state.

## Solution
After retrieving the cached session in `useAuth`, validate it by calling `supabase.auth.getUser()` (which actually hits the Supabase server, unlike `getSession()` which only reads the local cache). If the server returns an error (e.g., user not found), force a sign-out to clear the stale token and redirect to the auth page.

## Implementation

**File: `src/hooks/useAuth.tsx`**

In the `initializeAuth` function, after successfully getting a session (line 89-92), add a server-side validation step:

```typescript
// After getting session successfully
if (session) {
  // Validate the session against the server
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData?.user) {
    console.error("🔑 User no longer exists on server, signing out...", userError?.message);
    await supabase.auth.signOut();
    setSession(null);
    setRealUser(null);
    setLoading(false);
    return;
  }
}
```

Also, in the `onAuthStateChange` listener, add similar handling for the `TOKEN_REFRESHED` event failing (Supabase will emit a `SIGNED_OUT` event automatically when token refresh fails for a deleted user, but adding explicit handling for edge cases where the stale token persists).

## What This Achieves
- Deleted users are automatically signed out on their next page load
- No more 403 error loops from stale JWTs
- Clean redirect to the auth/landing page
- No impact on normal active users (one extra lightweight API call on init)

## Scope
- Single file change: `src/hooks/useAuth.tsx`
- No database, RLS, or edge function changes needed


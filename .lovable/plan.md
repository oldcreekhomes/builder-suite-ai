The `revoke-employee-access` and `restore-employee-access` edge functions exist in the codebase but have never been deployed — that's why the browser gets "Failed to send a request to the Edge Function" (the URL returns no function).

**Fix:** Deploy both functions, then retry Revoke Access on Danny.

1. Deploy `revoke-employee-access` and `restore-employee-access`.
2. Verify deploy succeeded (logs show a boot event).
3. You retry the Revoke Access button on Danny; I'll check logs if anything still fails.

No code changes needed.
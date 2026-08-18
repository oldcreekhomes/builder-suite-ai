# Repair shared drawing and folder links

## Goal
Restore existing Supabase `share-redirect` links so drawings, files, photos, and nested shared folders open normally without changing their URL format.

## Confirmed cause
`share-redirect` still imports `@supabase/supabase-js` through `esm.sh`. Its deployed runtime is crashing during startup in the transitive `ws` package (`node:url`, `bufferutil`, and `utf-8-validate`) before the request reaches the redirect handler. The shared-folder page and route are not the source of this error.

## Changes
1. Replace the broken `esm.sh` dependency with the stable Deno `npm:` Supabase import already used to repair the PO and bid email functions.
2. Remove unnecessary legacy startup imports and use runtime-native request handling while preserving:
   - the exact `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/share-redirect?...` links;
   - redirects to `https://buildersuiteml.com`;
   - file/folder and photo route handling;
   - nested-folder rendering after redirect.
3. Keep CORS headers on every response and retain validation for missing, expired, or invalid share IDs.
4. Add a focused function test for valid redirects and invalid IDs, then test the deployed function with the provided share ID to confirm it returns a redirect rather than `WORKER_ERROR`.

## Technical scope
Only the `share-redirect` edge function and its focused test will change. No database records, shared-link URLs, frontend folder logic, or stored files will be altered.
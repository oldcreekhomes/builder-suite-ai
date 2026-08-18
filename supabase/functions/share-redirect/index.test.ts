import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");

if (!SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL is required");
}

const endpoint = `${SUPABASE_URL}/functions/v1/share-redirect`;

Deno.test("share-redirect rejects requests without an id", async () => {
  const response = await fetch(endpoint, { redirect: "manual" });
  const body = await response.text();

  assertEquals(response.status, 400);
  assertMatch(body, /Missing id/);
});

Deno.test("share-redirect sends a single shared file directly to the public file opener", async () => {
  const response = await fetch(
    `${endpoint}?id=1x3erc8a3sce05pvfwgpv&type=f`,
    { redirect: "manual" },
  );
  await response.text();

  assertEquals(response.status, 302);
  const location = response.headers.get("location") ?? "";
  assertMatch(location, /\/functions\/v1\/public-file-download\?/);
  assertMatch(location, /share_id=1x3erc8a3sce05pvfwgpv/);
  assertMatch(location, /file_id=d2fef001-4547-4038-89fe-f8505f2103f2/);
  assertMatch(location, /inline=true/);
});

Deno.test("public file opener redirects the shared PDF to its signed storage URL", async () => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/public-file-download?share_id=1x3erc8a3sce05pvfwgpv&file_id=d2fef001-4547-4038-89fe-f8505f2103f2&inline=true`,
    { redirect: "manual" },
  );
  await response.text();

  assertEquals(response.status, 302);
  assertMatch(response.headers.get("location") ?? "", /\/storage\/v1\/object\/sign\/project-files\//);
});
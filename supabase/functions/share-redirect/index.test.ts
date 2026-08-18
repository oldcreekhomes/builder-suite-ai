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

Deno.test("share-redirect sends a valid shared drawing to BuilderSuite ML", async () => {
  const response = await fetch(
    `${endpoint}?id=1x3erc8a3sce05pvfwgpv&type=f`,
    { redirect: "manual" },
  );
  await response.text();

  assertEquals(response.status, 302);
  assertEquals(
    response.headers.get("location"),
    "https://buildersuiteml.com/s/f/1x3erc8a3sce05pvfwgpv",
  );
});
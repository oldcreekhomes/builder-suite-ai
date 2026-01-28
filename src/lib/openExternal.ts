/**
 * Opens an external URL through the outbound redirect trampoline.
 * This avoids ERR_BLOCKED_BY_RESPONSE issues caused by COOP/CORP headers
 * when opening external sites from sandboxed/embedded contexts.
 */
export function openExternal(url: string): void {
  // Build the outbound redirect URL
  const outUrl = `/out?u=${encodeURIComponent(url)}`;
  
  console.log("[openExternal] Opening via trampoline:", url);
  console.log("[openExternal] Trampoline URL:", outUrl);
  
  // Try programmatic anchor click (closest to real user click)
  try {
    const anchor = document.createElement("a");
    anchor.href = outUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    console.log("[openExternal] Anchor click succeeded");
    return;
  } catch (e) {
    console.warn("[openExternal] Anchor click failed:", e);
  }
  
  // Fallback: window.open
  try {
    const newWindow = window.open(outUrl, "_blank", "noopener,noreferrer");
    if (newWindow) {
      console.log("[openExternal] window.open succeeded");
      return;
    }
  } catch (e) {
    console.warn("[openExternal] window.open failed:", e);
  }
  
  // Last resort: navigate in same tab
  console.log("[openExternal] Falling back to same-tab navigation");
  window.location.assign(outUrl);
}

/**
 * Build-time prerenderer for public marketing routes.
 *
 * Reads `dist/index.html` (produced by `vite build`), and for each
 * marketing route writes a `dist/{route}/index.html` with:
 *  - per-page <title>, <meta name="description">
 *  - per-page <link rel="canonical">
 *  - per-page og:* and twitter:* including a unique og:image
 *  - per-page JSON-LD
 *  - a static SEO-readable body (h1, intro, sections, CTA, footer links)
 *
 * Why this approach (vs puppeteer SSR):
 *  - No headless-browser dependency in the build pipeline.
 *  - React's `createRoot` discards existing #root children on mount,
 *    so no hydration mismatch — the SPA renders identically post-load.
 *  - Crawlers and non-JS social previewers see real HTML.
 *
 * Runs automatically via npm `postbuild` after `vite build`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "..", "dist");
const SITE = "https://buildersuiteml.com";

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttr = escapeHtml;

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "Our Philosophy" },
  { href: "/features/accounting", label: "Accounting" },
  { href: "/features/ai-bill-management", label: "AI Bill Management" },
  { href: "/features/gantt-scheduling", label: "Smart Gantt Scheduling" },
  { href: "/features/bid-management", label: "Bid Management" },
  { href: "/features/document-management", label: "Document Management" },
  { href: "/features/team-communication", label: "Team Communication" },
  { href: "/features/join-marketplace", label: "Join the Marketplace" },
];

/**
 * Marketing route manifest. Keep `title`/`description` in sync with the
 * React page's <SeoHead> call. The body content here is what crawlers
 * read; JS users see the full React page after hydration.
 */
const ROUTES = [
  {
    path: "/",
    file: "index.html",
    title: "BuilderSuite ML — Construction Management for Home Builders",
    description:
      "All-in-one construction management for home builders: projects, budgets, schedules, accounting, bidding and AI-powered bill capture.",
    ogImage: "/og/home.jpg",
    h1: "Construction Management for Home Builders",
    intro:
      "BuilderSuite ML is the all-in-one platform built by home builders, for home builders — projects, budgets, schedules, accounting, bidding, and AI-powered bill capture, all in one place.",
    sections: [
      { h2: "Projects, Budgets, and Schedules", body: "Track every project from foundation to closeout. Manage budgets with cent-precise job costing and keep schedules on track with a smart Gantt chart." },
      { h2: "Built-in Construction Accounting", body: "Double-entry accounting designed for builders: A/P, A/R, banking, reconciliation, job costing, and full reports — all tied directly to your projects." },
      { h2: "AI-Powered Bill Capture", body: "Drag and drop hundreds of vendor invoices at once. Our AI extracts vendor, amounts, dates, and line items automatically and matches them to purchase orders." },
      { h2: "Bidding, Documents, and Team Communication", body: "Run bid packages, store plans and photos, and keep your crew and subs in sync — all from the same platform." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/about",
    file: "about/index.html",
    title: "About BuilderSuite ML — Built by Builders, for Builders",
    description:
      "Learn why BuilderSuite ML was built by working home builders to solve the real problems construction teams face every day.",
    ogImage: "/og/about.jpg",
    h1: "Built by Builders, for Builders",
    intro:
      "BuilderSuite ML was built by working home builders to solve the real problems construction teams face every day — not by software people guessing at what builders need.",
    sections: [
      { h2: "Our Philosophy", body: "Every workflow in BuilderSuite ML comes from a real builder problem we hit ourselves. If it doesn't help you build better homes faster, it doesn't ship." },
      { h2: "One Platform, Not Ten", body: "Replace the patchwork of disconnected tools with one system that connects projects, schedules, budgets, accounting, and your subcontractor network." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/features/accounting",
    file: "features/accounting/index.html",
    title: "Construction Accounting Software | BuilderSuite ML",
    description:
      "Double-entry accounting built for builders: A/P, A/R, banking, reconciliation, job costing, and reports — all tied to your projects.",
    ogImage: "/og/accounting.jpg",
    h1: "Construction Accounting Built for Home Builders",
    intro:
      "Full double-entry construction accounting tied directly to your projects: bills, checks, deposits, bank reconciliation, job costing, and audit-ready reports.",
    sections: [
      { h2: "Accounts Payable & Receivable", body: "Manage vendor bills, partial payments, credit memos, and customer invoices with QuickBooks-style precision and full audit trails." },
      { h2: "Banking & Reconciliation", body: "Write checks, make deposits, and reconcile bank statements to the cent. Closing periods locks transactions and protects historical books." },
      { h2: "Job Costing & Reports", body: "Every transaction is mapped to a project and cost code. Run Balance Sheet, P&L, A/P Aging, and project-scoped reports with one click." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/features/ai-bill-management",
    file: "features/ai-bill-management/index.html",
    title: "AI Bill Management for Builders | BuilderSuite ML",
    description:
      "Auto-extract vendors, cost codes, and amounts from PDF bills. Match to purchase orders and approve from anywhere.",
    ogImage: "/og/ai-bill-management.jpg",
    h1: "Stop Paying for Manual Bill Data Entry",
    intro:
      "Upload hundreds of vendor invoices at once and let AI extract vendor, amounts, dates, and line items automatically. Match to purchase orders and approve from anywhere.",
    sections: [
      { h2: "Bulk Upload", body: "Drag and drop entire folders of vendor invoices, receipts, and statements. Whether it's 5 bills or 500, BuilderSuite processes them simultaneously." },
      { h2: "Intelligent Extraction", body: "Our AI reads each document and extracts vendor name, invoice number, date, due date, line items, and totals — learning your vendor patterns over time." },
      { h2: "Smart Cost Code Assignment", body: "BuilderSuite remembers which cost codes you typically use for each vendor and suggests them automatically. One click to confirm." },
      { h2: "Approval Workflow", body: "Route bills for approval based on amount, vendor, or project, with email notifications and one-click approval." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/features/gantt-scheduling",
    file: "features/gantt-scheduling/index.html",
    title: "Gantt Scheduling for Construction Projects | BuilderSuite ML",
    description:
      "Visual Gantt schedules with crew, vendor, and predecessor tracking. Send schedule updates straight to your trades.",
    ogImage: "/og/gantt-scheduling.jpg",
    h1: "Smart Gantt Scheduling Built for Home Builders",
    intro:
      "Drag-and-drop Gantt charts with smart predecessors, auto-rescheduling, and subcontractor confirmations — designed specifically for residential construction schedules.",
    sections: [
      { h2: "Predecessor Logic", body: "Set finish-to-start, start-to-start, and lag relationships. When one task moves, everything downstream reschedules automatically." },
      { h2: "Subcontractor Confirmations", body: "Subs get email notifications when they're scheduled and confirm with one click — no app required. Status colors show scheduled, confirmed, or declined at a glance." },
      { h2: "Templates & Copy", body: "Save schedule templates per project type and copy them to new projects in seconds." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/features/bid-management",
    file: "features/bid-management/index.html",
    title: "Bid Management Software for Home Builders | BuilderSuite ML",
    description:
      "Send bid packages, collect responses, compare quotes side-by-side, and convert winning bids into purchase orders.",
    ogImage: "/og/bid-management.jpg",
    h1: "Subcontractor Bid Management Made Simple",
    intro:
      "Send bid packages to multiple subcontractors, compare bids side-by-side, and convert the winning bid into a purchase order — all from one workflow.",
    sections: [
      { h2: "Send to Multiple Subs", body: "Build a bid package once and send it to every qualified subcontractor in your network. They respond directly from email — no account needed." },
      { h2: "Side-by-Side Comparison", body: "View every bid for a cost code in one comparison table. Pick the winner and award with confidence." },
      { h2: "Auto-Convert to Purchase Order", body: "When you award a bid, BuilderSuite creates the purchase order automatically, complete with line items and the agreed amounts." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/features/document-management",
    file: "features/document-management/index.html",
    title: "Construction Document & Photo Management | BuilderSuite ML",
    description:
      "Project files, photos, folders, and shareable links — organized per project and accessible to your team and trades.",
    ogImage: "/og/document-management.jpg",
    h1: "Plans, Files, and Photos in One Place",
    intro:
      "Centralize every project document — drawings, contracts, specs, warranties, and field photos — with folder-level access control and instant search.",
    sections: [
      { h2: "Centralized Project Files", body: "Every project gets a structured file system out of the box. Upload, organize, and find documents in seconds." },
      { h2: "Folder Access Control", body: "Lock sensitive folders to specific roles. Share individual files or whole folders with subs via secure links." },
      { h2: "Job Site Photos", body: "Field crews snap photos on mobile; they sync to the right project automatically and stay searchable forever." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/features/team-communication",
    file: "features/team-communication/index.html",
    title: "Team Communication for Construction Teams | BuilderSuite ML",
    description:
      "In-app chat for owners, employees, and trade partners. Keep every conversation tied to the project.",
    ogImage: "/og/team-communication.jpg",
    h1: "Keep Your Crew in Sync",
    intro:
      "Project-scoped chat, schedule notifications, and bid updates keep your office, field crews, and subcontractors aligned — without endless texting and email chains.",
    sections: [
      { h2: "Project Chat", body: "Every project has its own chat room. Messages stay attached to the project so context never gets lost when the team rotates." },
      { h2: "Schedule & Bid Alerts", body: "Subcontractors get an email when they're scheduled or invited to bid and can respond with one click — no app or login required." },
      { h2: "Issues & Punchlists", body: "Track issues by project with photos, assignees, and status — visible to everyone who needs to see them." },
    ],
    cta: { href: "/auth?tab=signup", label: "Get Started" },
  },
  {
    path: "/features/join-marketplace",
    file: "features/join-marketplace/index.html",
    title: "Join the BuilderSuite Marketplace | BuilderSuite ML",
    description:
      "Subcontractors, suppliers, and service providers — list your business so local home builders can find and hire you.",
    ogImage: "/og/join-marketplace.jpg",
    h1: "Get Found by Home Builders",
    intro:
      "Join the BuilderSuite Marketplace and put your subcontractor or supplier business in front of home builders actively looking for quality vendors in your area — free to list.",
    sections: [
      { h2: "Free Listing", body: "Get listed at no cost. Home builders using BuilderSuite can discover your business when they need subcontractors for their projects." },
      { h2: "Verified Profile", body: "Showcase insurance certificates, licenses, and portfolio so builders can verify your credentials instantly." },
      { h2: "Direct Connections", body: "Builders search the Marketplace and reach out directly — bid requests, schedule invitations, and project opportunities come right to your inbox." },
      { h2: "Zero Friction", body: "No apps to download. Respond to bid requests and schedule updates with one click from email." },
    ],
    cta: { href: "/auth/marketplace", label: "Join the Marketplace" },
  },
];

function buildJsonLd(route) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "BuilderSuite ML",
      url: SITE,
      logo: `${SITE}/og/home.jpg`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: route.title,
      url: `${SITE}${route.path}`,
      description: route.description,
      primaryImageOfPage: `${SITE}${route.ogImage}`,
    },
  ];
}

function buildHeadTags(route) {
  const url = `${SITE}${route.path}`;
  const img = `${SITE}${route.ogImage}`;
  const jsonLd = buildJsonLd(route);

  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeAttr(route.description)}" />`,
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
    `<meta property="og:title" content="${escapeAttr(route.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(route.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:image" content="${escapeAttr(img)}" />`,
    `<meta property="og:image:width" content="1216" />`,
    `<meta property="og:image:height" content="640" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(route.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(img)}" />`,
    ...jsonLd.map(
      (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`,
    ),
  ].join("\n    ");
}

function buildSeoBody(route) {
  const sections = route.sections
    .map(
      (s) =>
        `      <section><h2>${escapeHtml(s.h2)}</h2><p>${escapeHtml(s.body)}</p></section>`,
    )
    .join("\n");

  const navLinks = FOOTER_LINKS.map(
    (l) => `<a href="${escapeAttr(l.href)}">${escapeHtml(l.label)}</a>`,
  ).join(" · ");

  // Hidden from sighted users (display:none on root wrapper) but visible
  // to crawlers and non-JS social previewers. React's createRoot will
  // discard this entire subtree when the SPA mounts.
  return `<div id="root">
  <div style="display:none">
    <header>
      <a href="/"><strong>BuilderSuite ML</strong></a>
      <nav>${navLinks}</nav>
    </header>
    <main>
      <h1>${escapeHtml(route.h1)}</h1>
      <p>${escapeHtml(route.intro)}</p>
${sections}
      <p><a href="${escapeAttr(route.cta.href)}">${escapeHtml(route.cta.label)}</a></p>
    </main>
    <footer>
      <p>BuilderSuite ML — Construction management for home builders.</p>
      <nav>${navLinks}</nav>
    </footer>
  </div>
</div>`;
}

function rewriteHtml(template, route) {
  let html = template;

  // Replace <title>...</title> and everything between </title> and </head>
  // that came from the static index.html template, then re-inject our tags.
  // Strategy: find <head>...</head>, strip the SEO tags we manage, append fresh ones.
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (!headMatch) {
    throw new Error("dist/index.html has no <head> — cannot prerender");
  }
  let head = headMatch[1];

  // Strip tags we're going to replace (keep charset, viewport, favicon, author, JS imports, styles).
  head = head
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

  const newHead = `<head>${head.trimEnd()}\n    ${buildHeadTags(route)}\n  </head>`;
  html = html.replace(/<head>[\s\S]*?<\/head>/i, newHead);

  // Replace the empty <div id="root"></div> with our SEO body.
  html = html.replace(/<div\s+id=["']root["'][^>]*>\s*<\/div>/i, buildSeoBody(route));

  return html;
}

function main() {
  const templatePath = resolve(DIST_DIR, "index.html");
  if (!existsSync(templatePath)) {
    console.warn(`[prerender] dist/index.html not found — skipping (build did not run?)`);
    return;
  }
  const template = readFileSync(templatePath, "utf8");

  let count = 0;
  for (const route of ROUTES) {
    const outPath = resolve(DIST_DIR, route.file);
    mkdirSync(dirname(outPath), { recursive: true });
    const html = rewriteHtml(template, route);
    writeFileSync(outPath, html, "utf8");
    count++;
    console.log(`[prerender] wrote ${route.file} (${route.path})`);
  }
  console.log(`[prerender] done — ${count} marketing pages prerendered.`);
}

main();

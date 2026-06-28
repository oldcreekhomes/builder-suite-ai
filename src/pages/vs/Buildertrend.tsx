import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SeoHead } from "@/components/SeoHead";
import { ArrowRight, Check, X, HardHat, Handshake } from "lucide-react";

/**
 * SEO comparison landing page targeting "buildertrend alternatives"
 * and "buildertrend vs competitors". Angle: Built by Builders + native
 * double-entry accounting vs. sync-heavy competitor model.
 */
const VsBuildertrend = () => {
  const navigate = useNavigate();
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  const comparisonRows: Array<{
    feature: string;
    bsml: boolean | string;
    bt: boolean | string;
    note?: string;
  }> = [
    {
      feature: "Built-in double-entry accounting (no QuickBooks sync)",
      bsml: true,
      bt: false,
      note: "Bills, checks, deposits, reconciliation, GL — all native.",
    },
    {
      feature: "Built by working home builders",
      bsml: true,
      bt: false,
    },
    {
      feature: "AI bill capture with cost-code learning",
      bsml: true,
      bt: "Limited",
    },
    {
      feature: "Smart Gantt scheduling with one-click sub confirmations",
      bsml: true,
      bt: true,
    },
    {
      feature: "Bid management → auto-convert to purchase order",
      bsml: true,
      bt: true,
    },
    {
      feature: "Subcontractor marketplace included",
      bsml: true,
      bt: false,
    },
    {
      feature: "No per-project or per-user accounting add-on fees",
      bsml: true,
      bt: false,
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "BuilderSuite ML vs. Buildertrend",
      url: "https://buildersuiteml.com/vs/buildertrend",
      description:
        "Compare BuilderSuite ML and Buildertrend for home builders: accounting, scheduling, bid management, AI bill capture, and pricing.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What are the best Buildertrend alternatives for home builders?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BuilderSuite ML is a leading Buildertrend alternative built specifically for home builders. It bundles construction accounting, AI bill capture, Gantt scheduling, bid management, and a subcontractor marketplace into one platform — without requiring a separate QuickBooks sync.",
          },
        },
        {
          "@type": "Question",
          name: "Does BuilderSuite ML replace QuickBooks like Buildertrend does?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BuilderSuite ML includes full double-entry construction accounting — A/P, A/R, banking, reconciliation, job costing, balance sheet and P&L reports — so you don't need QuickBooks or a sync. Buildertrend pushes financial data to QuickBooks, which adds another tool, another subscription, and another point of failure.",
          },
        },
        {
          "@type": "Question",
          name: "How is BuilderSuite ML different from Buildertrend?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "BuilderSuite ML was built by working home builders, includes native double-entry accounting, AI-powered bill capture that learns your cost codes, and a built-in subcontractor marketplace — all in one platform with no add-on accounting fees.",
          },
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen w-full bg-background">
      <SeoHead
        title="BuilderSuite ML vs. Buildertrend — Best Buildertrend Alternative for Home Builders"
        description="Compare BuilderSuite ML vs. Buildertrend: native double-entry accounting, AI bill capture, and a subcontractor marketplace — built by working home builders."
        path="/vs/buildertrend"
        jsonLd={jsonLd}
      />

      <PublicHeader onGetStartedClick={() => setIsPathModalOpen(true)} />

      <Dialog open={isPathModalOpen} onOpenChange={setIsPathModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-center text-2xl font-bold">
            Which best describes you?
          </DialogTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate("/auth?tab=signup")}
            >
              <CardHeader className="text-center pb-2">
                <HardHat className="h-10 w-10 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">I'm a Home Builder</CardTitle>
                <CardDescription>General Contractor or Remodel Contractor</CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate("/auth/marketplace")}
            >
              <CardHeader className="text-center pb-2">
                <Handshake className="h-10 w-10 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">I'm a Subcontractor</CardTitle>
                <CardDescription>Vendor, Supplier, or Service Provider</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-muted to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-sm font-semibold tracking-widest uppercase text-primary">
            Buildertrend Alternative
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            BuilderSuite ML vs. Buildertrend
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Looking for a Buildertrend alternative? BuilderSuite ML is the all-in-one construction
            management platform built by working home builders — with native double-entry accounting,
            AI bill capture, and a subcontractor marketplace included.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button size="lg" className="text-lg px-8" onClick={() => setIsPathModalOpen(true)}>
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8"
              onClick={() => navigate("/about")}
            >
              Our Philosophy
            </Button>
          </div>
        </div>
      </section>

      {/* Built by Builders */}
      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Built by Builders, Not Sold to Them</h2>
          <p className="text-lg text-muted-foreground mb-4">
            Buildertrend was built by software people studying what builders do. BuilderSuite ML was
            built by working home builders solving problems we hit on our own jobs — then turned into
            software when no existing tool could keep up.
          </p>
          <p className="text-lg text-muted-foreground">
            That's why every workflow — from bid packages, to scheduling subs, to closing the books —
            matches how home builders actually work. No software-vendor guesswork, no features that
            look good in a demo but break in the field.
          </p>
        </div>
      </section>

      {/* Accounting */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Native Accounting vs. QuickBooks Sync
          </h2>
          <p className="text-lg text-muted-foreground mb-4">
            Buildertrend's financial story relies on syncing to QuickBooks. That means a second
            subscription, a second login, and a sync that drifts, double-posts, or breaks at month-end
            close — right when you need clean books most.
          </p>
          <p className="text-lg text-muted-foreground">
            BuilderSuite ML has full <strong>double-entry construction accounting built in</strong>:
            A/P, A/R, banking, bank reconciliation, job costing, closing periods, and audit-ready
            Balance Sheet, P&amp;L, and A/P Aging reports. Every transaction is tied directly to a
            project and cost code. No sync, no drift, no extra subscription.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            BuilderSuite ML vs. Buildertrend at a Glance
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">BuilderSuite ML</th>
                      <th className="text-center p-4 font-semibold">Buildertrend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.feature} className="border-b last:border-b-0">
                        <td className="p-4">
                          <div className="font-medium">{row.feature}</div>
                          {row.note && (
                            <div className="text-sm text-muted-foreground mt-1">{row.note}</div>
                          )}
                        </td>
                        <td className="text-center p-4">
                          {typeof row.bsml === "boolean" ? (
                            row.bsml ? (
                              <Check className="h-5 w-5 text-primary mx-auto" aria-label="Yes" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" aria-label="No" />
                            )
                          ) : (
                            <span className="text-sm">{row.bsml}</span>
                          )}
                        </td>
                        <td className="text-center p-4">
                          {typeof row.bt === "boolean" ? (
                            row.bt ? (
                              <Check className="h-5 w-5 text-primary mx-auto" aria-label="Yes" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" aria-label="No" />
                            )
                          ) : (
                            <span className="text-sm">{row.bt}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Comparison based on publicly available Buildertrend product documentation as of 2026.
            Buildertrend's feature set may change.
          </p>
        </div>
      </section>

      {/* Who Should Switch */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Who Switches from Buildertrend to BuilderSuite ML?
          </h2>
          <ul className="space-y-3 text-lg text-muted-foreground">
            <li className="flex gap-3">
              <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <span>
                <strong className="text-foreground">Home builders tired of QuickBooks sync errors</strong> —
                close the books from inside one system, not two.
              </span>
            </li>
            <li className="flex gap-3">
              <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <span>
                <strong className="text-foreground">Builders drowning in paper bills</strong> — drag
                hundreds of vendor invoices into BuilderSuite at once and let AI extract amounts,
                cost codes, and match purchase orders.
              </span>
            </li>
            <li className="flex gap-3">
              <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <span>
                <strong className="text-foreground">Teams paying for add-ons just to get basics</strong> —
                no per-project accounting fee, no per-feature gate, no surprise upcharge.
              </span>
            </li>
            <li className="flex gap-3">
              <Check className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <span>
                <strong className="text-foreground">Builders who need real subcontractors</strong> —
                the built-in marketplace puts vetted subs in front of you without a separate vendor
                portal.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Try the Built-by-Builders Alternative
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get started with BuilderSuite ML — manage your first three projects free, with full
            access to scheduling, bidding, and built-in accounting.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            onClick={() => setIsPathModalOpen(true)}
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
};

export default VsBuildertrend;

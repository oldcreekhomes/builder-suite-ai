import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SeoHead } from "@/components/SeoHead";
import {
  ArrowRight,
  HardHat,
  Handshake,
  FolderKanban,
  Calculator,
  FileText,
  CalendarRange,
  Gavel,
  ShoppingCart,
  FolderOpen,
  MessagesSquare,
  Store,
  BarChart3,
  Users,
  Building2,
  Check,
} from "lucide-react";

const modules = [
  { icon: FolderKanban, name: "Projects, Budgets & Job Costing", desc: "Track every project with cent-precise budgets and job costing." },
  { icon: Calculator, name: "Construction Accounting", desc: "Double-entry A/P, A/R, banking, reconciliation, and reports." },
  { icon: FileText, name: "AI Bill Management", desc: "Bulk PDF upload, AI extraction, and automatic PO matching." },
  { icon: CalendarRange, name: "Smart Gantt Scheduling", desc: "Predecessors, sub confirmations, and reusable templates." },
  { icon: Gavel, name: "Bid Management", desc: "Send packages, compare bids side-by-side, auto-convert to POs." },
  { icon: ShoppingCart, name: "Purchase Orders & Vendors", desc: "Issue, track, and reconcile POs against bills automatically." },
  { icon: FolderOpen, name: "Document & Photo Management", desc: "Project files, plans, and field photos with folder access control." },
  { icon: MessagesSquare, name: "Team & Sub Communication", desc: "Project-scoped chat and email notifications for trades." },
  { icon: Store, name: "Subcontractor Marketplace", desc: "Built-in marketplace to find and connect with local subs." },
  { icon: BarChart3, name: "Reports & Dashboards", desc: "Balance Sheet, P&L, A/P aging, and project-scoped reports." },
  { icon: Users, name: "Multi-user Permissions", desc: "Role-based access for owners, employees, and trade partners." },
  { icon: Building2, name: "Apartments / Rentals", desc: "Manage rental properties and operating expenses in one place." },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  return (
    <main className="min-h-screen w-full bg-background">
      <SeoHead
        title="Pricing — Free for 3 Projects, then $39 / User / Month | BuilderSuite ML"
        description="Start free with up to 3 projects. Scale to unlimited at $39 per user / month. Full access to every BuilderSuite ML module on both plans."
        path="/pricing"
      />

      <PublicHeader onGetStartedClick={() => setIsPathModalOpen(true)} />

      {/* Path Selection Modal */}
      <Dialog open={isPathModalOpen} onOpenChange={setIsPathModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-center text-2xl font-bold">
            Which best describes you?
          </DialogTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate('/auth?tab=signup')}
            >
              <CardHeader className="text-center pb-2">
                <HardHat className="h-10 w-10 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">I'm a Home Builder</CardTitle>
                <CardDescription>General Contractor or Remodel Contractor</CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate('/auth/marketplace')}
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

      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-muted to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Simple, Honest Pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free with up to 3 projects. Scale to unlimited at $39 per user / month.
          </p>
        </div>
      </section>

      {/* Pricing Cards — Free + Pro */}
      <section className="pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <Card className="flex flex-col border-border">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription>Try the whole system</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-muted-foreground text-center mb-8 flex-1">
                  Up to 3 projects. Full access to every module. No credit card required.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsPathModalOpen(true)}
                >
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative flex flex-col border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Pro</CardTitle>
                <CardDescription>For active home builders</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">$39</span>
                  <span className="text-muted-foreground ml-1">/user/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-muted-foreground text-center mb-8 flex-1">
                  Unlimited projects. Everything in Free. Priority support.
                </p>
                <Button
                  className="w-full"
                  onClick={() => setIsPathModalOpen(true)}
                >
                  Start Pro Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Modules — everything included on both plans */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything Included on Both Plans
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No locked features. Free and Pro both get every BuilderSuite ML module — the only difference is project count.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map(({ icon: Icon, name, desc }) => (
              <Card key={name} className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center mb-10">
            {[
              "Cancel anytime",
              "No setup fees",
              "Free onboarding help",
            ].map((t) => (
              <div key={t} className="flex items-center justify-center gap-2 text-muted-foreground">
                <Check className="h-5 w-5 text-primary" />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button size="lg" onClick={() => setIsPathModalOpen(true)}>
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
};

export default Pricing;

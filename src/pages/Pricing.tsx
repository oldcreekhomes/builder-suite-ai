import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SeoHead } from "@/components/SeoHead";
import { Check, ArrowRight, HardHat, Handshake } from "lucide-react";

const pricingPlans = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small builders",
    features: [
      "Up to 5 active projects",
      "Photo management",
      "Basic scheduling",
      "Document storage",
      "Email support"
    ],
    cta: "Start Free Trial",
    highlighted: false
  },
  {
    name: "Professional",
    price: "$249",
    period: "/month",
    description: "For growing construction companies",
    features: [
      "Unlimited projects",
      "QuickBooks integration",
      "Bid tracking & management",
      "AI-powered estimating",
      "Advanced reporting",
      "Priority support"
    ],
    cta: "Start Free Trial",
    highlighted: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced security",
      "Training & onboarding",
      "SLA guarantee"
    ],
    cta: "Contact Sales",
    highlighted: false
  }
];

const Pricing = () => {
  const navigate = useNavigate();
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  return (
    <main className="min-h-screen w-full bg-background">
      <SeoHead
        title="Pricing | BuilderSuite ML"
        description="Simple, transparent pricing for home builders. Starter at $99/mo, Professional at $249/mo, and custom Enterprise plans."
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
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. No hidden fees, no per-user charges.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-primary shadow-lg scale-105 z-10"
                    : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                    onClick={() => {
                      if (plan.name === "Enterprise") {
                        navigate("/");
                      } else {
                        setIsPathModalOpen(true);
                      }
                    }}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / Trust Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Questions?
          </h2>
          <p className="text-muted-foreground mb-8">
            All plans include a free trial. No credit card required to get started.
          </p>
          <Button
            size="lg"
            onClick={() => setIsPathModalOpen(true)}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
};

export default Pricing;

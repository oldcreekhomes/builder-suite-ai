import { useState } from "react";

import { FeatureRow } from "@/components/FeatureRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Users, 
  FileText, 
  Calendar, 
  CheckCircle, 
  Star, 
  Camera, 
  Calculator, 
  Gavel, 
  BarChart3, 
  CreditCard, 
  Shield, 
  Play,
  ArrowRight,
  Check,
  HardHat,
  Handshake
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Landing = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    // Simulate submission - in production this would save to Supabase
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "You're on the list!",
      description: "We'll notify you when we have updates.",
    });
    setEmail("");
    setIsSubmitting(false);
  };

  const features = [
    {
      icon: Building2,
      title: "Project Management",
      description: "Centralized dashboard for all your construction projects with real-time updates and progress tracking.",
      color: "text-blue-600"
    },
    {
      icon: CreditCard,
      title: "QuickBooks Integration",
      description: "Seamless two-way sync with QuickBooks for effortless accounting and financial management.",
      color: "text-green-600"
    },
    {
      icon: Camera,
      title: "Photo Management",
      description: "AI-powered photo organization with automatic tagging, easy sharing, and client access.",
      color: "text-purple-600"
    },
    {
      icon: Gavel,
      title: "Bid Tracking",
      description: "Send, track, and manage subcontractor bids all in one centralized and organized place.",
      color: "text-orange-600"
    },
    {
      icon: Calendar,
      title: "Gantt Scheduling",
      description: "Visual project timelines with intuitive drag-and-drop scheduling and milestone tracking.",
      color: "text-pink-600"
    },
    {
      icon: Calculator,
      title: "Estimating AI",
      description: "AI-assisted cost estimation from plans, historical data, and industry benchmarks.",
      color: "text-cyan-600"
    },
    {
      icon: FileText,
      title: "Document Management",
      description: "Secure file storage with version control, easy access, and organized project folders.",
      color: "text-indigo-600"
    },
    {
      icon: BarChart3,
      title: "Multi-Dashboard Views",
      description: "Tailored views for owners, project managers, accountants, and team members.",
      color: "text-amber-600"
    }
  ];

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

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-foreground tracking-tight">BuilderSuite</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth?tab=signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 pb-8 bg-gradient-to-b from-muted to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight text-center">
              Construction Management Software <span className="text-primary">Built by Builders</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-4xl mx-auto">
              We didn't want to build software—we had to. Every tool out there is built by Silicon Valley tech engineers who don't understand construction.
            </p>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              So we built our own.
            </p>
          </div>
        </div>
      </section>

      {/* Who Are You? Section - Two Paths */}
      <section className="pt-8 pb-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Who Are You?
            </h2>
            <p className="text-xl text-muted-foreground">
              BuilderSuite serves two types of businesses. Choose your path.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Home Builder Path */}
            <Card className="relative overflow-hidden border-2 hover:border-primary transition-colors cursor-pointer group">
              <Link to="/auth?tab=signup" className="block">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <HardHat className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">I'm a Home Builder</CardTitle>
                  <CardDescription className="text-base">General Contractor or Remodel Contractor</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-6">
                    I want to manage my projects, budgets, schedules, and accounting all in one place.
                  </p>
                  <Button size="lg" className="w-full">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Link>
            </Card>

            {/* Marketplace Vendor Path */}
            <Card className="relative overflow-hidden border-2 hover:border-primary transition-colors cursor-pointer group">
              <Link to="/auth/marketplace" className="block">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Handshake className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">I'm a Subcontractor</CardTitle>
                  <CardDescription className="text-base">Vendor, Supplier, or Service Provider</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-6">
                    I want Home Builders to find me in the BuilderSuite Marketplace directory.
                  </p>
                  <Button size="lg" variant="outline" className="w-full">
                    Join Marketplace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Founder's Message Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Photo + Name */}
            <div className="space-y-8">
              <img 
                src="https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/avatars/2653aba8-d154-4301-99bf-77d559492e19/avatar.png" 
                alt="Matt Gray"
                className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover"
              />
              <span className="block text-sm font-semibold tracking-widest uppercase text-muted-foreground">
                Matt Gray
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Founder, Old Creek Homes, LLC
              </h2>
            </div>
            
            {/* Right Column - Quote */}
            <div>
              <div className="space-y-4">
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed italic">
                  "We didn't want to build software — we had no choice.
                </p>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed italic">
                  We needed an application that had accounting, historical cost tracking, chat, budgets, invoice automation and much more.
                </p>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed italic">
                  Instead of asking someone else to build us a Home Builder application, we built our own."
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="ACCOUNTING"
        title="Streamlined Financial Management"
        description="No more QuickBooks. No more integration headaches. Accounting is built right into BuilderSuite, keeping everything consolidated in one system."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/accounting-bills-preview.png"
        imageAlt="BuilderSuite Accounting Dashboard"
        reversed={true}
        className="bg-background"
        expandableImage={true}
      />

      <FeatureRow
        label="AI BILL MANAGEMENT"
        title="Categorize Bills Using AI"
        description="Say goodbye to hours of manual data entry. Scan hundreds of bills at once and let AI extract all the data within seconds. Review the extracted information, verify assigned cost codes, and route everything for approval—all in a fraction of the time."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/ai-bill-management-preview.png"
        imageAlt="BuilderSuite Bill Management"
        className="bg-muted/30"
        expandableImage={true}
      />

      <FeatureRow
        label="BID MANAGEMENT"
        title="Automate Your Bid Process"
        description="Create bid packages in a fraction of the time. BuilderSuite automatically tracks responses, finds subcontractors who haven't submitted bids, and sends reminders for you—no manual follow-up required."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/bid-management-preview.png"
        imageAlt="BuilderSuite Bid Management"
        reversed={true}
        className="bg-background"
        expandableImage={true}
      />

      <FeatureRow
        label="DOCUMENT MANAGEMENT"
        title="All Your Files, One Central Hub"
        description="No more Google Drive. No more Dropbox. Store, organize, and share project documents directly within BuilderSuite. Your team can access everything they need—plans, contracts, change orders—without juggling multiple platforms or worrying about version control."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/document-management-preview.png"
        imageAlt="BuilderSuite Document Management"
        className="bg-muted/30"
        expandableImage={true}
      />

      <FeatureRow
        label="SMART GANTT SCHEDULING"
        title="Schedules that Communicate"
        description="No more phone tag with subcontractors. BuilderSuite's Gantt scheduling automatically sends schedule updates via email. Subcontractors confirm or decline their availability with a single click, and the chart updates in real-time with color-coded status indicators—green for confirmed, blue for pending, and red for a known issue. Always know who's ready to work at a glance."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/gantt-schedule-preview.png"
        imageAlt="BuilderSuite Gantt Scheduling with Color-Coded Status"
        reversed={true}
        className="bg-background"
        expandableImage={true}
      />

      <FeatureRow
        label="TEAM COMMUNICATION"
        title="All Your Conversations in One Place"
        description="No more Slack. No more Basecamp. No more Microsoft Teams. Keep all project communication directly in BuilderSuite. Message team members, share files, and coordinate efficiently—without switching between apps or losing important conversations in scattered threads."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/team-communication-forecast-messages.png"
        imageAlt="BuilderSuite Team Communication"
        className="bg-muted/30"
        expandableImage={true}
      />

      {/* Social Proof Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Software for Builders. Built by Builders.
            </h2>
            <p className="text-xl text-muted-foreground">
              We're just getting started, but here are some stats.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">100+</p>
              <p className="text-muted-foreground">Lots Managed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">$100M+</p>
              <p className="text-muted-foreground">Tracked in Budgets</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">10K+</p>
              <p className="text-muted-foreground">Photos Organized</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">99.9%</p>
              <p className="text-muted-foreground">Uptime</p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="flex justify-center">
            <Card className="p-6 border-border max-w-3xl">
              <p className="text-muted-foreground mb-4">
                ""We tried them all: CoConstruct, JobTread, BuilderTrend, BuildTools and everybody in between. None of these companies even understood how critical accounting was to a builder being successful.<br /><br />They also have a mentality of "set it and forget it" meaning there are no updates in the system. If there is a software glitch, good luck getting it fixed! I've waited years with one company just to fix a setting. It's still broken 2 years later.<br /><br />That's why we started BuilderSuite.""
              </p>
              <div className="flex items-center">
                <img 
                  src="https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/avatars/2653aba8-d154-4301-99bf-77d559492e19/avatar.png"
                  alt="Matt Gray"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="font-semibold text-foreground">Matt Gray</p>
                  <p className="text-sm text-muted-foreground">Old Creek Homes</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section - Hidden */}
      {/* <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, scale as you grow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-6 relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth?tab=signup" className="block">
                    <Button 
                      className="w-full" 
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* Benefits & CTA Section - Hidden */}
      {/* <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Choose BuilderSuite?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Designed for Builders</h3>
                    <p className="text-muted-foreground">Built specifically for construction workflows and processes</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">AI-Powered Insights</h3>
                    <p className="text-muted-foreground">Smart automation and insights to improve project efficiency</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Easy to Use</h3>
                    <p className="text-muted-foreground">Intuitive interface that your team will actually want to use</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">Secure & Reliable</h3>
                    <p className="text-muted-foreground">Enterprise-grade security to protect your project data</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-lg border border-border">
              <div className="text-center mb-6">
                <Star className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-foreground">Stay Updated</h3>
                <p className="text-muted-foreground mt-2">
                  Join our waitlist to get early access and updates
                </p>
              </div>
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Joining..." : "Join Waitlist"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                We respect your privacy. Unsubscribe at any time.
              </p>
              <div className="border-t border-border mt-6 pt-6">
                <Link to="/auth" className="w-full block">
                  <Button variant="outline" size="lg" className="w-full">
                    Start Your Free Trial Now
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  No credit card required • 14-day free trial
                </p>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Trust Signals */}
      <section className="py-12 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Bank-Level Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">99.9% Uptime SLA</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">GDPR Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg font-bold text-foreground">BuilderSuite</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Software for Builders. Built by Builders.
            </p>
            <p className="text-sm text-muted-foreground">
              © 2026 BuilderSuite AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

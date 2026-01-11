import { useState } from "react";
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
  Check
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-foreground">BuilderSuite AI</span>
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
      <section className="py-20 bg-gradient-to-b from-muted/50 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 tracking-tight text-center">
              Construction Management Software
              <span className="text-primary block mt-2">Built by a Home Builder</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              We didn't want to build software—we had to. Every tool out there is built by a silicon valley tech engineer who doesn't understand our industry.
            </p>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              So we built our own and sharing it with you...
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="px-8 py-6 text-lg">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Product Screenshot Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 md:p-12">
              <div className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-sm text-muted-foreground ml-4">BuilderSuite AI Dashboard</span>
                </div>
                <div className="aspect-video overflow-hidden">
                  <img 
                    src="/dashboard-preview.png" 
                    alt="BuilderSuite AI Dashboard showing project management, insurance alerts, accounting, weather forecast, and recent photos"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Build Better
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed specifically for construction professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow border-border">
                <CardHeader className="pb-2">
                  <feature.icon className={`h-12 w-12 ${feature.color} mx-auto mb-4`} />
                  <CardTitle className="text-lg whitespace-nowrap">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground line-clamp-3 min-h-[4.5rem]">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Builders Nationwide
            </h2>
            <p className="text-xl text-muted-foreground">
              Join hundreds of construction companies streamlining their operations
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">500+</p>
              <p className="text-muted-foreground">Projects Managed</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">$50M+</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 border-border">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                "BuilderSuite AI has transformed how we manage our projects. The QuickBooks integration alone saves us hours every week."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-foreground">Mike Johnson</p>
                  <p className="text-sm text-muted-foreground">Johnson Custom Homes</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                "The photo management feature is incredible. Our clients love being able to see progress photos organized by date and room."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-foreground">Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">Modern Living Builders</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                "Finally, a construction management tool that understands how builders actually work. The bid tracking is a game changer."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-foreground">David Martinez</p>
                  <p className="text-sm text-muted-foreground">Premier Construction Co.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-background">
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
      </section>

      {/* Benefits & CTA Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Choose BuilderSuite AI?
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
      </section>

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
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="ml-2 text-lg font-bold text-foreground">BuilderSuite AI</span>
              </div>
              <p className="text-muted-foreground">
                The complete construction management platform for modern builders.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 BuilderSuite AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

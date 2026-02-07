import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { 
  Building2, 
  ArrowRight,
  HardHat,
  Handshake,
  Zap,
  Target,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  Clock,
  Users,
  Wrench
} from "lucide-react";

const AboutUs = () => {
  const navigate = useNavigate();
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-foreground tracking-tight">BuilderSuite</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/">
                <Button variant="ghost">Home</Button>
              </Link>
              <Button onClick={() => setIsPathModalOpen(true)}>Get Started</Button>
            </div>
          </div>
        </div>
      </header>

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Headline */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Built by Builders. <span className="text-primary">For Builders.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              We didn't set out to build software. We had no choice.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12 md:mb-16">
            <div className="text-center p-4 md:p-6 rounded-xl bg-card border border-border">
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary">2018</p>
              <p className="text-sm md:text-base text-muted-foreground mt-1">Founded</p>
            </div>
            <div className="text-center p-4 md:p-6 rounded-xl bg-card border border-border">
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary">$100M+</p>
              <p className="text-sm md:text-base text-muted-foreground mt-1">In Pipeline</p>
            </div>
            <div className="text-center p-4 md:p-6 rounded-xl bg-card border border-border">
              <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary">&lt;8 Years</p>
              <p className="text-sm md:text-base text-muted-foreground mt-1">of Growth</p>
            </div>
          </div>

          {/* Origin Story */}
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-lg max-w-none text-center">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                In 2018, Matt Gray started Old Creek Homes, LLC with nothing but Excel spreadsheets, QuickBooks, and a small pocket of change.
              </p>
              <p className="text-xl md:text-2xl font-medium text-foreground mb-6">
                One home became two. Two became four. Four became eight.
              </p>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                Today, we have over <strong className="text-foreground">$100 million</strong> of homes in the pipeline—in less than eight years. We needed software that could keep up with us. We couldn't wait for a software company to build features while we continued to grow exponentially.
              </p>
              <p className="text-xl md:text-2xl font-semibold text-primary">
                So we built it ourselves.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Growth Timeline Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold tracking-widest uppercase text-primary mb-4 block">
              Our Journey
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              From Excel to $100M+
            </h2>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Desktop horizontal line */}
            <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-border" />
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4">
              {/* 2018 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center z-10">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <div className="mt-4">
                  <p className="font-bold text-foreground">2018</p>
                  <p className="text-sm text-muted-foreground mt-1">Started with Excel & QuickBooks</p>
                </div>
              </div>

              {/* Growth */}
              <div className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center z-10">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <div className="mt-4">
                  <p className="font-bold text-foreground">Growth</p>
                  <p className="text-sm text-muted-foreground mt-1">1→2→4→8 homes exponentially</p>
                </div>
              </div>

              {/* Challenge */}
              <div className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center z-10">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <div className="mt-4">
                  <p className="font-bold text-foreground">Challenge</p>
                  <p className="text-sm text-muted-foreground mt-1">Existing software couldn't keep pace</p>
                </div>
              </div>

              {/* Solution */}
              <div className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center z-10">
                  <Wrench className="h-7 w-7 text-primary" />
                </div>
                <div className="mt-4">
                  <p className="font-bold text-foreground">Solution</p>
                  <p className="text-sm text-muted-foreground mt-1">Built BuilderSuite from scratch</p>
                </div>
              </div>

              {/* Today */}
              <div className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary border-4 border-background shadow-lg flex items-center justify-center z-10">
                  <CheckCircle className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="mt-4">
                  <p className="font-bold text-foreground">Today</p>
                  <p className="text-sm text-muted-foreground mt-1">$100M+ pipeline & growing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-semibold tracking-widest uppercase text-primary mb-4 block">
            Our Vision
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            As Old Creek Homes Grows, BuilderSuite Grows With It
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6 max-w-3xl mx-auto">
            Our vision is simple: we continue to develop features that help us innovate, streamline operations, maximize output, and reduce human error.
          </p>
          <p className="text-lg md:text-xl font-medium text-foreground">
            Every improvement we make for ourselves, we share with you.
          </p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Problem Nobody Understood
            </h2>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              We tried every construction management platform on the market. <strong className="text-foreground">CoConstruct</strong>. <strong className="text-foreground">JobTread</strong>. <strong className="text-foreground">BuilderTrend</strong>. <strong className="text-foreground">BuildTools</strong>. And everyone in between.
            </p>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              The problem? They were all built by tech companies that had never managed a construction project. They didn't understand why <strong className="text-foreground">accounting needs to be at the core</strong>, not bolted on as an afterthought. They didn't understand why a schedule that doesn't communicate with subcontractors is useless. They didn't understand that when there's a bug, <strong className="text-foreground">waiting 2 years for a fix isn't acceptable</strong>.
            </p>

            <div className="bg-muted/50 rounded-xl p-8 my-8 border border-border">
              <p className="text-xl text-foreground font-medium italic text-center">
                "Every software company said the same thing: 'That's a great idea, we'll add it to the roadmap.' Years later, nothing changed. So we stopped waiting for someone else to build what we needed. We built it ourselves."
              </p>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed">
              Most construction software is designed by Silicon Valley engineers who have never set foot on a job site. They don't know the frustration of reconciling bills at midnight, chasing down subcontractors for schedule confirmations, or explaining to a client why the budget report doesn't match the actual costs. <strong className="text-foreground">We do.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-semibold tracking-widest uppercase text-primary mb-4 block">
                Our Story
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                From Frustration to Innovation
              </h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  Old Creek Homes, LLC isn't just the company that uses BuilderSuite—it's the company that <strong className="text-foreground">built</strong> BuilderSuite. Every feature, every workflow, every button placement comes from real-world experience managing actual construction projects.
                </p>
                <p>
                  When we couldn't find software that understood how builders actually work, we made a decision: instead of continuing to adapt our business to broken software, we would build software that adapts to how builders actually operate.
                </p>
                <p>
                  BuilderSuite was born on the job site, not in a conference room.
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Clock className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Years of Frustration</h3>
                      <p className="text-muted-foreground">We spent years using software that promised everything and delivered frustration. Every platform had the same problems: disconnected accounting, schedules that didn't communicate, and support teams that didn't understand construction.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Wrench className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Built From the Ground Up</h3>
                      <p className="text-muted-foreground">We didn't fork existing software or hire outside developers who didn't understand construction. We built BuilderSuite from scratch, with accounting at the core and real workflows driving every decision.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Users className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Real Daily Use</h3>
                      <p className="text-muted-foreground">Today, BuilderSuite manages every project at Old Creek Homes. We track millions in budgets, coordinate dozens of subcontractors, and process thousands of bills—all on the same software we're offering to you.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* The Old Creek Homes Difference */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Old Creek Homes Difference
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              This isn't theoretical software built in a vacuum. It's battle-tested every single day.
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 md:p-12 border border-primary/20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <img 
                  src="https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/avatars/2653aba8-d154-4301-99bf-77d559492e19/avatar.png" 
                  alt="Matt Gray, Founder of Old Creek Homes"
                  className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-xl"
                />
              </div>
              <div>
                <p className="text-lg text-muted-foreground mb-4">
                  "BuilderSuite is used every single day by Old Creek Homes, LLC, on real construction projects with real budgets and real deadlines. When we find an issue on the job site, it gets fixed in the software—usually the same day. When we discover a better workflow, it gets added. This is the fundamental difference between BuilderSuite and every other platform: <strong className="text-foreground">we actually use what we build.</strong>"
                </p>
                <div>
                  <p className="font-semibold text-foreground">Matt Gray</p>
                  <p className="text-muted-foreground">Founder, Old Creek Homes, LLC</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">Daily</p>
              <p className="text-muted-foreground">Active Use</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">Same Day</p>
              <p className="text-muted-foreground">Bug Fixes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">100+</p>
              <p className="text-muted-foreground">Projects Managed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">$100M+</p>
              <p className="text-muted-foreground">In Budgets Tracked</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Philosophy Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Philosophy
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We believe construction software should work the way builders actually work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-card">
              <CardContent className="pt-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Builder-First Design</h3>
                    <p className="text-muted-foreground">
                      Every feature starts with one question: "How would this work on the job site?" If it doesn't make sense for a builder in the field, it doesn't ship. We don't add features to check boxes—we add features that solve real problems.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="pt-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Continuous Improvement</h3>
                    <p className="text-muted-foreground">
                      We update BuilderSuite constantly, not annually. When we find an issue, it gets fixed in days—not years. Our "roadmap" isn't a graveyard of good ideas; it's a living document that actually gets executed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="pt-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Real-World Testing</h3>
                    <p className="text-muted-foreground">
                      If it doesn't work for Old Creek Homes, it doesn't ship. Every feature is tested on actual construction projects before it reaches you. We're not experimenting on our customers—we're experimenting on ourselves.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="pt-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Honest Communication</h3>
                    <p className="text-muted-foreground">
                      When something breaks, we tell you. When it's fixed, you know. No corporate speak, no ticket numbers that disappear into the void. We respond to feedback because we're builders too, and we know how frustrating it is to be ignored.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why We're Different Section */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why We're Different
            </h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 rounded-xl bg-muted/30 border border-border">
              <Zap className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Accounting at the Core</h3>
                <p className="text-muted-foreground">
                  Other platforms treat accounting as an integration. We built it in from day one. Your budget, your bills, your P&L—everything flows through a unified system designed for how builders actually manage money.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-xl bg-muted/30 border border-border">
              <Zap className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Schedules That Communicate</h3>
                <p className="text-muted-foreground">
                  Our Gantt scheduling doesn't just create pretty charts. It automatically emails subcontractors, tracks their confirmations, and shows you at a glance who's ready and who isn't. No more phone tag.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-xl bg-muted/30 border border-border">
              <Zap className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">AI That Actually Helps</h3>
                <p className="text-muted-foreground">
                  Our AI features aren't gimmicks. Scan hundreds of bills and let AI extract the data and suggest cost codes in seconds. We use AI to eliminate busywork, not to create marketing buzzwords.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 rounded-xl bg-muted/30 border border-border">
              <Zap className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No More Software Juggling</h3>
                <p className="text-muted-foreground">
                  No more QuickBooks. No more Google Drive. No more Slack. No more Dropbox. BuilderSuite consolidates your entire operation into one platform—accounting, files, photos, schedules, bids, and communication.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Founder Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet the Founder
            </h2>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 bg-gradient-to-br from-primary/20 to-primary/10 p-8 flex items-center justify-center">
                <img 
                  src="https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/avatars/2653aba8-d154-4301-99bf-77d559492e19/avatar.png" 
                  alt="Matt Gray"
                  className="w-40 h-40 rounded-full object-cover border-4 border-background shadow-xl"
                />
              </div>
              <div className="md:w-2/3 p-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">Matt Gray</h3>
                <p className="text-primary font-medium mb-4">Founder & CEO</p>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Matt Gray is the founder of both Old Creek Homes, LLC and BuilderSuite. He's been in the construction industry for years, managing custom home builds and remodels throughout the region.
                  </p>
                  <p>
                    After years of frustration with construction software that promised everything and delivered headaches, Matt decided to build the platform he always wished existed. Today, he uses BuilderSuite every day to manage his own construction projects—and he's committed to building the best construction management software in the industry.
                  </p>
                  <p className="italic">
                    "I'm not a software guy who decided to build construction software. I'm a builder who got tired of using broken software. There's a big difference."
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Join the Builders Who Get It
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            BuilderSuite is still growing, and we want builders who understand that the best software comes from the people who actually use it. If you're tired of software that doesn't understand construction, you've found your home.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => setIsPathModalOpen(true)}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Start your free trial today
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Link to="/" className="inline-flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg font-bold text-foreground">BuilderSuite</span>
            </Link>
            <div className="flex items-center justify-center gap-6 mb-6">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
            </div>
            <p className="text-muted-foreground mb-4">
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

export default AboutUs;

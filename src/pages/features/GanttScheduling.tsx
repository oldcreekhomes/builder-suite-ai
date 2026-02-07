import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, HardHat, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { FeatureRow } from "@/components/FeatureRow";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function GanttScheduling() {
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleGetStartedClick = () => {
    setIsPathModalOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <PublicHeader onGetStartedClick={handleGetStartedClick} />

      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-muted to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-6">
              <span className="text-sm font-semibold tracking-widest uppercase text-primary">
                SMART GANTT SCHEDULING
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Your Subs Confirm. You See Colors.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Stop chasing subcontractors for schedule confirmations. BuilderSuite automatically emails your subs when they're scheduled, captures their yes/no response, and updates your Gantt chart with color-coded status—so you know exactly who's showing up.
              </p>
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => setIsPathModalOpen(true)}
              >
                Sign Up
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/images/gantt-schedule-preview.png"
                  alt="Smart Gantt Scheduling interface"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="AUTOMATED NOTIFICATIONS"
        title="Schedule Once, Notify Automatically"
        description="When you schedule a task, BuilderSuite automatically emails the assigned subcontractor with the date, time, and job details. No more phone calls, no more manual emails, no more wondering if they got the message."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/gantt-schedule-preview.png"
        imageAlt="Automated scheduling notifications"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="ONE-CLICK CONFIRMATION"
        title="Subs Confirm Without Logging In"
        description="Subcontractors receive a simple email with Yes/No buttons. One click confirms their attendance—no accounts to create, no passwords to remember, no apps to download. Their response instantly updates your schedule."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/gantt-schedule-preview.png"
        imageAlt="One-click subcontractor confirmation"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="VISUAL STATUS"
        title="See Who's Confirmed at a Glance"
        description="Blue means scheduled, Green means confirmed, Red means declined. Project managers can scan the entire Gantt chart in seconds and know exactly which subs are coming and which need follow-up. No more guessing games."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/gantt-schedule-preview.png"
        imageAlt="Color-coded Gantt chart status"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="PM EFFICIENCY"
        title="Manage by Exception, Not by Chasing"
        description="Focus your time on the red tasks that need attention instead of calling every sub to confirm. BuilderSuite handles the routine communication so project managers can solve real problems and keep projects on track."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/gantt-schedule-preview.png"
        imageAlt="Project manager efficiency dashboard"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Automate Your Schedule Coordination?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join builders who have eliminated schedule chaos and know exactly who's showing up—every single day.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => setIsPathModalOpen(true)}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <PublicFooter />

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
    </div>
  );
}

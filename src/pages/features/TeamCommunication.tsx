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

export default function TeamCommunication() {
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader onGetStartedClick={() => setIsPathModalOpen(true)} />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-muted to-background py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <span className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
                TEAM COMMUNICATION
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Keep Everyone in the Loop—Automatically
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Eliminate scattered texts, buried emails, and missed messages. BuilderSuite centralizes all project communication with automatic notifications so the right people always know what's happening.
              </p>
              <Button 
                size="lg" 
                className="group"
                onClick={() => setIsPathModalOpen(true)}
              >
                Sign Up
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/images/team-communication-forecast-messages.png"
                  alt="Team Communication Dashboard"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="PROJECT-BASED MESSAGING"
        title="Conversations That Stay With the Job"
        description="Unlike group texts or email chains that get buried, BuilderSuite keeps every conversation tied to the project and task. Find any discussion instantly—even months later."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/team-communication-forecast-messages.png"
        imageAlt="Project-based messaging interface"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="AUTOMATIC UPDATES"
        title="Everyone Knows What's Happening"
        description="When schedules change, bids come in, or tasks complete, the right people get notified automatically. No more 'did you see my text?' or wondering if the message was received."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/team-communication-forecast-messages.png"
        imageAlt="Automatic notification system"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="SUBCONTRACTOR PORTAL"
        title="Subs Stay Informed Without Extra Apps"
        description="Subcontractors receive updates via email and can respond directly—no apps to download, no accounts to create. They get exactly the information they need for their scope of work."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/team-communication-forecast-messages.png"
        imageAlt="Subcontractor communication portal"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="COMPLETE HISTORY"
        title="Never Lose a Conversation Again"
        description="Every message, decision, and update is logged and searchable. When disputes arise or questions come up, you have a complete record of who said what and when."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/team-communication-forecast-messages.png"
        imageAlt="Communication history and search"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Simplify Project Communication?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join builders who have eliminated the chaos of scattered messages and keep their entire team—including subcontractors—informed automatically.
          </p>
          <Button 
            size="lg" 
            className="group"
            onClick={() => setIsPathModalOpen(true)}
          >
            Get Started Today
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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

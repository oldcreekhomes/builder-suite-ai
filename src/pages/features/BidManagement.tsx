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

export default function BidManagement() {
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
                BID MANAGEMENT
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Automated Bid Collection
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Stop chasing subcontractors for bids. BuilderSuite sends bid invitations automatically, reminds non-responders, and organizes every submission in one place—so you can compare and award faster.
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
                  src="/images/bid-management-preview.png"
                  alt="Bid Management interface"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="NO LOGIN REQUIRED"
        title="Subs Bid Without Creating Accounts"
        description="Subcontractors receive an email link to view specs, drawings, and scope details. They submit their bid with one click—no passwords, no apps, no barriers. The easier you make it, the more bids you get."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/bid-management-preview.png"
        imageAlt="Subcontractor bid submission interface"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="AUTOMATIC REMINDERS"
        title="Never Chase a Late Bid Again"
        description="Set reminder dates when you send bid requests. BuilderSuite automatically emails subs who haven't responded—escalating frequency as deadlines approach. You set it and forget it until bids start rolling in."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/bid-management-preview.png"
        imageAlt="Automated bid reminder system"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="SIDE-BY-SIDE COMPARISON"
        title="Compare Bids Instantly"
        description="All bids display in one organized view with pricing, included items, exclusions, and attachments. No more spreadsheets, no more digging through emails. Make informed award decisions in minutes, not hours."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/bid-comparison-screenshot.png"
        imageAlt="Bid comparison dashboard"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="CENTRALIZED COMMUNICATION"
        title="Every Conversation in One Place"
        description="Questions, clarifications, and bid revisions all tracked in one thread per bid package. When subs ask questions, everyone sees the answer. Nothing gets lost in email chains or voicemail—complete audit trail for every interaction."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/bid-management-preview.png"
        imageAlt="Centralized bid communication"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Streamline Your Bid Process?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join builders who collect more bids with less effort—and award projects faster than ever.
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

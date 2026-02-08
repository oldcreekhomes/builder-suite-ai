import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureRow } from "@/components/FeatureRow";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowRight,
  HardHat,
  Handshake
} from "lucide-react";

const JoinMarketplace = () => {
  const navigate = useNavigate();
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-6">
              <span className="text-sm font-semibold tracking-widest uppercase text-primary">
                FOR SUBCONTRACTORS
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Get Found by Builders
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Join the BuilderSuite Marketplace and put your business in front of home builders actively looking for quality subcontractors in your area.
              </p>
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => navigate('/auth/marketplace')}
              >
                Join the Marketplace
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/images/bid-management-preview.png"
                  alt="BuilderSuite Marketplace"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="FREE LISTING"
        title="Your Business in Front of Builders"
        description="Get listed in the BuilderSuite Marketplace at no cost. Home builders using BuilderSuite can discover your business when they need subcontractors for their projects. No subscription fees, no hidden costs—just exposure to builders who need your services."
        buttonText="Join the Marketplace"
        buttonLink="/auth/marketplace"
        imageSrc="/images/document-management-preview.png"
        imageAlt="Free Marketplace Listing"
        className="bg-muted/30"
        expandableImage={true}
      />

      <FeatureRow
        label="VERIFIED PROFILE"
        title="Build Trust Before the First Call"
        description="Showcase your insurance certificates, licenses, and portfolio directly on your profile. Builders can verify your credentials instantly, giving you a competitive edge over unverified contractors and helping you win more work."
        buttonText="Join the Marketplace"
        buttonLink="/auth/marketplace"
        imageSrc="/images/accounting-bills-preview.png"
        imageAlt="Verified Subcontractor Profile"
        reversed={true}
        className="bg-background"
        expandableImage={true}
      />

      <FeatureRow
        label="DIRECT CONNECTIONS"
        title="Builders Come to You"
        description="Stop cold calling and chasing leads. When builders need subcontractors for their projects, they search the Marketplace and reach out directly. You'll receive bid requests, schedule invitations, and project opportunities right in your inbox."
        buttonText="Join the Marketplace"
        buttonLink="/auth/marketplace"
        imageSrc="/images/ai-bill-management-preview.png"
        imageAlt="Direct Builder Connections"
        className="bg-muted/30"
        expandableImage={true}
      />

      <FeatureRow
        label="ZERO FRICTION"
        title="Respond Without Apps"
        description="No apps to download, no accounts to manage. When a builder sends you a bid request or schedule update, respond directly from the email with a single click. Accept jobs, submit bids, and confirm schedules without ever logging in."
        buttonText="Join the Marketplace"
        buttonLink="/auth/marketplace"
        imageSrc="/images/gantt-scheduling-preview.png"
        imageAlt="Email-Based Responses"
        reversed={true}
        className="bg-background"
        expandableImage={true}
      />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Get More Work?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the BuilderSuite Marketplace today and start connecting with home builders in your area. It's free to list your business.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/auth/marketplace')}
          >
            Join the Marketplace
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
};

export default JoinMarketplace;

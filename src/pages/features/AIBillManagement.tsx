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

const AIBillManagement = () => {
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
                AI BILL MANAGEMENT
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Stop Paying for Manual Data Entry
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Upload hundreds of vendor invoices at once and let AI do the work. Extract amounts, dates, vendor info, and line items automatically—saving hours of tedious data entry and reducing costly errors.
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
                  src="/images/ai-bill-management-preview.png"
                  alt="BuilderSuite AI Bill Management"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="BULK UPLOAD"
        title="Upload Hundreds of Bills in Seconds"
        description="Drag and drop entire folders of vendor invoices, receipts, and statements. Whether it's 5 bills or 500, BuilderSuite processes them all simultaneously. No more scanning one page at a time or waiting for slow uploads."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/ai-bill-management-preview.png"
        imageAlt="Bulk PDF Upload"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="AI EXTRACTION"
        title="Intelligent Data Extraction That Actually Works"
        description="Our AI reads each document and extracts vendor name, invoice number, date, due date, line items, and totals with remarkable accuracy. It learns your vendor patterns over time, getting smarter with every bill you process."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/accounting-bills-preview.png"
        imageAlt="AI Data Extraction"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="SMART ASSIGNMENT"
        title="Automatic Cost Code Suggestions"
        description="Stop looking up cost codes for every line item. BuilderSuite remembers which cost codes you typically use for each vendor and suggests them automatically. One click to confirm, and you're done."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/bid-management-preview.png"
        imageAlt="Smart Cost Code Assignment"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="APPROVAL WORKFLOW"
        title="Route Bills for Approval Automatically"
        description="Set up approval rules based on amount, vendor, or project. Bills get routed to the right people automatically, with email notifications and one-click approval. No more chasing signatures or losing invoices in email."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/document-management-preview.png"
        imageAlt="Approval Workflow"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Automate Your Bill Entry?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join builders who have cut their bookkeeping time by 80% and eliminated data entry errors for good.
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

      {/* Footer */}
      <PublicFooter />
    </div>
  );
};

export default AIBillManagement;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureRow } from "@/components/FeatureRow";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowRight,
  HardHat,
  Handshake
} from "lucide-react";

const Accounting = () => {
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
                ACCOUNTING
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Streamlined Financial Management
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                No more QuickBooks. No more integration headaches. Accounting is built right into BuilderSuite, keeping everything consolidated in one system.
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
                  src="/images/accounting-bills-preview.png"
                  alt="BuilderSuite Accounting Dashboard"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="GENERAL LEDGER"
        title="Built-In Double-Entry Accounting"
        description="Full double-entry accounting without the need for external software. Track every dollar with proper debits and credits, generate balance sheets and income statements, and maintain a complete audit trail—all within BuilderSuite."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/accounting-bills-preview.png"
        imageAlt="BuilderSuite General Ledger"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="AI-POWERED BILL ENTRY"
        title="Scan and Extract Bill Data Automatically"
        description="Say goodbye to manual data entry. Upload hundreds of vendor bills and let AI extract amounts, dates, vendor information, and line items automatically. Review, verify cost codes, and route for approval in a fraction of the time."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/ai-bill-management-preview.png"
        imageAlt="AI-Powered Bill Management"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="COST CODE TRACKING"
        title="Track Every Dollar Against Your Budget"
        description="Assign expenses to cost codes and see exactly where your money is going. Compare actual costs against budgeted amounts in real-time, identify overruns before they become problems, and make data-driven decisions on every project."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/bid-management-preview.png"
        imageAlt="Cost Code Tracking"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="VENDOR MANAGEMENT"
        title="All Your Vendor Relationships in One Place"
        description="Manage vendor information, track payment history, and maintain insurance certificates. See outstanding balances at a glance, generate 1099 reports at year-end, and keep your vendor relationships organized and professional."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/document-management-preview.png"
        imageAlt="Vendor Management"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Simplify Your Accounting?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join builders who have eliminated QuickBooks headaches and consolidated their entire operation into one platform.
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

export default Accounting;

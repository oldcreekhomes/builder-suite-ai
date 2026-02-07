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

export default function DocumentManagement() {
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
                DOCUMENT MANAGEMENT
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                All Your Project Files in One Place
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Stop juggling Dropbox, Google Drive, and scattered email attachments. BuilderSuite organizes every plan, spec, contract, and photo by project—so you never hunt for files again.
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
                  src="/images/document-management-preview.png"
                  alt="Document Management interface"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Rows */}
      <FeatureRow
        label="PROJECT-CENTERED STORAGE"
        title="Files Belong to Projects, Not Folders"
        description="Unlike Dropbox or Google Drive where you hunt through folder hierarchies, BuilderSuite organizes files by project automatically. Plans, specs, contracts, and photos all live where they belong—with the job."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/document-management-preview.png"
        imageAlt="Project-centered file organization"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="NO MORE APP SWITCHING"
        title="Ditch the External File Services"
        description="Stop paying for Dropbox, Google Drive, or Box. BuilderSuite includes unlimited project storage so your documents, photos, and drawings are all in one platform—no more switching between apps to find what you need."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/document-management-preview.png"
        imageAlt="Unified document platform"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="SHARE INSTANTLY"
        title="Send Files Without Downloading First"
        description="Share any file or folder with a single link. Subcontractors, clients, and architects get immediate access without creating accounts or installing apps—just click and view. No more emailing attachments back and forth."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/document-management-preview.png"
        imageAlt="Instant file sharing"
        className="bg-muted/30"
        expandableImage={true}
        showPathModal={true}
      />

      <FeatureRow
        label="BUILT-IN ORGANIZATION"
        title="Folders, Versions, and Search"
        description="Create folder structures that make sense for construction. Track document versions, search across all projects, and never lose a file in an email attachment again. Everything is organized, searchable, and accessible from anywhere."
        buttonText="Sign Up"
        buttonLink="/auth?tab=signup"
        imageSrc="/images/document-management-preview.png"
        imageAlt="Document organization and search"
        reversed={true}
        className="bg-background"
        expandableImage={true}
        showPathModal={true}
      />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Consolidate Your Project Files?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join builders who've eliminated file chaos—and spend less time searching and more time building.
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

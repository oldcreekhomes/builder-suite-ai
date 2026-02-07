import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, X, HardHat, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface FeatureRowProps {
  label: string;
  title: string;
  subtitle?: string;
  description: string;
  buttonText?: string;
  buttonLink: string;
  imageSrc?: string;
  imageAlt?: string;
  reversed?: boolean;
  className?: string;
  expandableImage?: boolean;
  showPathModal?: boolean;
}

export function FeatureRow({
  label,
  title,
  subtitle,
  description,
  buttonText = "Learn more",
  buttonLink,
  imageSrc,
  imageAlt,
  reversed = false,
  className,
  expandableImage = false,
  showPathModal = false,
}: FeatureRowProps) {
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const navigate = useNavigate();
  const hasImage = Boolean(imageSrc);

  return (
    <section className={`w-full py-24 md:py-32 ${className || 'bg-background'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 ${hasImage ? 'lg:grid-cols-2' : ''} gap-12 items-center ${reversed ? "lg:flex-row-reverse" : ""}`}>
          {/* Text Content */}
          <div className={`space-y-8 ${reversed ? "lg:order-2" : "lg:order-1"}`}>
            <span className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
              {label}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xl md:text-2xl font-medium text-primary">
                {subtitle}
              </p>
            )}
            <p className="text-lg text-muted-foreground max-w-lg">
              {description}
            </p>
            {showPathModal ? (
              <Button 
                variant="outline" 
                size="lg" 
                className="group"
                onClick={() => setIsPathModalOpen(true)}
              >
                {buttonText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            ) : (
              <Button variant="outline" size="lg" asChild className="group">
                <Link to={buttonLink}>
                  {buttonText}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            )}
          </div>

          {/* Image */}
          {hasImage && (
            <div className={`${reversed ? "lg:order-1" : "lg:order-2"}`}>
              <div 
                className={`relative rounded-2xl overflow-hidden shadow-xl ${expandableImage ? 'cursor-pointer group' : ''}`}
                onClick={expandableImage ? () => setIsImageOpen(true) : undefined}
              >
                <img
                  src={imageSrc}
                  alt={imageAlt || ''}
                  className={`w-full h-auto object-cover ${expandableImage ? 'transition-transform duration-300 group-hover:scale-[1.02]' : ''}`}
                />
                {expandableImage && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white bg-black/50 px-4 py-2 rounded-lg text-sm font-medium">
                      Click to expand
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {hasImage && expandableImage && (
        <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
          <DialogContent className="max-w-[95vw] w-full h-auto p-0 border-none bg-transparent shadow-none">
            <VisuallyHidden>
              <DialogTitle>Expanded image view</DialogTitle>
            </VisuallyHidden>
            <DialogClose className="absolute right-4 top-4 z-50 rounded-full bg-background/90 p-2 hover:bg-background transition-colors">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <div className="relative w-full">
              <img
                src={imageSrc}
                alt={imageAlt || ''}
                className="w-full h-auto rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

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
    </section>
  );
}

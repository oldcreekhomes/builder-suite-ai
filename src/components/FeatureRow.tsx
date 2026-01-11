import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

interface FeatureRowProps {
  label: string;
  title: string;
  description: string;
  buttonText?: string;
  buttonLink: string;
  imageSrc: string;
  imageAlt: string;
  reversed?: boolean;
  className?: string;
  expandableImage?: boolean;
}

export function FeatureRow({
  label,
  title,
  description,
  buttonText = "Learn more",
  buttonLink,
  imageSrc,
  imageAlt,
  reversed = false,
  className,
  expandableImage = false,
}: FeatureRowProps) {
  const [isImageOpen, setIsImageOpen] = useState(false);

  return (
    <section className={`py-24 md:py-32 ${className || 'bg-background'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${reversed ? "lg:flex-row-reverse" : ""}`}>
          {/* Text Content */}
          <div className={`space-y-8 ${reversed ? "lg:order-2" : "lg:order-1"}`}>
            <span className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
              {label}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg">
              {description}
            </p>
            <Button variant="outline" size="lg" asChild className="group">
              <Link to={buttonLink}>
                {buttonText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>

          {/* Image */}
          <div className={`${reversed ? "lg:order-1" : "lg:order-2"}`}>
            <div 
              className={`rounded-2xl overflow-hidden shadow-xl ${expandableImage ? 'cursor-pointer group' : ''}`}
              onClick={expandableImage ? () => setIsImageOpen(true) : undefined}
            >
              <img
                src={imageSrc}
                alt={imageAlt}
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
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {expandableImage && (
        <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
          <DialogContent className="max-w-[95vw] w-full h-auto p-0 border-none bg-transparent shadow-none">
            <DialogClose className="absolute right-4 top-4 z-50 rounded-full bg-background/90 p-2 hover:bg-background transition-colors">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
            <div className="relative w-full">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="w-full h-auto rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

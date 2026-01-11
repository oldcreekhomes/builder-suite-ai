import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}: FeatureRowProps) {
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
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

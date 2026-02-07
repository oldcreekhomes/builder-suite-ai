import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicHeaderProps {
  onGetStartedClick: () => void;
}

export function PublicHeader({ onGetStartedClick }: PublicHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleFeaturesClick = () => {
    if (location.pathname === "/") {
      // On landing page, scroll to features section
      const featuresSection = document.getElementById("features");
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // On other pages, navigate to landing page with hash
      navigate("/#features");
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold text-foreground tracking-tight">BuilderSuite</span>
          </Link>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Our Philosophy
            </Link>
            <button 
              onClick={handleFeaturesClick}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Button onClick={onGetStartedClick}>Get Started</Button>
          </div>
        </div>
      </div>
    </header>
  );
}

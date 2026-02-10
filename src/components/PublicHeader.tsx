import { Link, useLocation, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, HardHat, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicHeaderProps {
  onGetStartedClick: () => void;
}

const builderFeatures = [
  { label: "Accounting", route: "/features/accounting" },
  { label: "AI Bill Management", route: "/features/ai-bill-management" },
  { label: "Smart Gantt Scheduling", route: "/features/gantt-scheduling" },
  { label: "Bid Management", route: "/features/bid-management" },
  { label: "Document Management", route: "/features/document-management" },
  { label: "Team Communication", route: "/features/team-communication" },
];

const subcontractorFeatures = [
  { label: "Join the Marketplace", route: "/features/join-marketplace" },
];

export function PublicHeader({ onGetStartedClick }: PublicHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold text-foreground tracking-tight">BuilderSuite<sub className="text-[0.45em] font-bold ml-0.5 align-baseline relative -bottom-0.5 border border-current rounded-full px-0.5 leading-none">ML</sub></span>
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
            
            {/* For Builders Dropdown */}
            <div className="relative group">
              <button 
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <HardHat className="h-4 w-4" />
                For Builders
                <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-card border border-border rounded-lg shadow-lg py-2 min-w-[240px]">
                  {builderFeatures.map((item) => (
                    <Link
                      key={item.route}
                      to={item.route}
                      className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* For Subcontractors Dropdown */}
            <div className="relative group">
              <button 
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Handshake className="h-4 w-4" />
                For Subcontractors
                <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-card border border-border rounded-lg shadow-lg py-2 min-w-[240px]">
                  {subcontractorFeatures.map((item) => (
                    <Link
                      key={item.route}
                      to={item.route}
                      className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
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

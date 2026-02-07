import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

interface PublicFooterProps {
  className?: string;
}

export function PublicFooter({ className }: PublicFooterProps) {
  return (
    <footer className={`bg-card border-t border-border py-12 ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="ml-2 text-lg font-bold text-foreground">BuilderSuite</span>
          </Link>
          <div className="flex items-center justify-center gap-6 mb-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              Our Philosophy
            </Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
          <p className="text-muted-foreground mb-4">
            Software for Builders. Built by Builders.
          </p>
          <p className="text-sm text-muted-foreground">
            © 2026 BuilderSuite AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";

interface LogoProps {
  className?: string;
}

const Logo = ({ className }: LogoProps) => {
  return (
    <Link to="/" className={`flex items-center ${className ?? ""}`}>
      <Building2 className="h-8 w-8 text-primary" />
      <span className="ml-2 text-xl font-bold text-foreground tracking-tight">
        BuilderSuite
        <sub className="text-[0.45em] font-bold ml-0.5 align-baseline relative -bottom-0.5 border border-current rounded-full px-0.5 leading-none">
          ML
        </sub>
      </span>
    </Link>
  );
};

export default Logo;

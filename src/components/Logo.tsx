import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
}

const Logo = ({ className }: LogoProps) => {
  return (
    <Link to="/" className={`flex items-center ${className ?? ""}`}>
      <span className="text-xl font-bold text-foreground tracking-tight">
        BuilderSuiteML
      </span>
    </Link>
  );
};

export default Logo;

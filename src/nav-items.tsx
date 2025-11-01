
import { Home, Users, Building2, Settings, CreditCard } from "lucide-react";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Companies from "./pages/Companies";
import SettingsPage from "./pages/Settings";
import WriteChecks from "./pages/WriteChecks";
import Landing from "./pages/Landing";

// Component to handle root route logic
const RootHandler = () => {
  // This will be handled by ProtectedRoute to show landing page for unauthenticated users
  return <Index />;
};

export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: Home,
    page: RootHandler,
  },
  {
    title: "Employees", 
    to: "/employees",
    icon: Users,
    page: Employees,
  },
  {
    title: "Companies", 
    to: "/companies",
    icon: Building2,
    page: Companies,
  },
  {
    title: "Write Checks", 
    to: "/write-checks",
    icon: CreditCard,
    page: WriteChecks,
  },
  {
    title: "Settings", 
    to: "/settings",
    icon: Settings,
    page: SettingsPage,
  },
];

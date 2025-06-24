
import { Home, Users, Building2, Settings } from "lucide-react";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Companies from "./pages/Companies";
import SettingsPage from "./pages/Settings";

export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: Home,
    page: <Index />,
  },
  {
    title: "Employees", 
    to: "/employees",
    icon: Users,
    page: <Employees />,
  },
  {
    title: "Companies", 
    to: "/companies",
    icon: Building2,
    page: <Companies />,
  },
  {
    title: "Settings", 
    to: "/settings",
    icon: Settings,
    page: <SettingsPage />,
  },
];

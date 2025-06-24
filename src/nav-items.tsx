
import { Home, Users, Building2 } from "lucide-react";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Companies from "./pages/Companies";

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
];


import { Home, Users } from "lucide-react";
import Index from "./pages/Index";
import Employees from "./pages/Employees";

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
];

import { lazy } from "react";
import { Home, Users, Building2, Settings, CreditCard } from "lucide-react";

// Lazy-loaded so these pages are only downloaded when visited.
const Index = lazy(() => import("./pages/Index"));
const Employees = lazy(() => import("./pages/Employees"));
const Companies = lazy(() => import("./pages/Companies"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const WriteChecks = lazy(() => import("./pages/WriteChecks"));

export const navItems = [
  { title: "Home", to: "/", icon: Home, page: Index },
  { title: "Employees", to: "/employees", icon: Users, page: Employees },
  { title: "Companies", to: "/companies", icon: Building2, page: Companies },
  { title: "Write Checks", to: "/write-checks", icon: CreditCard, page: WriteChecks },
  { title: "Settings", to: "/settings", icon: Settings, page: SettingsPage },
];

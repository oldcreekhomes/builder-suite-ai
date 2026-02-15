import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

const SidebarLayout = () => (
  <SidebarProvider>
    <Outlet />
  </SidebarProvider>
);

export default SidebarLayout;

import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

const SidebarLayout = () => (
  <SidebarProvider>
    <div className="flex flex-col w-full">
      <SubscriptionBanner />
      <Outlet />
    </div>
  </SidebarProvider>
);

export default SidebarLayout;

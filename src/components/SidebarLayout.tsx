import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { SubscriptionGate } from "@/components/SubscriptionGate";

const SidebarLayout = () => (
  <SidebarProvider>
    <div className="flex flex-col w-full">
      <SubscriptionBanner />
      <SubscriptionGate>
        <Outlet />
      </SubscriptionGate>
    </div>
  </SidebarProvider>
);

export default SidebarLayout;

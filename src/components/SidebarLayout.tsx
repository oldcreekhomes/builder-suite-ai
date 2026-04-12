import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { SubscriptionGate } from "@/components/SubscriptionGate";

const SidebarLayout = () => (
  <SidebarProvider>
    <div className="flex flex-col w-full">
      <SubscriptionGate>
        <Outlet />
      </SubscriptionGate>
    </div>
  </SidebarProvider>
);

export default SidebarLayout;

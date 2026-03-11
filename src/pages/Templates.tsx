import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { FileText } from "lucide-react";
import TemplateCard from "@/components/templates/TemplateCard";

const templates = [
  {
    title: "Subcontractor Contract",
    description: "Standard subcontract agreement with articles covering scope of work, payments, schedule, change orders, warranty, and more. Print-ready 8.5×11 format.",
    icon: FileText,
    route: "/templates/subcontractor-contract",
  },
];

const Templates = () => {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <CompanyDashboardHeader />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Templates</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Reusable document templates for your projects
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <TemplateCard key={t.route} {...t} />
            ))}
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

export default Templates;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { CompaniesTable } from "@/components/companies/CompaniesTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { CompaniesTemplateDialog } from "@/components/companies/CompaniesTemplateDialog";
import { CompaniesExcelImportDialog } from "@/components/companies/CompaniesExcelImportDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function CompaniesTab() {
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [templateDismissed, setTemplateDismissed] = useState(false);
  const { user } = useAuth();

  // Query company count to determine if template dialog should show
  const { data: companyCount, isLoading } = useQuery({
    queryKey: ["companies-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("home_builder_id", user.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  const templateDialogOpen = companyCount === 0 && !isLoading && !templateDismissed;

  const handleImportExcel = () => {
    setTemplateDismissed(true);
    setExcelImportOpen(true);
  };

  const handleAddManually = () => {
    setTemplateDismissed(true);
    setAddCompanyOpen(true);
  };

  const handleExcelDialogOpenChange = (open: boolean) => {
    setExcelImportOpen(open);
    if (!open) setTemplateDismissed(false);
  };

  const handleAddDialogOpenChange = (open: boolean) => {
    setAddCompanyOpen(open);
    if (!open) setTemplateDismissed(false);
  };

  return (
    <div className="space-y-4">
      <CompaniesTemplateDialog
        open={templateDialogOpen}
        onOpenChange={() => {}}
        onImportExcel={handleImportExcel}
        onAddManually={handleAddManually}
      />

      <CompaniesExcelImportDialog
        open={excelImportOpen}
        onOpenChange={handleExcelDialogOpenChange}
      />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Companies</h3>
          <p className="text-sm text-muted-foreground">Manage your companies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddCompanyOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <CompaniesTable searchQuery={searchQuery} />

      <AddCompanyDialog open={addCompanyOpen} onOpenChange={handleAddDialogOpenChange} />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { useTemplateContent, TemplateArticle, DEFAULT_ARTICLES, DEFAULT_EXHIBITS } from "@/hooks/useTemplateContent";
import { useTemplatePermissions } from "@/hooks/useTemplatePermissions";

const SubcontractorContractEdit = () => {
  const navigate = useNavigate();
  const { canEditTemplates, isLoading: permLoading } = useTemplatePermissions();
  const { articles, exhibits, isLoading, save, isSaving } = useTemplateContent("subcontractor-contract");

  const [editArticles, setEditArticles] = useState<TemplateArticle[]>(DEFAULT_ARTICLES);
  const [editExhibits, setEditExhibits] = useState(DEFAULT_EXHIBITS);

  useEffect(() => {
    if (!isLoading) {
      setEditArticles(articles);
      setEditExhibits(exhibits);
    }
  }, [isLoading, articles, exhibits]);

  useEffect(() => {
    if (!permLoading && !canEditTemplates) {
      navigate("/templates");
    }
  }, [permLoading, canEditTemplates, navigate]);

  const updateArticle = (index: number, field: "title" | "body", value: string) => {
    setEditArticles((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const handleSave = () => {
    save({ articles: editArticles, exhibits: editExhibits });
  };

  if (isLoading || permLoading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <CompanyDashboardHeader />
          <div className="flex-1 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-40 bg-muted rounded" />
            </div>
          </div>
        </SidebarInset>
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <CompanyDashboardHeader />
        <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/templates")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Edit Subcontractor Contract</h1>
                <p className="text-sm text-muted-foreground">
                  Modify the boilerplate text for all future contracts
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Articles */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Articles</h2>
            {editArticles.map((article, index) => (
              <div key={article.num} className="space-y-2 border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                    ARTICLE {article.num} –
                  </span>
                  <Input
                    value={article.title}
                    onChange={(e) => updateArticle(index, "title", e.target.value)}
                    className="h-8 text-sm font-bold"
                  />
                </div>
                <Textarea
                  value={article.body}
                  onChange={(e) => updateArticle(index, "body", e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>
            ))}

            {/* Exhibits */}
            <h2 className="text-lg font-semibold text-foreground pt-4">Default Exhibit Text</h2>

            <div className="space-y-2 border rounded-lg p-4">
              <h3 className="text-sm font-bold text-foreground">EXHIBIT B – PROJECT DRAWINGS (Default)</h3>
              <Textarea
                value={editExhibits.projectDrawings}
                onChange={(e) => setEditExhibits((prev) => ({ ...prev, projectDrawings: e.target.value }))}
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="space-y-2 border rounded-lg p-4">
              <h3 className="text-sm font-bold text-foreground">EXHIBIT C – GENERAL REQUIREMENTS (Default)</h3>
              <Textarea
                value={editExhibits.generalRequirements}
                onChange={(e) => setEditExhibits((prev) => ({ ...prev, generalRequirements: e.target.value }))}
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
};

export default SubcontractorContractEdit;

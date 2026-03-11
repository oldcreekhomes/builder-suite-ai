import { FileText } from "lucide-react";

const Templates = () => {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Templates</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage document templates for your projects
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-medium text-foreground mb-2">No templates yet</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Templates will appear here. You'll be able to create reusable document templates like subcontractor agreements and attach them to purchase orders.
        </p>
      </div>
    </div>
  );
};

export default Templates;

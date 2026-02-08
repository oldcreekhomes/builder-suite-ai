import { useState } from "react";
import { ChevronRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypeGoogleMapping";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MarketplaceCategorySidebarProps {
  selectedCategory: string;
  selectedType: string | null;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string | null) => void;
}

export function MarketplaceCategorySidebar({
  selectedCategory,
  selectedType,
  onCategoryChange,
  onTypeChange,
}: MarketplaceCategorySidebarProps) {
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleAllCompaniesClick = () => {
    onCategoryChange("all");
    onTypeChange(null);
  };

  const handleTypeClick = (categoryName: string, typeName: string) => {
    onCategoryChange(categoryName);
    onTypeChange(typeName);
  };

  const isAllSelected = selectedCategory === "all" && selectedType === null;

  return (
    <div className="w-[220px] flex-shrink-0 border-r border-border bg-background">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Filter by Type
        </h3>
      </div>
      
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2">
          {/* All Companies option */}
          <button
            onClick={handleAllCompaniesClick}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
              "hover:bg-muted",
              isAllSelected
                ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            All Companies
          </button>

          {/* Category sections */}
          <div className="mt-2 space-y-1">
            {COMPANY_TYPE_CATEGORIES.map((category) => {
              const isOpen = openCategories.includes(category.name);
              const isCategoryActive = selectedCategory === category.name;

              return (
                <Collapsible
                  key={category.name}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category.name)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                      "hover:bg-muted",
                      isCategoryActive && !selectedType
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground"
                    )}
                  >
                    <span className="truncate pr-2">{category.name}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                        isOpen && "rotate-90"
                      )}
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <div className="ml-3 pl-3 border-l border-border space-y-0.5 py-1">
                      {category.types.map((type) => {
                        const isTypeActive =
                          selectedCategory === category.name &&
                          selectedType === type;

                        return (
                          <button
                            key={type}
                            onClick={() => handleTypeClick(category.name, type)}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors",
                              "hover:bg-muted",
                              isTypeActive
                                ? "bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[1px]"
                                : "text-muted-foreground"
                            )}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

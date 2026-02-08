import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypes";
import { Loader2, MapPin, Building2, CheckCircle2, AlertCircle } from "lucide-react";

interface PopulateResult {
  category: string;
  added: number;
  skipped: number;
  errors: string[];
}

interface PopulateResponse {
  success: boolean;
  summary?: {
    totalAdded: number;
    totalSkipped: number;
    totalErrors: number;
    categoriesProcessed: number;
  };
  results?: PopulateResult[];
  error?: string;
}

export function MarketplacePopulator() {
  const { toast } = useToast();
  const [isPopulating, setIsPopulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [results, setResults] = useState<PopulateResponse | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get all company types flattened
  const allCompanyTypes = Object.values(COMPANY_TYPE_CATEGORIES).flat().filter(t => t !== "Other");

  const handleSelectAll = () => {
    if (selectedCategories.length === allCompanyTypes.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...allCompanyTypes]);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectCategoryGroup = (groupName: string) => {
    const groupTypes = COMPANY_TYPE_CATEGORIES[groupName] || [];
    const filteredTypes = groupTypes.filter(t => t !== "Other");
    const allSelected = filteredTypes.every(t => selectedCategories.includes(t));
    
    if (allSelected) {
      setSelectedCategories(prev => prev.filter(c => !filteredTypes.includes(c)));
    } else {
      setSelectedCategories(prev => [...new Set([...prev, ...filteredTypes])]);
    }
  };

  const handlePopulate = async () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "No categories selected",
        description: "Please select at least one category to populate.",
        variant: "destructive",
      });
      return;
    }

    setIsPopulating(true);
    setProgress(0);
    setResults(null);
    setCurrentCategory("Starting...");

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 1000);

      const { data, error } = await supabase.functions.invoke<PopulateResponse>('populate-marketplace', {
        body: {
          categories: selectedCategories,
          maxResultsPerCategory: 5,
          minRating: 4.0,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw error;
      }

      setResults(data);
      
      if (data?.success) {
        toast({
          title: "Population Complete!",
          description: `Added ${data.summary?.totalAdded} companies across ${data.summary?.categoriesProcessed} categories.`,
        });
      } else {
        toast({
          title: "Population Failed",
          description: data?.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Population error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to populate marketplace",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
      setCurrentCategory(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Auto-Populate Marketplace
          </CardTitle>
          <CardDescription>
            Populate the marketplace with top-rated companies from Google Places API within a 50-mile radius of Washington D.C.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Categories to Populate</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedCategories.length === allCompanyTypes.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {Object.entries(COMPANY_TYPE_CATEGORIES).map(([groupName, types]) => (
                <div key={groupName} className="mb-4">
                  <div 
                    className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                    onClick={() => handleSelectCategoryGroup(groupName)}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{groupName}</span>
                    <span className="text-xs text-muted-foreground">
                      ({types.filter(t => t !== "Other" && selectedCategories.includes(t)).length}/{types.filter(t => t !== "Other").length})
                    </span>
                  </div>
                  <div className="ml-6 grid grid-cols-2 gap-2">
                    {types.filter(t => t !== "Other").map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedCategories.includes(type)}
                          onCheckedChange={() => handleCategoryToggle(type)}
                        />
                        <Label
                          htmlFor={type}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              {selectedCategories.length} of {allCompanyTypes.length} categories selected
            </div>
          </div>

          {/* Progress Section */}
          {isPopulating && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{currentCategory}</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handlePopulate}
            disabled={isPopulating || selectedCategories.length === 0}
            className="w-full"
          >
            {isPopulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Populating...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Populate Marketplace ({selectedCategories.length} categories)
              </>
            )}
          </Button>

          {/* Results Section */}
          {results && results.success && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Population Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {results.summary?.totalAdded}
                    </div>
                    <div className="text-xs text-muted-foreground">Companies Added</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent-foreground">
                      {results.summary?.totalSkipped}
                    </div>
                    <div className="text-xs text-muted-foreground">Duplicates Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-destructive">
                      {results.summary?.totalErrors}
                    </div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                </div>

                {results.results && results.results.length > 0 && (
                  <ScrollArea className="h-[200px] border rounded-lg p-2">
                    {results.results.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1 px-2 text-sm border-b last:border-0"
                      >
                        <span className="truncate flex-1">{result.category}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-primary">+{result.added}</span>
                          {result.skipped > 0 && (
                            <span className="text-muted-foreground">~{result.skipped}</span>
                          )}
                          {result.errors.length > 0 && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}

          {results && !results.success && (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>{results.error || "Population failed"}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

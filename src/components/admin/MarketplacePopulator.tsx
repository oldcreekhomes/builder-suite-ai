import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypes";
import { Loader2, MapPin, Building2, CheckCircle2, AlertCircle, AlertTriangle, DollarSign } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// Estimated costs per category (Nearby Search + Place Details)
const ESTIMATED_COST_PER_CATEGORY = 2.50; // ~$2.50 per category on average

export function MarketplacePopulator() {
  const { toast } = useToast();
  const [isPopulating, setIsPopulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [results, setResults] = useState<PopulateResponse | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  // Get all company types flattened
  const allCompanyTypes = Object.values(COMPANY_TYPE_CATEGORIES).flat().filter(t => t !== "Other");

  // Calculate estimated cost
  const estimatedCost = selectedCategories.length * ESTIMATED_COST_PER_CATEGORY;

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

  const handlePopulateClick = () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "No categories selected",
        description: "Please select at least one category to populate.",
        variant: "destructive",
      });
      return;
    }
    
    // Show confirmation dialog
    setConfirmationText("");
    setShowConfirmDialog(true);
  };

  const handleConfirmedPopulate = async () => {
    setShowConfirmDialog(false);
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
          {/* Cost Warning Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">Google API Cost Warning</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This operation incurs Google Places API charges. Each category costs approximately <strong>${ESTIMATED_COST_PER_CATEGORY.toFixed(2)}</strong> (Nearby Search + Place Details calls).
                </p>
                {selectedCategories.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-amber-800 dark:text-amber-200">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">
                      Estimated cost: ${estimatedCost.toFixed(2)} for {selectedCategories.length} categories
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

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

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedCategories.length} of {allCompanyTypes.length} categories selected</span>
              {selectedCategories.length > 0 && (
                <span className="font-medium text-amber-600">
                  Est. cost: ${estimatedCost.toFixed(2)}
                </span>
              )}
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
            onClick={handlePopulateClick}
            disabled={isPopulating || selectedCategories.length === 0}
            className="w-full"
            variant={selectedCategories.length > 50 ? "destructive" : "default"}
          >
            {isPopulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Populating...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Populate Marketplace ({selectedCategories.length} categories - ~${estimatedCost.toFixed(2)})
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirm API Cost
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to run the marketplace populator for <strong>{selectedCategories.length} categories</strong>.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Estimated cost: ${estimatedCost.toFixed(2)}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This will make Google Places API calls that incur billing charges.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-input">
                  Type <strong>CONFIRM</strong> to proceed:
                </Label>
                <Input
                  id="confirm-input"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type CONFIRM"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedPopulate}
              disabled={confirmationText !== "CONFIRM"}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Proceed with Population
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
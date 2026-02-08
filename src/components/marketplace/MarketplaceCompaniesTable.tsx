import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Globe, MapPin, Star, Phone, Building2, MessageSquare, Lock, Loader2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypeGoogleMapping";
import { SendMarketplaceMessageModal } from "./SendMarketplaceMessageModal";
import { useCompanyHQ } from "@/hooks/useCompanyHQ";
import { useMarketplaceSubscription } from "@/hooks/useMarketplaceSubscription";
import { toast } from "sonner";

interface MarketplaceCompany {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
  website?: string;
  phone_number?: string;
  description?: string;
  service_areas?: string[];
  license_numbers?: string[];
  insurance_verified?: boolean;
  rating?: number;
  review_count?: number;
  message_count?: number;
  lat?: number;
  lng?: number;
  created_at: string;
}

interface DistanceResult {
  companyId: string;
  distance: number | null;
  error?: string;
}

interface MarketplaceCompaniesTableProps {
  searchQuery?: string;
  selectedCategory?: string | null;
  selectedType?: string | null;
  currentRadius?: number;
  onCountsChange?: (counts: { filteredCount: number; totalCount: number; excludedCount: number }) => void;
}

export function MarketplaceCompaniesTable({ 
  searchQuery = "", 
  selectedCategory = null, 
  selectedType = null,
  currentRadius = 30,
  onCountsChange
}: MarketplaceCompaniesTableProps) {
  const [selectedCompany, setSelectedCompany] = useState<MarketplaceCompany | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [distanceCalculationEnabled, setDistanceCalculationEnabled] = useState(false);
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [calculatedDistances, setCalculatedDistances] = useState<Record<string, number | null>>({});
  
  const { hqData, hasHQSet } = useCompanyHQ();
  const { maxRadius, tier } = useMarketplaceSubscription();

  // Build origin address from HQ data
  const hqOrigin = useMemo(() => {
    if (!hasHQSet || !hqData) return null;
    const parts = [
      hqData.hq_address,
      hqData.hq_city,
      hqData.hq_state,
      hqData.hq_zip
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [hasHQSet, hqData]);

  // Reset distances when category changes
  useEffect(() => {
    setDistanceCalculationEnabled(false);
    setCalculatedDistances({});
  }, [selectedCategory, selectedType]);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['marketplace-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_companies')
        .select('*')
        .order('company_name');
      
      if (error) throw error;
      return data as MarketplaceCompany[];
    },
  });

  const handleMessageClick = (company: MarketplaceCompany) => {
    setSelectedCompany(company);
    setMessageModalOpen(true);
  };

  // Get the company types for selected category
  const categoryTypes = selectedCategory 
    ? COMPANY_TYPE_CATEGORIES.find(cat => cat.name === selectedCategory)?.types || []
    : [];

  // Filter by category/type and search first (to reduce distance API calls)
  const preFiltedCompanies = useMemo(() => {
    let filtered = companies;

    // Category/type filter first
    if (selectedCategory) {
      if (selectedType) {
        filtered = filtered.filter(c => c.company_type === selectedType);
      } else {
        filtered = filtered.filter(c => categoryTypes.includes(c.company_type));
      }
    } else {
      return [];
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(company => 
        company.company_name.toLowerCase().includes(query) ||
        company.address?.toLowerCase().includes(query) ||
        company.company_type.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [companies, selectedCategory, selectedType, categoryTypes, searchQuery]);

  // Manual distance calculation function
  const calculateDistances = async () => {
    if (!hqOrigin || preFiltedCompanies.length === 0) return;
    
    setIsCalculatingDistances(true);
    
    try {
      const companiesPayload = preFiltedCompanies
        .filter(c => c.address && c.address.trim() && c.address !== 'Unknown')
        .map(c => ({ id: c.id, address: c.address! }));
      
      if (companiesPayload.length === 0) {
        toast.error("No companies with valid addresses to calculate distances for.");
        return;
      }

      // Check cache first
      const { data: cachedData } = await supabase
        .from('marketplace_distance_cache')
        .select('company_id, distance_miles')
        .eq('origin_address', hqOrigin)
        .in('company_id', companiesPayload.map(c => c.id));

      const cachedDistances: Record<string, number | null> = {};
      const uncachedCompanies: typeof companiesPayload = [];

      if (cachedData && cachedData.length > 0) {
        cachedData.forEach(row => {
          cachedDistances[row.company_id] = row.distance_miles;
        });
        
        companiesPayload.forEach(c => {
          if (!(c.id in cachedDistances)) {
            uncachedCompanies.push(c);
          }
        });
      } else {
        uncachedCompanies.push(...companiesPayload);
      }

      // If all are cached, use them directly
      if (uncachedCompanies.length === 0) {
        setCalculatedDistances(cachedDistances);
        setDistanceCalculationEnabled(true);
        toast.success(`Loaded ${Object.keys(cachedDistances).length} cached distances.`);
        return;
      }

      // Call API for uncached companies
      const { data, error } = await supabase.functions.invoke('calculate-distances', {
        body: { 
          projectAddress: hqOrigin, 
          companies: uncachedCompanies 
        }
      });

      if (error) {
        console.error('Distance calculation error:', error);
        toast.error("Failed to calculate distances. Please try again.");
        return;
      }

      // Merge cached and new distances
      const newDistances: Record<string, number | null> = { ...cachedDistances };
      if (data?.results) {
        Object.values(data.results as Record<string, DistanceResult>).forEach((result: DistanceResult) => {
          newDistances[result.companyId] = result.distance;
        });
      }

      setCalculatedDistances(newDistances);
      setDistanceCalculationEnabled(true);
      
      const cachedCount = Object.keys(cachedDistances).length;
      const newCount = uncachedCompanies.length;
      toast.success(`Calculated ${newCount} distances (${cachedCount} from cache).`);
      
    } catch (err) {
      console.error('Distance calculation error:', err);
      toast.error("Failed to calculate distances. Please try again.");
    } finally {
      setIsCalculatingDistances(false);
    }
  };

  // Apply distance filtering and sorting
  const { filteredCompanies, totalInCategory, excludedCount } = useMemo(() => {
    const total = preFiltedCompanies.length;
    let excluded = 0;

    if (!hasHQSet || !hqOrigin || !distanceCalculationEnabled) {
      // If no HQ or distances not calculated, show all pre-filtered companies without distance info
      return { 
        filteredCompanies: preFiltedCompanies.map(c => ({ ...c, distance: null as number | null })), 
        totalInCategory: total,
        excludedCount: 0
      };
    }

    // Add distance to each company and filter/sort
    const withDistances = preFiltedCompanies.map(company => {
      const distance = calculatedDistances[company.id] ?? null;
      return { ...company, distance };
    });

    // Filter by radius
    const filtered = withDistances.filter(company => {
      if (company.distance === null) {
        // Exclude companies without calculable distance
        excluded++;
        return false;
      }
      return company.distance <= currentRadius;
    });

    // Sort by distance (closest first)
    filtered.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return { 
      filteredCompanies: filtered, 
      totalInCategory: total,
      excludedCount: excluded
    };
  }, [preFiltedCompanies, hasHQSet, hqOrigin, calculatedDistances, currentRadius, distanceCalculationEnabled]);

  // Report counts to parent
  useEffect(() => {
    if (onCountsChange) {
      onCountsChange({
        filteredCount: filteredCompanies.length,
        totalCount: totalInCategory,
        excludedCount
      });
    }
  }, [filteredCompanies.length, totalInCategory, excludedCount, onCountsChange]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading marketplace companies...</div>;
  }

  // Empty state when no category is selected
  if (!selectedCategory) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Select a Category</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose a company type from the sidebar to browse top-rated contractors and service providers in your area.
        </p>
      </div>
    );
  }

  const showDistanceColumn = hasHQSet && hqOrigin && distanceCalculationEnabled;

  return (
    <>
      {/* Distance calculation controls */}
      {hasHQSet && hqOrigin && !distanceCalculationEnabled && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Calculate distances from your HQ</p>
            <p className="text-xs text-muted-foreground">
              {preFiltedCompanies.length} companies in this category
            </p>
          </div>
          <Button
            size="sm"
            onClick={calculateDistances}
            disabled={isCalculatingDistances}
          >
            {isCalculatingDistances ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Calculate Distances
              </>
            )}
          </Button>
        </div>
      )}

      {excludedCount > 0 && distanceCalculationEnabled && (
        <div className="text-sm text-muted-foreground mb-2">
          {excludedCount} supplier{excludedCount !== 1 ? 's' : ''} excluded (address couldn't be mapped)
        </div>
      )}

      <div className="text-sm text-muted-foreground mb-2">
        Showing {filteredCompanies.length} of {totalInCategory} companies
        {showDistanceColumn && ` within ${currentRadius} miles`}
      </div>
      
      <div className="border rounded-lg">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[18%]">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[28%]">Location</TableHead>
              {showDistanceColumn && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[10%]">Distance</TableHead>
              )}
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[12%]">Rating</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[14%]">Phone</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[8%]">Website</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[10%]">Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => {
              const isLocked = company.distance !== undefined && 
                               company.distance !== null && 
                               company.distance > maxRadius;
              
              return (
                <TableRow key={company.id} className={`h-10 ${isLocked ? 'opacity-50' : ''}`}>
                  <TableCell className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs font-medium truncate">{company.company_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {company.address ? (
                      <div className="flex items-start space-x-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground truncate">
                          {company.address}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  {showDistanceColumn && (
                    <TableCell className="px-2 py-1">
                      {company.distance !== null && company.distance !== undefined ? (
                        <span className="text-xs text-muted-foreground">
                          {company.distance.toFixed(1)} mi
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1">
                    {company.rating ? (
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs font-medium">{company.rating}</span>
                        <span className="text-xs text-muted-foreground">({company.review_count || 0})</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {company.phone_number && !isLocked ? (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{company.phone_number}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">{isLocked ? '🔒' : '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {company.website && !isLocked ? (
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-primary hover:text-primary/80"
                      >
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs">Visit</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">{isLocked ? '🔒' : '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleMessageClick(company)}
                      disabled={isLocked}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {isLocked ? 'Locked' : 'Message'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredCompanies.length === 0 && (
              <TableRow>
                <TableCell colSpan={showDistanceColumn ? 7 : 6} className="text-center py-4 text-xs text-muted-foreground">
                  {distanceCalculationEnabled 
                    ? `No marketplace companies found within ${currentRadius} miles.`
                    : "No companies found. Try selecting a different category or calculating distances."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <SendMarketplaceMessageModal
        company={selectedCompany}
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
      />
    </>
  );
}
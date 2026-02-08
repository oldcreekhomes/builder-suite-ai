import { useState, useMemo } from "react";
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
import { Globe, MapPin, Star, Phone, Building2, MessageSquare, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypeGoogleMapping";
import { SendMarketplaceMessageModal } from "./SendMarketplaceMessageModal";
import { useCompanyHQ } from "@/hooks/useCompanyHQ";
import { useMarketplaceSubscription } from "@/hooks/useMarketplaceSubscription";

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

interface MarketplaceCompaniesTableProps {
  searchQuery?: string;
  selectedCategory?: string | null;
  selectedType?: string | null;
  currentRadius?: number;
}

// Haversine distance calculation
function calculateDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function MarketplaceCompaniesTable({ 
  searchQuery = "", 
  selectedCategory = null, 
  selectedType = null,
  currentRadius = 30 
}: MarketplaceCompaniesTableProps) {
  const [selectedCompany, setSelectedCompany] = useState<MarketplaceCompany | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  
  const { hqData, hasHQSet } = useCompanyHQ();
  const { maxRadius, tier } = useMarketplaceSubscription();

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

  // Filter and calculate distances
  const { filteredCompanies, totalInCategory } = useMemo(() => {
    let filtered = companies;
    let total = 0;

    // Category/type filter first
    if (selectedCategory) {
      if (selectedType) {
        filtered = filtered.filter(c => c.company_type === selectedType);
      } else {
        filtered = filtered.filter(c => categoryTypes.includes(c.company_type));
      }
    } else {
      return { filteredCompanies: [], totalInCategory: 0 };
    }

    total = filtered.length;

    // Apply distance filtering if HQ is set
    if (hasHQSet && hqData?.hq_lat && hqData?.hq_lng) {
      filtered = filtered
        .map(company => {
          if (company.lat && company.lng) {
            const distance = calculateDistanceMiles(
              hqData.hq_lat!,
              hqData.hq_lng!,
              company.lat,
              company.lng
            );
            return { ...company, distance };
          }
          return { ...company, distance: null };
        })
        .filter(company => {
          if (company.distance === null) return true; // Include companies without coordinates
          return company.distance <= currentRadius;
        })
        .sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
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

    return { 
      filteredCompanies: filtered as (MarketplaceCompany & { distance?: number | null })[], 
      totalInCategory: total 
    };
  }, [companies, selectedCategory, selectedType, categoryTypes, searchQuery, hasHQSet, hqData, currentRadius]);

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

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        Showing {filteredCompanies.length} of {totalInCategory} companies
        {hasHQSet && ` within ${currentRadius} miles`}
      </div>
      <div className="border rounded-lg">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[18%]">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[28%]">Location</TableHead>
              {hasHQSet && (
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
                  {hasHQSet && (
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
                <TableCell colSpan={hasHQSet ? 7 : 6} className="text-center py-4 text-xs text-muted-foreground">
                  No marketplace companies found within {currentRadius} miles.
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

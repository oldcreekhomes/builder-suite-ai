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
import { Globe, MapPin, Star, Phone, Building2, MessageSquare, Badge as BadgeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypeGoogleMapping";
import { SendMarketplaceMessageModal } from "./SendMarketplaceMessageModal";
import { ViewMarketplaceCompanyDialog } from "./ViewMarketplaceCompanyDialog";

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
  activeServiceAreas: string[];
  onCountsChange?: (counts: { filteredCount: number; totalCount: number }) => void;
}

export function MarketplaceCompaniesTable({ 
  searchQuery = "", 
  selectedCategory = null, 
  selectedType = null,
  activeServiceAreas,
  onCountsChange
}: MarketplaceCompaniesTableProps) {
  const [selectedCompany, setSelectedCompany] = useState<MarketplaceCompany | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewCompany, setViewCompany] = useState<MarketplaceCompany | null>(null);

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

  const handleRowClick = (company: MarketplaceCompany) => {
    setViewCompany(company);
    setViewDialogOpen(true);
  };

  const handleMessageFromDialog = () => {
    if (viewCompany) {
      setSelectedCompany(viewCompany);
      setMessageModalOpen(true);
    }
  };

  // Get the company types for selected category
  const categoryTypes = selectedCategory 
    ? COMPANY_TYPE_CATEGORIES.find(cat => cat.name === selectedCategory)?.types || []
    : [];

  // Filter by category/type, service area, and search
  const filteredCompanies = useMemo(() => {
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

    // Service area filter
    if (activeServiceAreas.length > 0) {
      filtered = filtered.filter(c => {
        const companyAreas = c.service_areas || [];
        return companyAreas.some(area => activeServiceAreas.includes(area));
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

    return filtered;
  }, [companies, selectedCategory, selectedType, categoryTypes, searchQuery, activeServiceAreas]);

  // Total in category (before service area filter) for display
  const totalInCategory = useMemo(() => {
    if (!selectedCategory) return 0;
    if (selectedType) {
      return companies.filter(c => c.company_type === selectedType).length;
    }
    return companies.filter(c => categoryTypes.includes(c.company_type)).length;
  }, [companies, selectedCategory, selectedType, categoryTypes]);

  // Report counts to parent
  useEffect(() => {
    if (onCountsChange) {
      onCountsChange({
        filteredCount: filteredCompanies.length,
        totalCount: totalInCategory,
      });
    }
  }, [filteredCompanies.length, totalInCategory, onCountsChange]);

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
        {activeServiceAreas.length > 0 && (
          <span> in {activeServiceAreas.join(', ')}</span>
        )}
      </div>
      
      <div className="border rounded-lg">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18%]">Company Name</TableHead>
              <TableHead className="w-[24%]">Location</TableHead>
              <TableHead className="w-[14%]">Service Area</TableHead>
              <TableHead className="w-[12%]">Rating</TableHead>
              <TableHead className="w-[14%]">Phone</TableHead>
              <TableHead className="w-[8%]">Website</TableHead>
              <TableHead className="w-[10%]">Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id} className="h-10 cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(company)}>
                <TableCell className="px-2 py-1">
                  <span className="text-xs font-medium truncate">{company.company_name}</span>
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
                <TableCell className="px-2 py-1">
                  {company.service_areas && company.service_areas.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {company.service_areas.map(area => (
                        <Badge key={area} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
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
                  {company.phone_number ? (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{company.phone_number}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  {company.website ? (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-primary hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="h-3 w-3 flex-shrink-0" />
                      <span className="text-xs">Visit</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); handleMessageClick(company); }}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Message
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredCompanies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                  No companies found in the selected service area(s). Try adjusting your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ViewMarketplaceCompanyDialog
        company={viewCompany}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onMessageClick={handleMessageFromDialog}
      />

      <SendMarketplaceMessageModal
        company={selectedCompany}
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
      />
    </>
  );
}

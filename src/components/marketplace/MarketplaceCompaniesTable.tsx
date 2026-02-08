import { useState } from "react";
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
import { Globe, MapPin, Star, Phone, Building2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypeGoogleMapping";
import { SendMarketplaceMessageModal } from "./SendMarketplaceMessageModal";

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
  created_at: string;
}

interface MarketplaceCompaniesTableProps {
  searchQuery?: string;
  selectedCategory?: string | null;
  selectedType?: string | null;
}

export function MarketplaceCompaniesTable({ searchQuery = "", selectedCategory = null, selectedType = null }: MarketplaceCompaniesTableProps) {
  const [selectedCompany, setSelectedCompany] = useState<MarketplaceCompany | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

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

  // Filter companies based on search, category, and specific type
  const filteredCompanies = companies.filter(company => {
    // If no category selected, show nothing
    if (!selectedCategory) {
      return false;
    }
    
    // Specific type filter (most granular)
    if (selectedType) {
      if (company.company_type !== selectedType) {
        return false;
      }
    } else {
      // Category filter (parent level)
      if (!categoryTypes.includes(company.company_type)) {
        return false;
      }
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        company.company_name.toLowerCase().includes(query) ||
        company.address?.toLowerCase().includes(query) ||
        company.company_type.toLowerCase().includes(query)
      );
    }
    return true;
  });


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
        Showing {filteredCompanies.length} of {companies.length} companies
      </div>
      <div className="border rounded-lg">
      <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[18%]">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[32%]">Location</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[12%]">Rating</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[14%]">Phone</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[10%]">Website</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-[14%]">Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id} className="h-10">
                <TableCell className="px-2 py-1">
                  <div className="text-xs font-medium truncate">{company.company_name}</div>
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
                    onClick={() => handleMessageClick(company)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Message
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredCompanies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                  No marketplace companies found.
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

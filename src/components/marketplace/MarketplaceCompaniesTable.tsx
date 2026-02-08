
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, MapPin, Users, Star, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ViewMarketplaceCompanyDialog } from "./ViewMarketplaceCompanyDialog";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypeGoogleMapping";

interface MarketplaceCompany {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
  website?: string;
  phone_number?: string;
  description?: string;
  specialties?: string[];
  service_areas?: string[];
  license_numbers?: string[];
  insurance_verified?: boolean;
  rating?: number;
  review_count?: number;
  created_at: string;
  source?: string;
}

interface MarketplaceCompaniesTableProps {
  searchQuery?: string;
  selectedCategory?: string;
}

export function MarketplaceCompaniesTable({ searchQuery = "", selectedCategory = "all" }: MarketplaceCompaniesTableProps) {
  const [viewingCompany, setViewingCompany] = useState<MarketplaceCompany | null>(null);

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

  // Get the company types for selected category
  const categoryTypes = selectedCategory !== "all" 
    ? COMPANY_TYPE_CATEGORIES.find(cat => cat.name === selectedCategory)?.types || []
    : [];

  // Filter companies based on search and category
  const filteredCompanies = companies.filter(company => {
    // Category filter
    if (selectedCategory !== "all" && !categoryTypes.includes(company.company_type)) {
      return false;
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

  const getCompanyTypeColor = (type: string) => {
    switch (type) {
      case 'Subcontractor':
        return 'bg-blue-100 text-blue-800';
      case 'Vendor':
        return 'bg-green-100 text-green-800';
      case 'Municipality':
        return 'bg-purple-100 text-purple-800';
      case 'Consultant':
        return 'bg-orange-100 text-orange-800';
      case 'Lender':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading marketplace companies...</div>;
  }

  return (
    <>
      <div className="text-sm text-muted-foreground mb-2">
        Showing {filteredCompanies.length} of {companies.length} companies
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Company Name</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Source</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Location</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Rating</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Specialties</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Contact</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id} className="h-10">
                <TableCell className="px-2 py-1">
                  <div className="text-xs font-medium">{company.company_name}</div>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Badge className={`${getCompanyTypeColor(company.company_type)} text-[10px] px-1 py-0`}>
                    {company.company_type}
                  </Badge>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <Badge variant={company.source === 'google_places' ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0">
                    {company.source === 'google_places' ? 'Google' : 'Manual'}
                  </Badge>
                </TableCell>
                <TableCell className="px-2 py-1">
                  <div className="flex items-center space-x-1">
                    {company.address && (
                      <>
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {company.address}
                        </span>
                      </>
                    )}
                    {!company.address && <span className="text-muted-foreground text-xs">-</span>}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1">
                  {company.rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs font-medium">{company.rating}</span>
                      <span className="text-xs text-muted-foreground">({company.review_count || 0})</span>
                    </div>
                  )}
                  {!company.rating && <span className="text-muted-foreground text-xs">-</span>}
                </TableCell>
                <TableCell className="px-2 py-1">
                  {company.specialties && company.specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {company.specialties[0]}
                      </Badge>
                      {company.specialties.length > 1 && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          +{company.specialties.length - 1} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  <div className="flex flex-col space-y-0.5">
                    {company.phone_number && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{company.phone_number}</span>
                      </div>
                    )}
                    {company.website && (
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-primary hover:text-primary/80"
                      >
                        <Globe className="h-2.5 w-2.5" />
                        <span className="text-[10px]">Website</span>
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-1 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingCompany(company)}
                    className="h-6 px-2 text-xs"
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredCompanies.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-xs text-muted-foreground">
                  No marketplace companies found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ViewMarketplaceCompanyDialog
        company={viewingCompany}
        open={!!viewingCompany}
        onOpenChange={(open) => !open && setViewingCompany(null)}
      />
    </>
  );
}


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
}

export function MarketplaceCompaniesTable() {
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading marketplace companies...</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Specialties</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <div className="font-medium">{company.company_name}</div>
                  {company.description && (
                    <div className="text-sm text-gray-500 truncate max-w-[200px]">
                      {company.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={getCompanyTypeColor(company.company_type)}>
                    {company.company_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    {company.address && (
                      <>
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 truncate max-w-[150px]">
                          {company.address}
                        </span>
                      </>
                    )}
                    {!company.address && <span className="text-gray-400">-</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {company.rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{company.rating}</span>
                      <span className="text-sm text-gray-500">({company.review_count || 0})</span>
                    </div>
                  )}
                  {!company.rating && <span className="text-gray-400">-</span>}
                </TableCell>
                <TableCell>
                  {company.specialties && company.specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {company.specialties.slice(0, 2).map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {company.specialties.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{company.specialties.length - 2} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    {company.phone_number && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{company.phone_number}</span>
                      </div>
                    )}
                    {company.website && (
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="h-3 w-3" />
                        <span className="text-xs">Website</span>
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingCompany(company)}
                    className="hover:bg-gray-100"
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Globe, MapPin, Phone, Mail, Star, Shield, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

interface MarketplaceRepresentative {
  id: string;
  marketplace_company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  is_primary?: boolean;
}

interface ViewMarketplaceCompanyDialogProps {
  company: MarketplaceCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewMarketplaceCompanyDialog({ company, open, onOpenChange }: ViewMarketplaceCompanyDialogProps) {
  const { data: representatives = [] } = useQuery({
    queryKey: ['marketplace-representatives', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('marketplace_company_representatives')
        .select('*')
        .eq('marketplace_company_id', company.id)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return data as MarketplaceRepresentative[];
    },
    enabled: !!company?.id,
  });

  if (!company) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="flex-1 truncate">{company.company_name}</span>
            <Badge className={getCompanyTypeColor(company.company_type)}>
              {company.company_type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company.address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{company.address}</span>
                </div>
              )}
              
              {company.phone_number && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{company.phone_number}</span>
                </div>
              )}
              
              {company.website && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <a 
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              
              {company.rating && (
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{company.rating}</span>
                  <span className="text-sm text-gray-500">({company.review_count || 0} reviews)</span>
                </div>
              )}
              
              {company.insurance_verified && (
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Insurance Verified</span>
                </div>
              )}
            </div>
            
            {company.description && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">{company.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Specialties */}
          {company.specialties && company.specialties.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {company.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Service Areas */}
          {company.service_areas && company.service_areas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Service Areas</h3>
              <div className="flex flex-wrap gap-2">
                {company.service_areas.map((area, index) => (
                  <Badge key={index} variant="outline">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* License Numbers */}
          {company.license_numbers && company.license_numbers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">License Numbers</h3>
              <div className="flex flex-wrap gap-2">
                {company.license_numbers.map((license, index) => (
                  <Badge key={index} variant="outline" className="font-mono">
                    {license}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Representatives */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Representatives
            </h3>
            {representatives.length > 0 ? (
              <div className="space-y-3">
                {representatives.map((rep) => (
                  <div key={rep.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        {rep.first_name} {rep.last_name}
                        {rep.is_primary && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Primary Contact
                          </Badge>
                        )}
                      </div>
                      {rep.title && (
                        <span className="text-sm text-gray-500">{rep.title}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {rep.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{rep.email}</span>
                        </div>
                      )}
                      {rep.phone_number && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{rep.phone_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No representatives listed</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

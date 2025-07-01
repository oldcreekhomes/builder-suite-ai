
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
import { Mail, Phone, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarketplaceRepresentativeWithCompany {
  id: string;
  marketplace_company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  title?: string;
  is_primary?: boolean;
  marketplace_companies: {
    company_name: string;
    company_type: string;
  };
}

export function MarketplaceRepresentativesTable() {
  const { data: representatives = [], isLoading } = useQuery({
    queryKey: ['marketplace-representatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_company_representatives')
        .select(`
          *,
          marketplace_companies (
            company_name,
            company_type
          )
        `)
        .order('first_name');
      
      if (error) throw error;
      return data as MarketplaceRepresentativeWithCompany[];
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
    return <div className="p-6">Loading marketplace representatives...</div>;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Contact Information</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {representatives.map((rep) => (
            <TableRow key={rep.id}>
              <TableCell>
                <div className="font-medium">
                  {rep.first_name} {rep.last_name}
                </div>
              </TableCell>
              <TableCell>
                {rep.title ? (
                  <span className="text-sm">{rep.title}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-sm">
                      {rep.marketplace_companies.company_name}
                    </div>
                    <Badge className={`${getCompanyTypeColor(rep.marketplace_companies.company_type)} text-xs`}>
                      {rep.marketplace_companies.company_type}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell>
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
                  {!rep.email && !rep.phone_number && (
                    <span className="text-gray-400 text-sm">No contact info</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {rep.is_primary && (
                  <Badge variant="secondary" className="text-xs">
                    Primary Contact
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}

          {representatives.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                No marketplace representatives found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

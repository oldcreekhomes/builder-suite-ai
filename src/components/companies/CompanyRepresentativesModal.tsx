import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone } from "lucide-react";

interface Representative {
  id: string;
  first_name: string;
  last_name: string | null;
  title: string;
  email: string;
  phone_number: string | null;
}

interface Company {
  id: string;
  company_name: string;
}

interface CompanyRepresentativesModalProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyRepresentativesModal({
  company,
  open,
  onOpenChange,
}: CompanyRepresentativesModalProps) {
  const { data: representatives = [], isLoading } = useQuery({
    queryKey: ['company-representatives', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('company_representatives')
        .select('*')
        .eq('company_id', company.id)
        .order('first_name');
      
      if (error) throw error;
      return data as Representative[];
    },
    enabled: !!company?.id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-gray-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium border-b border-gray-200 pb-3 mb-4">
            {company?.company_name} Representatives
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-xs text-gray-500 p-4 text-center">
              Loading representatives...
            </div>
          ) : representatives.length === 0 ? (
            <div className="text-xs text-gray-500 p-4 text-center">
              No representatives found for this company.
            </div>
          ) : (
            representatives.map((rep) => (
              <div
                key={rep.id}
                className="bg-gray-50 rounded-lg p-3 space-y-1"
              >
                <div className="text-xs font-medium text-gray-900">
                  {rep.first_name} {rep.last_name || ''}
                </div>
                <div className="text-xs text-gray-600">
                  {rep.title}
                </div>
                {rep.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">{rep.email}</span>
                  </div>
                )}
                {rep.phone_number && (
                  <div className="flex items-center space-x-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">{rep.phone_number}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
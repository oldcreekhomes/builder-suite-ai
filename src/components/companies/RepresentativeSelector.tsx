
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormLabel } from "@/components/ui/form";

interface RepresentativeSelectorProps {
  companyId: string | null;
}

export function RepresentativeSelector({ companyId }: RepresentativeSelectorProps) {

  // Fetch representatives for this specific company
  const { data: representatives = [] } = useQuery({
    queryKey: ['company-representatives', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('company_representatives')
        .select('id, first_name, last_name, company_id, title, email, phone_number')
        .eq('company_id', companyId)
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-4">
      <FormLabel>Company Representatives</FormLabel>
      
      {/* Display existing representatives */}
      {representatives.length > 0 ? (
        <div className="space-y-2">
          {representatives.map(representative => (
            <div key={representative.id} className="p-3 bg-gray-50 rounded-md border">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">
                    {representative.first_name} {representative.last_name}
                  </div>
                  {representative.title && (
                    <div className="text-xs text-gray-600">{representative.title}</div>
                  )}
                  {representative.email && (
                    <div className="text-xs text-gray-600">{representative.email}</div>
                  )}
                  {representative.phone_number && (
                    <div className="text-xs text-gray-600">{representative.phone_number}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 text-gray-500 text-center text-sm border rounded-md bg-gray-50">
          No representatives found for this company
        </div>
      )}
    </div>
  );
}

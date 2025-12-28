
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormLabel } from "@/components/ui/form";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { toTitleCase } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface RepresentativeSelectorProps {
  companyId: string | null;
}

export function RepresentativeSelector({ companyId }: RepresentativeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded-md p-2 -ml-2 transition-colors">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Users className="h-4 w-4 text-muted-foreground" />
          <FormLabel className="cursor-pointer m-0">
            Company Representatives
          </FormLabel>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {representatives.length}
          </span>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-2">
          {representatives.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-2 px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                <span>Name</span>
                <span>Title</span>
                <span>Email</span>
                <span>Phone</span>
              </div>
              {/* Data rows with max height and scroll */}
              <div className="max-h-32 overflow-y-auto">
                {representatives.map(representative => (
                  <div 
                    key={representative.id} 
                    className="grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-2 px-3 py-1.5 text-xs border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <span className="truncate font-medium">
                      {representative.first_name} {representative.last_name}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {toTitleCase(representative.title)}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {representative.email || '—'}
                    </span>
                    <span className="truncate text-muted-foreground">
                      {representative.phone_number || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-2 text-muted-foreground text-center text-xs border rounded-md bg-muted/30">
              No representatives found for this company
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

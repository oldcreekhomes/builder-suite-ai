import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypes";

interface CompanyTypeComboboxProps {
  value: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

export function CompanyTypeCombobox({ 
  value, 
  onSelect, 
  placeholder = "Select company type" 
}: CompanyTypeComboboxProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
        {Object.entries(COMPANY_TYPE_CATEGORIES).map(([category, types]) => (
          <DropdownMenuSub key={category}>
            <DropdownMenuSubTrigger className="cursor-pointer">
              {category}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
              {types.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => onSelect(type)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === type ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

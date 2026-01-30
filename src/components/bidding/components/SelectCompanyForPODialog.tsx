import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid' | 'submitted' | null;
  price: number | null;
  proposals: string[] | null;
  companies: Company;
}

interface SelectCompanyForPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: BiddingCompany[];
  costCodeName: string;
  onSelectCompany: (company: BiddingCompany) => void;
}

export function SelectCompanyForPODialog({
  open,
  onOpenChange,
  companies,
  costCodeName,
  onSelectCompany,
}: SelectCompanyForPODialogProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Filter to only companies with submitted bids and prices
  const eligibleCompanies = companies.filter(
    (c) => c.bid_status === 'submitted' && c.price && c.price > 0
  );

  const handleContinue = () => {
    const selected = eligibleCompanies.find((c) => c.id === selectedCompanyId);
    if (selected) {
      onSelectCompany(selected);
      onOpenChange(false);
      setSelectedCompanyId('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedCompanyId('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Company for PO</DialogTitle>
          <DialogDescription>
            Choose which company to award the Purchase Order for{' '}
            <strong>{costCodeName}</strong>
          </DialogDescription>
        </DialogHeader>

        {eligibleCompanies.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <p>No companies have submitted bids with prices.</p>
            <p className="text-sm mt-2">
              Companies must have a "Submitted" status and a price to be eligible for a PO.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] pr-4">
            <RadioGroup
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
              className="space-y-3"
            >
              {eligibleCompanies.map((company) => (
                <div
                  key={company.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCompanyId === company.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedCompanyId(company.id)}
                >
                  <RadioGroupItem value={company.id} id={company.id} className="mt-1" />
                  <Label htmlFor={company.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{company.companies.company_name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ${Number(company.price).toLocaleString()}
                    </div>
                    {company.proposals && company.proposals.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <FileText className="h-3 w-3" />
                        {company.proposals.length} proposal{company.proposals.length > 1 ? 's' : ''} attached
                      </div>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="sm:mr-auto">
            Cancel
          </Button>
          {eligibleCompanies.length > 0 && (
            <Button onClick={handleContinue} disabled={!selectedCompanyId}>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

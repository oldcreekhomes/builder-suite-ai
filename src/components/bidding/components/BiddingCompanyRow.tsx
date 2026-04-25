import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ProposalCell } from './ProposalCell';
import { ConfirmPODialog } from '../ConfirmPODialog';
import { usePOStatus } from '@/hooks/usePOStatus';
import { TableRowActions } from '@/components/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';
import type { AwardedPO } from '@/hooks/useBidPackagePO';
import { usePreExtractPOLines } from '@/hooks/usePreExtractPOLines';
import type { LineItemInput } from '@/hooks/usePurchaseOrderLines';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  address?: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid' | 'submitted' | null;
  price: number | null;
  proposals: string[] | null;
  email_sent_at: string | null;
  will_bid_at: string | null;
  companies: Company;
}

interface BiddingCompanyRowProps {
  biddingItemId: string;
  biddingCompany: BiddingCompany;
  localPrice: string;
  onBidStatusChange: (companyId: string, newStatus: string | null) => void;
  onPriceChange: (companyId: string, value: string) => void;
  onPriceBlur: (companyId: string, value: string) => void;
  onFileUpload: (companyId: string) => void;
  onDeleteIndividualFile: (companyId: string, fileName: string) => void;
  onDeleteAllFiles: (companyId: string) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  onSendEmail?: (companyId: string) => void;
  isReadOnly?: boolean;
  bidPackageId: string;
  projectAddress: string;
  projectId: string;
  costCodeId: string;
  isSelected?: boolean;
  onCheckboxChange?: (companyId: string, checked: boolean) => void;
  awardedPOs?: AwardedPO[];
}

export function BiddingCompanyRow({
  biddingItemId,
  biddingCompany,
  localPrice,
  onBidStatusChange,
  onPriceChange,
  onPriceBlur,
  onFileUpload,
  onDeleteIndividualFile,
  onDeleteAllFiles,
  onDeleteCompany,
  onSendEmail,
  isReadOnly = false,
  bidPackageId,
  projectAddress,
  projectId,
  costCodeId,
  isSelected = false,
  onCheckboxChange,
  awardedPOs = []
}: BiddingCompanyRowProps) {
  const [showConfirmPODialog, setShowConfirmPODialog] = useState(false);
  const [extractedLines, setExtractedLines] = useState<LineItemInput[] | null>(null);
  const { extract, isExtracting } = usePreExtractPOLines();
  const awardedPO = awardedPOs.find(po => po.company_id === biddingCompany.company_id);
  const { getPOStatusForCompany } = usePOStatus(projectId, costCodeId);

  const handleSendPO = () => {
    console.log('Send PO confirmed for company:', biddingCompany.company_id);
    // TODO: Implement PO sending logic
  };

  const handleOpenConfirmPO = async () => {
    setShowConfirmPODialog(true);
    if (!isReadOnly) {
      const [lines] = await Promise.all([
        extract(biddingCompany.proposals, costCodeId),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
      setExtractedLines(lines);
    }
  };

  const actions = [
    ...(onSendEmail ? [{
      label: "Send Email",
      onClick: () => onSendEmail(biddingCompany.company_id),
      hidden: isReadOnly,
    }] : []),
    {
      label: isReadOnly ? "Resend PO Email" : "Send PO",
      onClick: handleOpenConfirmPO,
      hidden: isReadOnly && !awardedPO,
    },
    {
      label: "Remove Company",
      onClick: () => onDeleteCompany(biddingItemId, biddingCompany.id),
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmTitle: "Remove Company",
      confirmDescription: `Are you sure you want to remove "${biddingCompany.companies.company_name}" from this bidding item?`,
      hidden: isReadOnly,
    },
  ];

  return (
    <TableRow>
      <TableCell>
        {!isReadOnly && onCheckboxChange && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onCheckboxChange(biddingCompany.id, !!checked)}
          />
        )}
      </TableCell>
      <TableCell>
        <span className="font-medium whitespace-nowrap">
          {biddingCompany.companies.company_name}
        </span>
      </TableCell>
      <TableCell>
        {awardedPO && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs whitespace-nowrap">
            PO Awarded · {awardedPO.po_number || 'Pending'}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {biddingCompany.email_sent_at ? (
          <span className="text-xs text-red-600 font-medium whitespace-nowrap">
            {format(new Date(biddingCompany.email_sent_at), 'MMM dd, yyyy')}
          </span>
        ) : (
          <span className="text-xs text-green-600 font-medium whitespace-nowrap">
            Not sent
          </span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Select 
            value={biddingCompany.will_bid_at ? "will_bid" : (biddingCompany.bid_status || "no_choice")}
            onValueChange={(value) => onBidStatusChange(biddingCompany.id, value === "no_choice" ? null : value)}
            disabled={isReadOnly}
          >
            <SelectTrigger className="w-20 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-md z-50">
              <SelectItem value="no_choice">---</SelectItem>
              <SelectItem value="will_bid">Yes</SelectItem>
              <SelectItem value="will_not_bid">No</SelectItem>
            </SelectContent>
          </Select>
          {biddingCompany.bid_status === 'submitted' && (
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <Input
          type="text"
          placeholder="$0.00"
          value={localPrice}
          onChange={(e) => onPriceChange(biddingCompany.id, e.target.value)}
          onBlur={(e) => onPriceBlur(biddingCompany.id, e.target.value)}
          className="w-24 h-9 text-sm"
          disabled={isReadOnly}
        />
      </TableCell>
      <TableCell>
        <ProposalCell
          proposals={biddingCompany.proposals}
          companyId={biddingCompany.id}
          onFileUpload={onFileUpload}
          onDeleteIndividualFile={onDeleteIndividualFile}
          onDeleteAllFiles={onDeleteAllFiles}
          isReadOnly={isReadOnly}
        />
      </TableCell>
      <TableCell className="text-center">
        <TableRowActions actions={actions} disabled={isReadOnly && !awardedPO} />
      </TableCell>

      <ConfirmPODialog
        isOpen={showConfirmPODialog}
        onClose={() => { setShowConfirmPODialog(false); setExtractedLines(null); }}
        biddingCompany={biddingCompany}
        onConfirm={handleSendPO}
        bidPackageId={bidPackageId}
        projectAddress={projectAddress}
        projectId={projectId}
        costCodeId={costCodeId}
        mode={isReadOnly ? 'resend' : 'send'}
        initialLineItems={extractedLines || undefined}
        isExtracting={isExtracting}
      />
    </TableRow>
  );
}

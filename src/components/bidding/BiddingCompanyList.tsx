
import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteButton } from '@/components/ui/delete-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Building2, Upload, FileText, CalendarIcon } from 'lucide-react';
import { FileSpreadsheet, FileType, File } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FilePreviewModal } from './FilePreviewModal';

interface Company {
  id: string;
  company_name: string;
  company_type: string;
}

interface BiddingCompany {
  id: string;
  company_id: string;
  bid_status: 'will_bid' | 'will_not_bid';
  price: number | null;
  proposals: string | null;
  due_date: string | null;
  reminder_date: string | null;
  companies: Company;
}

interface BiddingCompanyListProps {
  biddingItemId: string;
  companies: BiddingCompany[];
  onToggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => void;
  onUpdatePrice: (biddingItemId: string, companyId: string, price: number | null) => void;
  onUpdateDueDate: (biddingItemId: string, companyId: string, dueDate: string | null) => void;
  onUpdateReminderDate: (biddingItemId: string, companyId: string, reminderDate: string | null) => void;
  onUploadProposal: (biddingItemId: string, companyId: string, file: File) => void;
  onDeleteCompany: (biddingItemId: string, companyId: string) => void;
  isReadOnly?: boolean;
}

export function BiddingCompanyList({ 
  biddingItemId, 
  companies, 
  onToggleBidStatus, 
  onUpdatePrice,
  onUpdateDueDate,
  onUpdateReminderDate,
  onUploadProposal,
  onDeleteCompany,
  isReadOnly = false
}: BiddingCompanyListProps) {
  const [fileInputs, setFileInputs] = useState<Record<string, HTMLInputElement | null>>({});
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // Initialize local prices from companies data
  useEffect(() => {
    const prices: Record<string, string> = {};
    companies.forEach(company => {
      prices[company.company_id] = company.price?.toString() || '';
    });
    setLocalPrices(prices);
  }, [companies]);
  
  const handleBidStatusChange = (companyId: string, newStatus: string) => {
    onToggleBidStatus(biddingItemId, companyId, newStatus);
  };

  const handleFileUpload = (companyId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onUploadProposal(biddingItemId, companyId, file);
      }
    };
    input.click();
  };

  const handlePriceChange = (companyId: string, value: string) => {
    // Update local state immediately for responsive UI
    setLocalPrices(prev => ({
      ...prev,
      [companyId]: value
    }));
  };

  const handlePriceBlur = (companyId: string, value: string) => {
    // Only save to database when user finishes editing
    const price = value === '' ? null : parseFloat(value);
    if (!isNaN(price) || price === null) {
      onUpdatePrice(biddingItemId, companyId, price);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return FileSpreadsheet;
      case 'docx':
      case 'doc':
        return FileType;
      case 'pdf':
        return File;
      default:
        return FileText;
    }
  };

  const handleFilePreview = (fileName: string) => {
    setPreviewFile(fileName);
  };

  const DatePicker = ({ 
    value, 
    onChange, 
    placeholder, 
    disabled,
    companyId,
    field
  }: { 
    value: string | null; 
    onChange: (date: Date | undefined) => void; 
    placeholder: string;
    disabled?: boolean;
    companyId: string;
    field: 'due_date' | 'reminder_date';
  }) => {
    const date = value ? new Date(value) : undefined;
    
    const handleDateChange = (newDate: Date | undefined) => {
      const dateString = newDate ? newDate.toISOString() : null;
      if (field === 'due_date') {
        onUpdateDueDate(biddingItemId, companyId, dateString);
      } else {
        onUpdateReminderDate(biddingItemId, companyId, dateString);
      }
    };
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-32 h-8 text-sm justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-3 w-3" />
            {date ? format(date, "MM/dd/yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    );
  };

  if (companies.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="text-sm text-gray-500 italic text-center py-4">
          No companies associated with this cost code
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {companies.map((biddingCompany) => (
        <TableRow key={biddingCompany.id} className="bg-gray-50/50">
          <TableCell className="w-12 py-1"></TableCell>
          <TableCell className="py-1 text-sm" style={{ paddingLeft: '70px' }}>
            <div className="font-medium text-sm whitespace-nowrap">
              {biddingCompany.companies.company_name}
            </div>
          </TableCell>
          <TableCell className="py-1">
            <Select 
              value={biddingCompany.bid_status} 
              onValueChange={(value) => handleBidStatusChange(biddingCompany.company_id, value)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="w-20 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border shadow-md z-50">
                <SelectItem value="will_bid">Yes</SelectItem>
                <SelectItem value="will_not_bid">No</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="py-1">
            <Input
              type="text"
              placeholder="$0.00"
              value={localPrices[biddingCompany.company_id] || ''}
              onChange={(e) => handlePriceChange(biddingCompany.company_id, e.target.value)}
              onBlur={(e) => handlePriceBlur(biddingCompany.company_id, e.target.value)}
              className="w-24 h-8 text-sm"
              disabled={isReadOnly}
            />
          </TableCell>
          <TableCell className="py-1">
            <div className="flex items-center space-x-2">
              {biddingCompany.proposals ? (
                <div className="flex items-center space-x-1">
                  {(() => {
                    const IconComponent = getFileIcon(biddingCompany.proposals);
                    return (
                      <button
                        onClick={() => handleFilePreview(biddingCompany.proposals!)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                        disabled={isReadOnly}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="text-sm truncate max-w-20">{biddingCompany.proposals}</span>
                      </button>
                    );
                  })()}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={isReadOnly}
                  onClick={() => handleFileUpload(biddingCompany.company_id)}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              )}
            </div>
          </TableCell>
          <TableCell className="py-1">
            <DatePicker
              value={biddingCompany.due_date}
              onChange={() => {}}
              placeholder="mm/dd/yyyy"
              disabled={isReadOnly}
              companyId={biddingCompany.company_id}
              field="due_date"
            />
          </TableCell>
          <TableCell className="py-1">
            <DatePicker
              value={biddingCompany.reminder_date}
              onChange={() => {}}
              placeholder="mm/dd/yyyy"
              disabled={isReadOnly}
              companyId={biddingCompany.company_id}
              field="reminder_date"
            />
          </TableCell>
          <TableCell className="py-1">
            {!isReadOnly && (
              <DeleteButton
                onDelete={() => onDeleteCompany(biddingItemId, biddingCompany.company_id)}
                title="Remove Company"
                description={`Are you sure you want to remove "${biddingCompany.companies.company_name}" from this bidding item?`}
                size="sm"
                variant="ghost"
                showIcon={true}
              />
            )}
          </TableCell>
        </TableRow>
      ))}
      
      <FilePreviewModal
        isOpen={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        fileName={previewFile}
      />
    </>
  );
}

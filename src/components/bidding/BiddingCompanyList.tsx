
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteButton } from '@/components/ui/delete-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Building2, Upload, FileText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  isReadOnly?: boolean;
}

export function BiddingCompanyList({ 
  biddingItemId, 
  companies, 
  onToggleBidStatus, 
  isReadOnly = false 
}: BiddingCompanyListProps) {
  const [fileInputs, setFileInputs] = useState<Record<string, HTMLInputElement | null>>({});
  
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
        // Handle file upload logic here
        console.log('File selected:', file.name);
        // TODO: Implement file upload to server
      }
    };
    input.click();
  };

  const DatePicker = ({ 
    value, 
    onChange, 
    placeholder, 
    disabled 
  }: { 
    value: string | null; 
    onChange: (date: Date | undefined) => void; 
    placeholder: string;
    disabled?: boolean;
  }) => {
    const date = value ? new Date(value) : undefined;
    
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
            onSelect={onChange}
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
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <div className="font-medium text-sm whitespace-nowrap">
                {biddingCompany.companies.company_name}
              </div>
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
              type="number"
              placeholder="$0.00"
              value={biddingCompany.price || ''}
              className="w-24 h-8 text-sm"
              disabled={isReadOnly}
            />
          </TableCell>
          <TableCell className="py-1">
            <div className="flex items-center space-x-2">
              {biddingCompany.proposals ? (
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">{biddingCompany.proposals}</span>
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
              onChange={(date) => {
                // TODO: Implement date update logic
                console.log('Due date changed:', date);
              }}
              placeholder="mm/dd/yyyy"
              disabled={isReadOnly}
            />
          </TableCell>
          <TableCell className="py-1">
            <DatePicker
              value={biddingCompany.reminder_date}
              onChange={(date) => {
                // TODO: Implement date update logic
                console.log('Reminder date changed:', date);
              }}
              placeholder="mm/dd/yyyy"
              disabled={isReadOnly}
            />
          </TableCell>
          <TableCell className="py-1">
            {!isReadOnly && (
              <DeleteButton
                onDelete={() => {/* Handle delete company */}}
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
    </>
  );
}

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Edit, FileText, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayFromAny } from "@/utils/dateOnly";
import { EditExtractedBillDialog } from "./EditExtractedBillDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Helper function to format terms for display
const formatTerms = (terms: string | null | undefined): string => {
  if (!terms) return '-';
  const termsStr = String(terms).toLowerCase().trim();
  
  if (termsStr.includes('due') && termsStr.includes('receipt')) {
    return 'On Receipt';
  }
  
  const netMatch = termsStr.match(/net[\s-]*(\d+)/i);
  if (netMatch) {
    return `Net ${netMatch[1]}`;
  }
  
  return terms;
};

interface PendingBillLine {
  line_number: number;
  line_type: string;
  account_id?: string;
  account_name?: string;
  cost_code_id?: string;
  cost_code_name?: string;
  project_id?: string;
  project_name?: string;
  quantity?: number;
  unit_cost?: number;
  amount: number;
  memo?: string;
  description?: string;
}

interface PendingBill {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
  extracted_data?: any;
  vendor_id?: string;
  vendor_name?: string;
  bill_date?: string;
  due_date?: string;
  reference_number?: string;
  terms?: string;
  lines?: PendingBillLine[];
}

interface ProcessingUpload {
  id: string;
  file_name: string;
  status: 'pending' | 'processing';
}

interface BatchBillReviewTableProps {
  bills: PendingBill[];
  processingUploads?: ProcessingUpload[];
  onBillUpdate: (billId: string, updates: Partial<PendingBill>) => void;
  onBillDelete: (billId: string) => void;
  onLinesUpdate: (billId: string, lines: PendingBillLine[]) => void;
  selectedBillIds: Set<string>;
  onBillSelect: (billId: string) => void;
  onSelectAll: (selectAll: boolean) => void;
}

export function BatchBillReviewTable({ 
  bills,
  processingUploads = [], // Shows loading state for bills being extracted
  onBillUpdate, 
  onBillDelete,
  onLinesUpdate,
  selectedBillIds,
  onBillSelect,
  onSelectAll
}: BatchBillReviewTableProps) {
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [addingVendorForBillId, setAddingVendorForBillId] = useState<string | null>(null);
  const [addingVendorName, setAddingVendorName] = useState<string>("");
  const [vendorInitialData, setVendorInitialData] = useState<{
    phone_number?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    website?: string;
  } | undefined>(undefined);
  const { toast } = useToast();
  const { openBillAttachment } = useUniversalFilePreviewContext();

  // Helper to get extracted values (handles both snake_case and camelCase)
  const getExtractedValue = (bill: PendingBill, snakeCase: string, camelCase: string) => {
    // First check root level for backward compatibility
    if (bill[snakeCase as keyof PendingBill]) return bill[snakeCase as keyof PendingBill];
    // Then check extracted_data with both naming conventions
    if (!bill.extracted_data) return null;
    return bill.extracted_data[snakeCase] || bill.extracted_data[camelCase];
  };

  const validateBill = (bill: PendingBill) => {
    const issues: string[] = [];
    
    // Enhanced vendor validation
    const hasVendorName = bill.vendor_name || getExtractedValue(bill, 'vendor_name', 'vendor');
    const hasVendorId = bill.vendor_id || getExtractedValue(bill, 'vendor_id', 'vendorId');
    
    // Debug logging for vendor detection
    console.debug('Vendor check:', { 
      billId: bill.id, 
      vendorName: hasVendorName, 
      vendorId: hasVendorId 
    });
    
    if (!hasVendorId) {
      if (!hasVendorName) {
        issues.push("Vendor required");
      } else {
        issues.push("Vendor not in database");
      }
    }
    
    if (!bill.bill_date) issues.push("Bill date required");
    if (!bill.lines || bill.lines.length === 0) issues.push("At least one line item required");
    
    // Check line items
    bill.lines?.forEach((line, idx) => {
      if (line.line_type === 'expense' && !line.account_id) {
        issues.push(`Line ${idx + 1}: Account required`);
      }
      if (line.line_type === 'job_cost' && !line.cost_code_id) {
        issues.push(`Line ${idx + 1}: Cost code required`);
      }
    });
    
    return issues;
  };

  const parseUSAddress = (addressStr: string) => {
    // Normalize: replace newlines with spaces, collapse multiple spaces
    const normalized = addressStr.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Check for suite/unit/apt patterns and extract to address_line_2
    const suitePattern = /\b(suite|ste|unit|apt|apartment|#)\s+([^\s,]+)/i;
    const suiteMatch = normalized.match(suitePattern);
    let address_line_2: string | undefined;
    let cleanedAddress = normalized;
    
    if (suiteMatch) {
      address_line_2 = suiteMatch[0].trim(); // e.g., "Suite 200"
      cleanedAddress = normalized.replace(suiteMatch[0], '').replace(/\s+/g, ' ').trim();
    }
    
    // Try to extract state and zip using regex (handles various formats)
    const stateZipMatch = cleanedAddress.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
    
    if (stateZipMatch) {
      const state = stateZipMatch[1];
      const zip = stateZipMatch[2];
      const beforeStateZip = cleanedAddress.substring(0, stateZipMatch.index).trim();
      
      // Check if there are commas (traditional format)
      if (beforeStateZip.includes(',')) {
        const parts = beforeStateZip.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          return {
            address_line_1: parts[0],
            address_line_2,
            city: parts[parts.length - 1],
            state,
            zip_code: zip,
          };
        } else if (parts.length === 1) {
          return {
            address_line_1: parts[0],
            address_line_2,
            state,
            zip_code: zip,
          };
        }
      } else {
        // No commas - try to extract city as the word(s) before state
        // Pattern: "123 Main St SomeCity ST ZIP"
        const cityMatch = beforeStateZip.match(/^(.+)\s+([A-Za-z\s]+)$/);
        if (cityMatch) {
          return {
            address_line_1: cityMatch[1].trim(),
            address_line_2,
            city: cityMatch[2].trim(),
            state,
            zip_code: zip,
          };
        } else {
          return {
            address_line_1: beforeStateZip,
            address_line_2,
            state,
            zip_code: zip,
          };
        }
      }
    }
    
    // Fallback: no state/zip found, try comma-separated
    if (cleanedAddress.includes(',')) {
      const parts = cleanedAddress.split(',').map(p => p.trim()).filter(p => p);
      if (parts.length >= 2) {
        return {
          address_line_1: parts[0],
          address_line_2,
          city: parts[1],
        };
      }
    }
    
    // Ultimate fallback: just use as address line 1
    return {
      address_line_1: cleanedAddress,
      address_line_2,
    };
  };

  const handleAddVendor = async (billId: string, vendorName: string) => {
    // Find the bill to extract vendor data
    const bill = bills.find(b => b.id === billId);
    
    // Helper to get contact info with flexible key checking
    const getContact = (data: any, snakeKey: string, camelKey: string) => {
      return data?.[snakeKey] || data?.[camelKey];
    };
    
    if (bill) {
      const data = bill.extracted_data as any;
      
      // Try to get contact info from extracted_data
      let vendorAddress = getContact(data, 'vendor_address', 'vendorAddress');
      let vendorPhone = getContact(data, 'vendor_phone', 'vendorPhone');
      let vendorWebsite = getContact(data, 'vendor_website', 'vendorWebsite');
      
      // If no contact info found, try enriching
      if (!vendorAddress && !vendorPhone && !vendorWebsite) {
        console.debug('No contact info found, attempting enrichment...');
        
        try {
          // Call extract-bill-data with enrichContactOnly flag
          const { error: enrichError } = await supabase.functions.invoke('extract-bill-data', {
            body: {
              pendingUploadId: billId,
              enrichContactOnly: true
            }
          });
          
          if (enrichError) {
            console.error('Error enriching contact:', enrichError);
          } else {
            // Refetch the pending upload to get updated extracted_data
            const { data: updatedBill, error: fetchError } = await supabase
              .from('pending_bill_uploads')
              .select('extracted_data')
              .eq('id', billId)
              .single();
            
            if (!fetchError && updatedBill?.extracted_data) {
              const enrichedData = updatedBill.extracted_data as any;
              vendorAddress = getContact(enrichedData, 'vendor_address', 'vendorAddress');
              vendorPhone = getContact(enrichedData, 'vendor_phone', 'vendorPhone');
              vendorWebsite = getContact(enrichedData, 'vendor_website', 'vendorWebsite');
              console.debug('Enriched contact data:', { vendorAddress, vendorPhone, vendorWebsite });
            }
          }
        } catch (err) {
          console.error('Error during contact enrichment:', err);
        }
      }
      
      // Parse address if available
      let addressData = {};
      if (vendorAddress) {
        addressData = parseUSAddress(vendorAddress as string);
      }
      
      const initialData = {
        phone_number: vendorPhone || undefined,
        website: vendorWebsite || undefined,
        ...addressData,
      };
      
      console.debug('Setting vendor initial data:', initialData);
      setVendorInitialData(initialData);
    } else {
      setVendorInitialData(undefined);
    }
    
    setAddingVendorForBillId(billId);
    // Normalize vendor name: replace newlines/multiple spaces with single space
    setAddingVendorName(String(vendorName).replace(/\s+/g, ' ').trim());
  };

  const handleVendorCreated = async (companyId: string, companyName: string) => {
    if (addingVendorForBillId) {
      onBillUpdate(addingVendorForBillId, {
        vendor_id: companyId,
        vendor_name: companyName
      });
      
      // Save vendor alias for future recognition
      const bill = bills.find(b => b.id === addingVendorForBillId);
      const originalVendorName = bill?.extracted_data?.vendor_name || bill?.extracted_data?.vendor || addingVendorName;
      
      if (originalVendorName && originalVendorName.trim()) {
        try {
          // Normalize the alias
          const normalizedAlias = originalVendorName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company)\b/gi, '')
            .trim();
          
          // Get current user to determine owner_id
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error('No authenticated user for alias save');
            return;
          }
          
          // Get effective owner ID (owner or home_builder_id if employee)
          const { data: userData } = await supabase
            .from('users')
            .select('role, home_builder_id')
            .eq('id', user.id)
            .single();
          
          const effectiveOwnerId = (userData?.role === 'employee' && userData?.home_builder_id)
            ? userData.home_builder_id
            : user.id;
          
          // Upsert the alias (idempotent - won't fail if already exists)
          const { error: aliasError } = await supabase
            .from('vendor_aliases')
            .upsert({
              owner_id: effectiveOwnerId,
              company_id: companyId,
              alias: originalVendorName.trim(),
              normalized_alias: normalizedAlias,
            }, {
              onConflict: 'owner_id,normalized_alias'
            });
          
          if (aliasError) {
            console.error('Failed to save vendor alias:', aliasError);
          } else {
            console.log(`Saved vendor alias: "${originalVendorName}" → ${companyName}`);
          }
        } catch (err) {
          console.error('Error saving vendor alias:', err);
        }
      }
      
      toast({
        title: "Vendor added",
        description: `${companyName} has been added and linked to the bill.`,
      });
    }
    
    setAddingVendorForBillId(null);
    setAddingVendorName("");
  };


  const allSelected = bills.length > 0 && bills.every(bill => selectedBillIds.has(bill.id));
  const someSelected = bills.some(bill => selectedBillIds.has(bill.id)) && !allSelected;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="w-12 px-2 py-0 text-xs font-medium">
                <Checkbox
                  checked={allSelected}
                  ref={(el: any) => {
                    if (el) {
                      el.indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  aria-label="Select all bills"
                />
              </TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Vendor</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Reference #</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Terms</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Due Date</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Cost Code</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Total</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">File</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Issues</TableHead>
              <TableHead className="px-3 py-0 text-xs font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Processing uploads skeleton rows */}
            {processingUploads.map((upload) => (
              <TableRow key={upload.id} className="bg-blue-50/50">
                <TableCell className="px-2 py-3">
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell className="px-3 py-3">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className="px-3 py-3">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell colSpan={6} className="px-3 py-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-red-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Extracting...</span>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-3">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="px-3 py-3">
                  <Skeleton className="h-8 w-16" />
                </TableCell>
              </TableRow>
            ))}
            
            {/* Show empty state only if no bills AND no processing uploads */}
            {bills.length === 0 && processingUploads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-3 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No bills uploaded yet</p>
                    <p className="text-xs mt-1">Upload PDF files above to extract bill data automatically</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => {
              const issues = validateBill(bill);
              
              // Get total from extracted data or calculate from line amounts
              const extractedTotal = getExtractedValue(bill, 'total_amount', 'totalAmount');
              const totalAmount = extractedTotal 
                ? (typeof extractedTotal === 'string' ? parseFloat(extractedTotal) : extractedTotal)
                : (bill.lines?.reduce((sum, line) => sum + (line.amount || 0), 0) || 0);
              
              // Calculate account/cost code display
              const accountDisplay = (() => {
                if (!bill.lines || bill.lines.length === 0) return null;
                
                // Collect display names - these are already formatted with codes
                const displayNames = bill.lines
                  .map(line => {
                    if (line.line_type === 'job_cost') return line.cost_code_name;
                    if (line.line_type === 'expense') return line.account_name;
                    return null;
                  })
                  .filter(Boolean);
                
                if (displayNames.length === 0) return null;
                const uniqueNames = [...new Set(displayNames)];
                return uniqueNames.length === 1 ? uniqueNames[0] : `${uniqueNames.length} items`;
              })();
              
              const vendorName = getExtractedValue(bill, 'vendor_name', 'vendor');
              const vendorId = bill.vendor_id || getExtractedValue(bill, 'vendor_id', 'vendorId');
              const referenceNumber = getExtractedValue(bill, 'reference_number', 'referenceNumber');
              const billDate = getExtractedValue(bill, 'bill_date', 'billDate');
              const dueDate = getExtractedValue(bill, 'due_date', 'dueDate');
              
              return (
                <TableRow key={bill.id} className="h-10 bg-gray-50 hover:bg-gray-50">
                  <TableCell className="px-2 py-1">
                    <Checkbox
                      checked={selectedBillIds.has(bill.id)}
                      onCheckedChange={() => onBillSelect(bill.id)}
                      aria-label={`Select bill from ${vendorName}`}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    {!vendorId && vendorName ? (
                      <button
                        onClick={() => handleAddVendor(bill.id, vendorName as string)}
                        className="flex items-center gap-1 px-2 py-1 -mx-2 -my-1 rounded hover:bg-red-50 transition-colors cursor-pointer w-full"
                        title="Add vendor to database"
                      >
                        <span className="text-xs text-red-600 font-medium">{vendorName}</span>
                        <Plus className="h-3 w-3 text-red-600" />
                      </button>
                    ) : (
                      <span className="text-xs">{vendorName || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <span className="text-xs">{referenceNumber || '-'}</span>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <span className="text-xs">{billDate ? formatDisplayFromAny(billDate as string) : '-'}</span>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <span className="text-xs">{formatTerms(getExtractedValue(bill, 'terms', 'terms') as string)}</span>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <span className="text-xs">{dueDate ? formatDisplayFromAny(dueDate as string) : '-'}</span>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    {accountDisplay === null ? (
                      <span className="text-xs text-red-600 font-medium">NONE</span>
                    ) : (
                      <span className="text-xs">{accountDisplay}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <span className="text-xs font-medium">${totalAmount.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <div className="relative group inline-block">
                      <button
                        onClick={() => {
                          const displayName = bill.file_name.split('/').pop() || bill.file_name;
                          openBillAttachment(bill.file_path, displayName);
                        }}
                        className={`${getFileIconColor(bill.file_name)} transition-colors p-1`}
                        title={bill.file_name}
                        type="button"
                      >
                        {(() => {
                          const IconComponent = getFileIcon(bill.file_name);
                          return <IconComponent className="h-4 w-4" />;
                        })()}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBillDelete(bill.id);
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center transition-opacity"
                        title="Delete file"
                        type="button"
                      >
                        <span className="text-xs font-bold leading-none">×</span>
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    {issues.length > 0 ? (
                      <span className="text-xs text-red-600">{issues.length}</span>
                    ) : (
                      <span className="text-xs text-green-600">Ready</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingBillId(bill.id)}
                        title="Edit bill"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onBillDelete(bill.id)}
                        title="Delete bill"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
            )}
          </TableBody>
        </Table>
      </div>
      
      {editingBillId && (
        <EditExtractedBillDialog
          open={!!editingBillId}
          onOpenChange={(open) => !open && setEditingBillId(null)}
          pendingUploadId={editingBillId}
        />
      )}

      {addingVendorForBillId && (
        <AddCompanyDialog
          open={!!addingVendorForBillId}
          onOpenChange={(open) => {
            if (!open) {
              setAddingVendorForBillId(null);
              setAddingVendorName("");
              setVendorInitialData(undefined);
            }
          }}
          initialCompanyName={addingVendorName}
          initialData={vendorInitialData}
          onCompanyCreated={handleVendorCreated}
        />
      )}
    </div>
  );
}

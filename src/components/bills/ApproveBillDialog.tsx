import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePendingBills } from "@/hooks/usePendingBills";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ExtractedData {
  vendor_name?: string;
  [key: string]: any;
}

interface ApproveBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUploadId: string;
  projectId?: string;
}

export const ApproveBillDialog = ({
  open,
  onOpenChange,
  pendingUploadId,
  projectId: initialProjectId,
}: ApproveBillDialogProps) => {
  const { approveBill } = usePendingBills();
  const { toast } = useToast();
  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [extractedVendorName, setExtractedVendorName] = useState<string | null>(null);

  // Update projectId when initialProjectId changes
  useEffect(() => {
    if (initialProjectId) {
      setProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  // Fetch pending upload data and auto-match vendor
  useEffect(() => {
    if (!open || !pendingUploadId) return;

    const fetchAndMatchVendor = async () => {
      try {
        // Fetch pending upload data
        const { data: upload, error } = await supabase
          .from("pending_bill_uploads")
          .select("extracted_data")
          .eq("id", pendingUploadId)
          .single();

        if (error) throw error;

        const extractedData = upload?.extracted_data as ExtractedData | null;
        const vendorName = extractedData?.vendor_name;
        if (!vendorName) return;

        setExtractedVendorName(vendorName);

        // Search for matching vendor in companies table
        const { data: companies, error: searchError } = await supabase
          .from("companies")
          .select("id, company_name, terms")
          .ilike("company_name", `%${vendorName}%`)
          .limit(5);

        if (searchError) throw searchError;

        // Auto-populate if exact match found
        const exactMatch = companies?.find(
          (c) => c.company_name.toLowerCase() === vendorName.toLowerCase()
        );

        if (exactMatch) {
          setVendorId(exactMatch.id);
          // Auto-populate terms from vendor if available
          if (exactMatch.terms) {
            setTerms(exactMatch.terms);
          }
          toast({ title: "Success", description: `Auto-matched vendor: ${exactMatch.company_name}` });
        } else if (companies && companies.length > 0) {
          // Partial match - auto-select the first one
          setVendorId(companies[0].id);
          // Auto-populate terms from vendor if available
          if (companies[0].terms) {
            setTerms(companies[0].terms);
          }
          toast({ title: "Info", description: `Selected vendor: ${companies[0].company_name}` });
        }
      } catch (error) {
        console.error("Error fetching vendor data:", error);
      }
    };

    fetchAndMatchVendor();
  }, [open, pendingUploadId]);

  // Auto-populate terms when vendor is manually selected
  useEffect(() => {
    const fetchVendorTerms = async () => {
      if (!vendorId) return;
      
      const { data: company } = await supabase
        .from('companies')
        .select('terms')
        .eq('id', vendorId)
        .single();
      
      if (company?.terms) {
        setTerms(company.terms);
      }
    };
    
    fetchVendorTerms();
  }, [vendorId]);

  const handleApprove = () => {
    if (!vendorId) {
      alert('Please select a vendor');
      return;
    }

    if (!projectId) {
      alert('Please select a project');
      return;
    }

    approveBill.mutate(
      {
        pendingUploadId,
        vendorId,
        projectId,
        billDate: format(billDate, 'yyyy-MM-dd'),
        dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        referenceNumber,
        terms,
        notes,
        reviewNotes,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setVendorId("");
          setBillDate(new Date());
          setDueDate(undefined);
          setReferenceNumber("");
          setTerms("");
          setNotes("");
          setReviewNotes("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approve Bill</DialogTitle>
          <DialogDescription>
            Complete the bill details to approve and create the bill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vendor">Vendor *</Label>
              {extractedVendorName && !vendorId && (
                <Badge variant="outline" className="text-xs">
                  Detected: {extractedVendorName}
                </Badge>
              )}
            </div>
            <VendorSearchInput
              value={vendorId}
              onChange={setVendorId}
              placeholder="Select vendor"
            />
            {extractedVendorName && !vendorId && (
              <p className="text-sm text-muted-foreground">
                No matching vendor found. Please create the vendor "{extractedVendorName}" in the Companies page first, or select a different vendor.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <JobSearchInput
              value={projectId}
              onChange={setProjectId}
              placeholder="Select project"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bill Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !billDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={billDate}
                    onSelect={(date) => date && setBillDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Invoice #, PO #, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <Input
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Net 30, Due on Receipt, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Bill Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes to attach to the bill..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-notes">Approval Notes for Accountant (Optional)</Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any notes about this approval for the accountant..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              These notes will help the accountant understand any special circumstances about this bill.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={!vendorId || !projectId}>
            Approve & Create Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

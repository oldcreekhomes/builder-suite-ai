import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Shield, AlertTriangle, CheckCircle2, XCircle, Upload } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { InsuranceCertificateUpload, ExtractedInsuranceData } from "./InsuranceCertificateUpload";
import { InsuranceCertificateReviewDialog } from "./InsuranceCertificateReviewDialog";

interface InsuranceRecord {
  id?: string;
  company_id: string;
  insurance_type: string;
  expiration_date: string;
  policy_number: string | null;
  carrier_name: string | null;
  coverage_amount: number | null;
  home_builder_id: string;
}

interface CompanyInsuranceSectionProps {
  companyId: string | null;
  homeBuilder: string;
}

interface InsuranceContentProps {
  companyId: string | null;
  homeBuilder: string;
  onExtractedDataChange?: (data: ExtractedInsuranceData | null, pendingUploadId: string | null) => void;
}

const INSURANCE_TYPES = [
  { key: "commercial_general_liability", label: "Commercial General Liability" },
  { key: "automobile_liability", label: "Automobile Liability" },
  { key: "umbrella_liability", label: "Umbrella Liability" },
  { key: "workers_compensation", label: "Worker's Compensation" },
] as const;

type InsuranceType = typeof INSURANCE_TYPES[number]["key"];

interface InsuranceFormData {
  expiration_date: string;
  policy_number: string;
  carrier_name: string;
}

function getInsuranceStatus(expirationDate: string | null): "current" | "expiring" | "expired" | "not_set" {
  if (!expirationDate) return "not_set";
  
  const today = new Date();
  const expiry = parseISO(expirationDate);
  const daysUntilExpiry = differenceInDays(expiry, today);
  
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 30) return "expiring";
  return "current";
}

function getStatusBadge(status: "current" | "expiring" | "expired" | "not_set") {
  switch (status) {
    case "current":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "expiring":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "expired":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

// Standalone content component for use in tabs
export function InsuranceContent({ companyId, homeBuilder, onExtractedDataChange }: InsuranceContentProps) {
  const [formData, setFormData] = useState<Record<InsuranceType, InsuranceFormData>>({
    commercial_general_liability: { expiration_date: "", policy_number: "", carrier_name: "" },
    automobile_liability: { expiration_date: "", policy_number: "", carrier_name: "" },
    umbrella_liability: { expiration_date: "", policy_number: "", carrier_name: "" },
    workers_compensation: { expiration_date: "", policy_number: "", carrier_name: "" },
  });
  const [showUpload, setShowUpload] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedInsuranceData | null>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing insurance records
  const { data: insurances, isLoading } = useQuery({
    queryKey: ["company-insurances", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_insurances")
        .select("*")
        .eq("company_id", companyId);
      
      if (error) throw error;
      return data as InsuranceRecord[];
    },
    enabled: !!companyId,
  });

  // Initialize form data when insurances load
  useEffect(() => {
    if (insurances) {
      const newFormData = { ...formData };
      insurances.forEach((ins) => {
        const type = ins.insurance_type as InsuranceType;
        if (newFormData[type]) {
          newFormData[type] = {
            expiration_date: ins.expiration_date || "",
            policy_number: ins.policy_number || "",
            carrier_name: ins.carrier_name || "",
          };
        }
      });
      setFormData(newFormData);
    }
  }, [insurances]);

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async (data: { type: InsuranceType; values: InsuranceFormData }) => {
      if (!companyId || !data.values.expiration_date) return;

      const existingRecord = insurances?.find(i => i.insurance_type === data.type);
      
      if (existingRecord) {
        const { error } = await supabase
          .from("company_insurances")
          .update({
            expiration_date: data.values.expiration_date,
            policy_number: data.values.policy_number || null,
            carrier_name: data.values.carrier_name || null,
          })
          .eq("id", existingRecord.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_insurances")
          .insert({
            company_id: companyId,
            insurance_type: data.type,
            expiration_date: data.values.expiration_date,
            policy_number: data.values.policy_number || null,
            carrier_name: data.values.carrier_name || null,
            home_builder_id: homeBuilder,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-insurances", companyId] });
      toast({ title: "Insurance updated", description: "Insurance information has been saved." });
    },
    onError: (error) => {
      console.error("Error saving insurance:", error);
      toast({ title: "Error", description: "Failed to save insurance information.", variant: "destructive" });
    },
  });

  // Bulk save mutation for extracted data
  const bulkSaveMutation = useMutation({
    mutationFn: async (coverages: ExtractedInsuranceData['coverages']) => {
      if (!companyId) return;

      for (const coverage of coverages) {
        if (!coverage.expiration_date) continue;

        const existingRecord = insurances?.find(i => i.insurance_type === coverage.type);
        
        if (existingRecord) {
          const { error } = await supabase
            .from("company_insurances")
            .update({
              expiration_date: coverage.expiration_date,
              policy_number: coverage.policy_number || null,
              carrier_name: coverage.insurer_name || null,
            })
            .eq("id", existingRecord.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("company_insurances")
            .insert({
              company_id: companyId,
              insurance_type: coverage.type,
              expiration_date: coverage.expiration_date,
              policy_number: coverage.policy_number || null,
              carrier_name: coverage.insurer_name || null,
              home_builder_id: homeBuilder,
            });
          
          if (error) throw error;
        }
      }

      // Update pending upload status to completed
      if (pendingUploadId) {
        await supabase
          .from("pending_insurance_uploads")
          .update({ status: 'completed' })
          .eq("id", pendingUploadId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-insurances", companyId] });
      toast({ title: "Insurance saved", description: "All insurance records have been updated." });
      setShowUpload(false);
      setExtractedData(null);
      setPendingUploadId(null);
    },
    onError: (error) => {
      console.error("Error saving insurance:", error);
      toast({ title: "Error", description: "Failed to save insurance information.", variant: "destructive" });
    },
  });

  const handleFieldChange = (type: InsuranceType, field: keyof InsuranceFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const handleSave = (type: InsuranceType) => {
    const values = formData[type];
    if (values.expiration_date) {
      upsertMutation.mutate({ type, values });
    }
  };

  const handleExtractionComplete = (data: ExtractedInsuranceData, uploadId: string) => {
    setExtractedData(data);
    setPendingUploadId(uploadId);
    setReviewDialogOpen(true);
  };

  const handleConfirmExtraction = (data: ExtractedInsuranceData) => {
    // If we have a companyId, save to database
    if (companyId) {
      bulkSaveMutation.mutate(data.coverages);
    } else {
      // For new companies, pass the data to parent and close dialog
      if (onExtractedDataChange) {
        onExtractedDataChange(data, pendingUploadId);
      }
      setReviewDialogOpen(false);
      setExtractedData(data); // Keep the data to show what was extracted
    }
  };

  // Show upload UI for both new companies and existing companies
  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-full max-w-md">
          <InsuranceCertificateUpload
            companyId={null}
            homeBuilder={homeBuilder}
            onExtractionComplete={handleExtractionComplete}
          />
          {extractedData && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                ✓ Insurance certificate processed - {extractedData.coverages.length} coverage(s) extracted
              </p>
              <p className="text-xs text-green-600 mt-1">
                Data will be saved when company is created
              </p>
            </div>
          )}
        </div>

        <InsuranceCertificateReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          extractedData={extractedData}
          onConfirm={handleConfirmExtraction}
        />
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading insurance data...</div>;
  }

  const hasInsuranceRecords = insurances && insurances.length > 0;

  return (
    <div className="space-y-4">
      {/* Display existing insurance records */}
      {hasInsuranceRecords && !showUpload && (
        <div className="space-y-4">
          <div className="border rounded-md overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1.6fr_0.8fr_1fr_0.6fr_0.5fr] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
              <span>Coverage Type</span>
              <span>Policy #</span>
              <span>Carrier</span>
              <span>Expiration</span>
              <span>Status</span>
            </div>
            {/* Data rows */}
            <div>
              {INSURANCE_TYPES.map(({ key, label }) => {
                const record = insurances?.find(i => i.insurance_type === key);
                const status = getInsuranceStatus(record?.expiration_date || null);
                
                return (
                  <div 
                    key={key} 
                    className="grid grid-cols-[1.6fr_0.8fr_1fr_0.6fr_0.5fr] gap-2 px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <span className="truncate font-medium flex items-center gap-2 text-xs">
                      {getStatusBadge(status)}
                      {label}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {record?.policy_number || "—"}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
                      {record?.carrier_name || "—"}
                    </span>
                    <span className="truncate text-xs">
                      {record?.expiration_date 
                        ? format(new Date(record.expiration_date), 'MM/dd/yy')
                        : "—"}
                    </span>
                    <span className={cn(
                      "truncate text-xs",
                      status === "current" ? "text-green-600" :
                      status === "expiring" ? "text-yellow-600" :
                      status === "expired" ? "text-red-600" :
                      "text-muted-foreground"
                    )}>
                      {status === "current" ? "Current" :
                       status === "expiring" ? "Expiring" :
                       status === "expired" ? "Expired" :
                       "Not Set"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowUpload(true)}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New Certificate
          </Button>
        </div>
      )}

      {/* Show upload UI when no records exist or user clicked upload button */}
      {(!hasInsuranceRecords || showUpload) && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-full max-w-md">
            {showUpload && hasInsuranceRecords && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
                className="mb-4"
              >
                ← Back to Insurance Records
              </Button>
            )}
            <InsuranceCertificateUpload
              companyId={companyId}
              homeBuilder={homeBuilder}
              onExtractionComplete={handleExtractionComplete}
            />
          </div>
        </div>
      )}

      <InsuranceCertificateReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        extractedData={extractedData}
        onConfirm={handleConfirmExtraction}
      />
    </div>
  );
}

// Original collapsible component for backwards compatibility
export function CompanyInsuranceSection({ companyId, homeBuilder }: CompanyInsuranceSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Record<InsuranceType, InsuranceFormData>>({
    commercial_general_liability: { expiration_date: "", policy_number: "", carrier_name: "" },
    automobile_liability: { expiration_date: "", policy_number: "", carrier_name: "" },
    umbrella_liability: { expiration_date: "", policy_number: "", carrier_name: "" },
    workers_compensation: { expiration_date: "", policy_number: "", carrier_name: "" },
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing insurance records
  const { data: insurances, isLoading } = useQuery({
    queryKey: ["company-insurances", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("company_insurances")
        .select("*")
        .eq("company_id", companyId);
      
      if (error) throw error;
      return data as InsuranceRecord[];
    },
    enabled: !!companyId,
  });

  // Initialize form data when insurances load
  useEffect(() => {
    if (insurances) {
      const newFormData = { ...formData };
      insurances.forEach((ins) => {
        const type = ins.insurance_type as InsuranceType;
        if (newFormData[type]) {
          newFormData[type] = {
            expiration_date: ins.expiration_date || "",
            policy_number: ins.policy_number || "",
            carrier_name: ins.carrier_name || "",
          };
        }
      });
      setFormData(newFormData);
    }
  }, [insurances]);

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async (data: { type: InsuranceType; values: InsuranceFormData }) => {
      if (!companyId || !data.values.expiration_date) return;

      const existingRecord = insurances?.find(i => i.insurance_type === data.type);
      
      if (existingRecord) {
        const { error } = await supabase
          .from("company_insurances")
          .update({
            expiration_date: data.values.expiration_date,
            policy_number: data.values.policy_number || null,
            carrier_name: data.values.carrier_name || null,
          })
          .eq("id", existingRecord.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_insurances")
          .insert({
            company_id: companyId,
            insurance_type: data.type,
            expiration_date: data.values.expiration_date,
            policy_number: data.values.policy_number || null,
            carrier_name: data.values.carrier_name || null,
            home_builder_id: homeBuilder,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-insurances", companyId] });
      toast({ title: "Insurance updated", description: "Insurance information has been saved." });
    },
    onError: (error) => {
      console.error("Error saving insurance:", error);
      toast({ title: "Error", description: "Failed to save insurance information.", variant: "destructive" });
    },
  });

  // Calculate summary status for the badge
  const getSummaryStatus = (): { icon: React.ReactNode; text: string } => {
    if (!insurances || insurances.length === 0) {
      return { icon: null, text: "No insurance configured" };
    }

    const statuses = insurances.map(ins => getInsuranceStatus(ins.expiration_date));
    const expiredCount = statuses.filter(s => s === "expired").length;
    const expiringCount = statuses.filter(s => s === "expiring").length;

    if (expiredCount > 0) {
      return { 
        icon: <XCircle className="h-4 w-4 text-red-500" />, 
        text: `${expiredCount} expired` 
      };
    }
    if (expiringCount > 0) {
      return { 
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, 
        text: `${expiringCount} expiring soon` 
      };
    }
    return { 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, 
      text: "All current" 
    };
  };

  const handleFieldChange = (type: InsuranceType, field: keyof InsuranceFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const handleSave = (type: InsuranceType) => {
    const values = formData[type];
    if (values.expiration_date) {
      upsertMutation.mutate({ type, values });
    }
  };

  if (!companyId) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Insurance information will be available after the company is created.</span>
        </div>
      </div>
    );
  }

  const summaryStatus = getSummaryStatus();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-muted/50">
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Shield className="h-4 w-4" />
            <span className="font-medium">Insurance & Compliance</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {summaryStatus.icon}
            <span>{summaryStatus.text}</span>
          </div>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading insurance data...</div>
        ) : (
          INSURANCE_TYPES.map(({ key, label }) => {
            const existingRecord = insurances?.find(i => i.insurance_type === key);
            const status = getInsuranceStatus(existingRecord?.expiration_date || formData[key].expiration_date || null);
            
            return (
              <div key={key} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{label}</span>
                    {getStatusBadge(status)}
                  </div>
                  {formData[key].expiration_date && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleSave(key)}
                      disabled={upsertMutation.isPending}
                    >
                      {upsertMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Expiration Date</Label>
                    <Input
                      type="date"
                      value={formData[key].expiration_date}
                      onChange={(e) => handleFieldChange(key, "expiration_date", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Policy Number</Label>
                    <Input
                      placeholder="Enter policy #"
                      value={formData[key].policy_number}
                      onChange={(e) => handleFieldChange(key, "policy_number", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Carrier Name</Label>
                    <Input
                      placeholder="Enter carrier"
                      value={formData[key].carrier_name}
                      onChange={(e) => handleFieldChange(key, "carrier_name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                {status === "expired" && (
                  <p className="text-xs text-red-500">This insurance has expired!</p>
                )}
                {status === "expiring" && existingRecord && (
                  <p className="text-xs text-yellow-600">
                    Expires in {differenceInDays(parseISO(existingRecord.expiration_date), new Date())} days
                  </p>
                )}
              </div>
            );
          })
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

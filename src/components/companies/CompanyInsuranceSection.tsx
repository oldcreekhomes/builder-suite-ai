import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Shield, AlertTriangle, CheckCircle2, XCircle, Upload } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
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
export function InsuranceContent({ companyId, homeBuilder }: InsuranceContentProps) {
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
    bulkSaveMutation.mutate(data.coverages);
  };

  if (!companyId) {
    return (
      <div className="border rounded-lg p-6 bg-muted/30">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <Shield className="h-10 w-10 text-muted-foreground" />
          <div>
            <h3 className="font-medium text-foreground">Insurance & Compliance</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Insurance information will be available after the company is created.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Loading insurance data...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-md">
        <InsuranceCertificateUpload
          companyId={companyId}
          homeBuilder={homeBuilder}
          onExtractionComplete={handleExtractionComplete}
        />
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

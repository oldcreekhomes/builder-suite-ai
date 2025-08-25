import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, X, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CompanySearchInput } from "./CompanySearchInput";
import { CostCodeSearchInput } from "./CostCodeSearchInput";

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
  editOrder?: any;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
}

export const CreatePurchaseOrderDialog = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
  editOrder,
}: CreatePurchaseOrderDialogProps) => {
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [selectedCostCode, setSelectedCostCode] = useState<{ id: string; code: string; name: string } | null>(null);
  const [extra, setExtra] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Pre-populate form when editing
  useEffect(() => {
    if (editOrder && open) {
      setSelectedCompany({
        id: editOrder.companies?.id,
        name: editOrder.companies?.company_name
      });
      setSelectedCostCode({
        id: editOrder.cost_codes?.id,
        code: editOrder.cost_codes?.code,
        name: editOrder.cost_codes?.name
      });
      setExtra(editOrder.extra || false);
      setAmount(editOrder.total_amount?.toString() || "");
      setNotes(editOrder.notes || "");
      setUploadedFiles(editOrder.files || []);
    } else if (!editOrder && open) {
      // Reset form for new order
      setSelectedCompany(null);
      setSelectedCostCode(null);
      setExtra(false);
      setAmount("");
      setNotes("");
      setUploadedFiles([]);
    }
  }, [editOrder, open]);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of files) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB. Please select a smaller file.`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `purchase-orders/${projectId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "Error",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        const newFile: UploadedFile = {
          id: fileName,
          name: file.name,
          size: file.size,
          url: publicUrl,
        };

        setUploadedFiles(prev => [...prev, newFile]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    disabled: isUploading,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = async (fileToRemove: UploadedFile) => {
    try {
      const filePath = `purchase-orders/${projectId}/${fileToRemove.id}`;
      await supabase.storage
        .from('project-files')
        .remove([filePath]);

      setUploadedFiles(prev => prev.filter(file => file.id !== fileToRemove.id));
    } catch (error) {
      console.error('Error removing file:', error);
      toast({
        title: "Error",
        description: "Failed to remove file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedCompany || !selectedCostCode) {
      toast({
        title: "Validation Error",
        description: "Please select both a company and cost code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editOrder) {
        // Update existing purchase order
        const { data, error } = await supabase
          .from('project_purchase_orders')
          .update({
            company_id: selectedCompany.id,
            cost_code_id: selectedCostCode.id,
            extra,
            total_amount: amount ? parseFloat(amount) : null,
            notes: notes.trim() || null,
            files: JSON.parse(JSON.stringify(uploadedFiles)),
          })
          .eq('id', editOrder.id)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Purchase order updated successfully",
        });
      } else {
        // Create new purchase order
        const { data, error } = await supabase
          .from('project_purchase_orders')
          .insert([{
            project_id: projectId,
            company_id: selectedCompany.id,
            cost_code_id: selectedCostCode.id,
            extra,
            total_amount: amount ? parseFloat(amount) : null,
            notes: notes.trim() || null,
            files: JSON.parse(JSON.stringify(uploadedFiles)),
          }])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Success",
          description: "Purchase order created successfully",
        });
      }

      // Reset form
      setSelectedCompany(null);
      setSelectedCostCode(null);
      setExtra(false);
      setAmount("");
      setNotes("");
      setUploadedFiles([]);
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editOrder ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company and Cost Code Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <CompanySearchInput
                value={selectedCompany?.name || ""}
                onChange={() => {}}
                onCompanySelect={(company) => setSelectedCompany(company)}
                placeholder="Search for a company..."
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost-code">Cost Code *</Label>
              <CostCodeSearchInput
                value={selectedCostCode ? `${selectedCostCode.code} - ${selectedCostCode.name}` : ""}
                onChange={(value) => {
                  // If the value is cleared, reset the selected cost code
                  if (!value) {
                    setSelectedCostCode(null);
                  }
                }}
                onCostCodeSelect={(costCode) => setSelectedCostCode(costCode)}
                placeholder="Search for a cost code..."
                className="w-full"
              />
            </div>
          </div>

          {/* Extra and Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Extra</Label>
              <RadioGroup
                value={extra ? "yes" : "no"}
                onValueChange={(value) => setExtra(value === "yes")}
                className="flex flex-row space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="extra-no" />
                  <Label htmlFor="extra-no">No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="extra-yes" />
                  <Label htmlFor="extra-yes">Yes</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes..."
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label>Attachments</Label>
            
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                isDragActive 
                  ? 'border-primary/50 bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <Upload className={`mx-auto h-8 w-8 mb-2 ${
                  isDragActive ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className="text-sm text-muted-foreground">
                  {isUploading 
                    ? "Uploading..." 
                    : isDragActive 
                      ? "Drop files here..." 
                      : "Click to upload files or drag and drop"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, XLS, images up to 10MB each
                </p>
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({uploadedFiles.length})</Label>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedCompany || !selectedCostCode}
          >
            {isSubmitting ? (editOrder ? "Updating..." : "Creating...") : (editOrder ? "Update Purchase Order" : "Create Purchase Order")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
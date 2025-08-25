import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CompanySearchInput } from "./CompanySearchInput";
import { CostCodeSearchInput } from "./CostCodeSearchInput";

interface CreatePurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
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
}: CreatePurchaseOrderDialogProps) => {
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [selectedCostCode, setSelectedCostCode] = useState<{ id: string; code: string; name: string } | null>(null);
  const [extra, setExtra] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
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
          <DialogTitle>Create Purchase Order</DialogTitle>
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
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? "Uploading..." : "Click to upload files or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, XLS, images up to 10MB each
                  </p>
                </label>
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
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
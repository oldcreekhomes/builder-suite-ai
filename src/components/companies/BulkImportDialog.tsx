import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  companiesCreated: number;
  companiesUpdated: number;
  companiesSkipped: number;
  representativesCreated: number;
  representativesSkipped: number;
  errors: string[];
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const downloadTemplate = async () => {
    // Fetch current cost codes to include in template
    let costCodesData: any[] = [];
    
    if (user) {
      try {
        const { data } = await supabase
          .from('cost_codes')
          .select('code, name')
          .order('code');
        
        costCodesData = (data || []).map(cc => ({
          Code: cc.code,
          Name: cc.name,
          Format: `${cc.code} - ${cc.name}`
        }));
      } catch (error) {
        console.error('Error fetching cost codes for template:', error);
      }
    }

    // Create companies data with proper format examples
    const companiesData = [
      {
        CompanyName: "ABC Construction Co.",
        CompanyType: "Subcontractor",
        Address: "123 Main Street, City, State 12345",
        PhoneNumber: "(555) 123-4567",
        Website: "www.abcconstruction.com",
        AssociatedCostCodes: "4470 - Siding;3000 - Concrete Work"
      },
      {
        CompanyName: "XYZ Electrical Services",
        CompanyType: "Subcontractor", 
        Address: "456 Oak Avenue, City, State 12345",
        PhoneNumber: "(555) 987-6543",
        Website: "www.xyzelectrical.com",
        AssociatedCostCodes: "1600 - Electrical"
      }
    ];

    // Create representatives data  
    const representativesData = [
      {
        CompanyName: "ABC Construction Co.",
        FirstName: "John",
        LastName: "Smith",
        Title: "Project Manager",
        Email: "john.smith@abcconstruction.com",
        PhoneNumber: "(555) 123-4567",
        ReceiveBidNotifications: "TRUE",
        ReceiveScheduleNotifications: "FALSE",
        ReceivePONotifications: "TRUE"
      },
      {
        CompanyName: "ABC Construction Co.",
        FirstName: "Jane",
        LastName: "Doe",
        Title: "Estimator",
        Email: "jane.doe@abcconstruction.com", 
        PhoneNumber: "(555) 123-4568",
        ReceiveBidNotifications: "FALSE",
        ReceiveScheduleNotifications: "TRUE",
        ReceivePONotifications: "FALSE"
      },
      {
        CompanyName: "XYZ Electrical Services",
        FirstName: "Mike",
        LastName: "Johnson",
        Title: "Owner",
        Email: "mike@xyzelectrical.com",
        PhoneNumber: "(555) 987-6543",
        ReceiveBidNotifications: "TRUE",
        ReceiveScheduleNotifications: "TRUE",
        ReceivePONotifications: "TRUE"
      }
    ];

    // Create workbook with three sheets
    const workbook = XLSX.utils.book_new();
    
    const companiesSheet = XLSX.utils.json_to_sheet(companiesData);
    XLSX.utils.book_append_sheet(workbook, companiesSheet, "Companies");
    
    const representativesSheet = XLSX.utils.json_to_sheet(representativesData);
    XLSX.utils.book_append_sheet(workbook, representativesSheet, "Representatives");

    // Add Cost Codes reference sheet if we have cost codes
    if (costCodesData.length > 0) {
      const costCodesSheet = XLSX.utils.json_to_sheet(costCodesData);
      XLSX.utils.book_append_sheet(workbook, costCodesSheet, "Cost Codes Reference");
    }

    // Download the file
    XLSX.writeFile(workbook, 'bulk_import_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "The Excel template has been downloaded to your computer.",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const processImport = async () => {
    if (!selectedFile || !user) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Read the Excel file
      const fileBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(fileBuffer);
      
      // Get companies and representatives sheets
      const companiesSheet = workbook.Sheets['Companies'];
      const representativesSheet = workbook.Sheets['Representatives'];

      if (!companiesSheet) {
        throw new Error('Companies sheet not found in the Excel file');
      }

      const companiesData = XLSX.utils.sheet_to_json(companiesSheet);
      const representativesData = representativesSheet 
        ? XLSX.utils.sheet_to_json(representativesSheet) 
        : [];

      const result: ImportResult = {
        companiesCreated: 0,
        companiesUpdated: 0,
        companiesSkipped: 0,
        representativesCreated: 0,
        representativesSkipped: 0,
        errors: []
      };

      // Process companies
      setImportProgress(10);
      const companyNameToIdMap = new Map<string, string>();

      for (let i = 0; i < companiesData.length; i++) {
        const row = companiesData[i] as any;
        
        try {
          // Check if company already exists
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('company_name', row.CompanyName)
            .maybeSingle();

          // Get user details to determine home_builder_id
          const { data: userDetails } = await supabase
            .from('users')
            .select('role, home_builder_id')
            .eq('id', user.id)
            .single();

          const homeBuilderIdToUse = userDetails?.home_builder_id || user.id;

          const companyData = {
            company_name: row.CompanyName,
            company_type: row.CompanyType || 'Subcontractor',
            address: row.Address || null,
            phone_number: row.PhoneNumber || null,
            website: row.Website || null,
            home_builder_id: homeBuilderIdToUse
          };

          if (existingCompany) {
            // Update existing company
            const { error } = await supabase
              .from('companies')
              .update(companyData)
              .eq('id', existingCompany.id);

            if (error) {
              result.errors.push(`Failed to update company ${row.CompanyName}: ${error.message}`);
              result.companiesSkipped++;
            } else {
              result.companiesUpdated++;
              companyNameToIdMap.set(row.CompanyName, existingCompany.id);
            }
          } else {
            // Create new company
            const { data: newCompany, error } = await supabase
              .from('companies')
              .insert(companyData)
              .select('id')
              .single();

            if (error) {
              result.errors.push(`Failed to create company ${row.CompanyName}: ${error.message}`);
              result.companiesSkipped++;
            } else {
              result.companiesCreated++;
              companyNameToIdMap.set(row.CompanyName, newCompany.id);
            }
          }

          // Handle cost code associations
          if (row.AssociatedCostCodes && companyNameToIdMap.has(row.CompanyName)) {
            const companyId = companyNameToIdMap.get(row.CompanyName)!;
            
            // Parse cost codes - handle both "CODE - Name" and plain "CODE" formats
            const costCodeStrings = row.AssociatedCostCodes
              .split(/[;,]/) // Split by semicolon or comma
              .map((str: string) => str.trim())
              .filter(Boolean);
            
            // Remove existing associations for this company
            await supabase
              .from('company_cost_codes')
              .delete()
              .eq('company_id', companyId);
            
            // Add new associations
            for (const costCodeStr of costCodeStrings) {
              // Extract code from "CODE - Name" format or use as-is for plain code
              const code = costCodeStr.includes(' - ') 
                ? costCodeStr.split(' - ')[0].trim()
                : costCodeStr.trim();
              
              // Find cost code by code
              const { data: costCode } = await supabase
                .from('cost_codes')
                .select('id')
                .eq('code', code)
                .eq('owner_id', user.id)
                .maybeSingle();
              
              if (costCode) {
                await supabase
                  .from('company_cost_codes')
                  .insert({
                    company_id: companyId,
                    cost_code_id: costCode.id
                  });
              } else {
                result.errors.push(`Cost code "${code}" not found for company ${row.CompanyName}`);
              }
            }
          }

        } catch (error: any) {
          result.errors.push(`Error processing company ${row.CompanyName}: ${error.message}`);
          result.companiesSkipped++;
        }

        setImportProgress(10 + (i / companiesData.length) * 60);
      }

      // Process representatives
      setImportProgress(70);
      
      // Get user details for representatives (same logic as companies)
      const { data: userDetails } = await supabase
        .from('users')
        .select('role, home_builder_id')
        .eq('id', user.id)
        .single();

      const homeBuilderIdForReps = userDetails?.home_builder_id || user.id;
      
      for (let i = 0; i < representativesData.length; i++) {
        const row = representativesData[i] as any;
        
        try {
          const companyId = companyNameToIdMap.get(row.CompanyName);
          if (!companyId) {
            result.errors.push(`Company not found for representative ${row.FirstName} ${row.LastName}: ${row.CompanyName}`);
            result.representativesSkipped++;
            continue;
          }

          // Check if representative already exists
          const { data: existingRep } = await supabase
            .from('company_representatives')
            .select('id')
            .eq('company_id', companyId)
            .eq('email', row.Email)
            .maybeSingle();

          const repData = {
            company_id: companyId,
            first_name: row.FirstName,
            last_name: row.LastName,
            title: row.Title || null,
            email: row.Email || null,
            phone_number: row.PhoneNumber || null,
            receive_bid_notifications: row.ReceiveBidNotifications === 'TRUE',
            receive_schedule_notifications: row.ReceiveScheduleNotifications === 'TRUE',
            receive_po_notifications: row.ReceivePONotifications === 'TRUE',
            home_builder_id: homeBuilderIdForReps
          };

          if (existingRep) {
            await supabase
              .from('company_representatives')
              .update(repData)
              .eq('id', existingRep.id);
          } else {
            const { error } = await supabase
              .from('company_representatives')
              .insert(repData);

            if (error) {
              result.errors.push(`Failed to create representative ${row.FirstName} ${row.LastName}: ${error.message}`);
              result.representativesSkipped++;
            } else {
              result.representativesCreated++;
            }
          }

        } catch (error: any) {
          result.errors.push(`Error processing representative ${row.FirstName} ${row.LastName}: ${error.message}`);
          result.representativesSkipped++;
        }

        setImportProgress(70 + (i / representativesData.length) * 30);
      }

      setImportProgress(100);
      setImportResult(result);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['representatives'] });

      toast({
        title: "Import Complete",
        description: `Successfully processed ${result.companiesCreated + result.companiesUpdated} companies and ${result.representativesCreated} representatives.`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed", 
        description: error.message || "An error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setImportResult(null);
    setImportProgress(0);
    setIsImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetDialog();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Companies & Representatives</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple companies and their representatives at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <div className="space-y-2">
            <Label>Step 1: Download Template</Label>
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Excel Template
            </Button>
            <p className="text-sm text-muted-foreground">
              Download the template with your actual cost codes included. For Associated Cost Codes, use either "CODE - Name" format (e.g., "4470 - Siding;1600 - Electrical") or plain codes (e.g., "4470;1600"). Separate multiple codes with semicolons.
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Step 2: Upload Your File</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isImporting}
            />
            {selectedFile && (
              <div className="flex items-center text-sm text-muted-foreground">
                <FileText className="h-4 w-4 mr-2" />
                {selectedFile.name}
              </div>
            )}
          </div>

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Label>Import Progress</Label>
              <Progress value={importProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {importProgress}% complete
              </p>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <Label>Import Results</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Companies</div>
                    <div className="text-sm">
                      Created: {importResult.companiesCreated}<br/>
                      Updated: {importResult.companiesUpdated}<br/>
                      Skipped: {importResult.companiesSkipped}
                    </div>
                  </AlertDescription>
                </Alert>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Representatives</div>
                    <div className="text-sm">
                      Created: {importResult.representativesCreated}<br/>
                      Skipped: {importResult.representativesSkipped}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Errors ({importResult.errors.length}):</div>
                    <div className="max-h-32 overflow-y-auto text-xs">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="mb-1">{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              onClick={processImport} 
              disabled={!selectedFile || isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
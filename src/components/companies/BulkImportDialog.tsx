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

  const downloadTemplate = () => {
    // Create companies data
    const companiesData = [
      {
        CompanyName: "ABC Construction Co.",
        CompanyType: "Subcontractor",
        Address: "123 Main Street, City, State 12345",
        PhoneNumber: "(555) 123-4567",
        Website: "www.abcconstruction.com",
        ServiceAreas: "City;Metro Area",
        Specialties: "Concrete;Framing",
        LicenseNumbers: "LIC123456;LIC789012",
        Rating: "4.5",
        ReviewCount: "25",
        Description: "Professional construction services",
        InsuranceVerified: "TRUE"
      },
      {
        CompanyName: "XYZ Electrical Services",
        CompanyType: "Subcontractor", 
        Address: "456 Oak Avenue, City, State 12345",
        PhoneNumber: "(555) 987-6543",
        Website: "www.xyzelectrical.com",
        ServiceAreas: "City;Suburbs",
        Specialties: "Electrical;Lighting",
        LicenseNumbers: "ELE456789",
        Rating: "4.8",
        ReviewCount: "18",
        Description: "Licensed electrical contractors",
        InsuranceVerified: "FALSE"
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
        IsPrimary: "TRUE"
      },
      {
        CompanyName: "ABC Construction Co.",
        FirstName: "Jane",
        LastName: "Doe",
        Title: "Estimator",
        Email: "jane.doe@abcconstruction.com", 
        PhoneNumber: "(555) 123-4568",
        IsPrimary: "FALSE"
      },
      {
        CompanyName: "XYZ Electrical Services",
        FirstName: "Mike",
        LastName: "Johnson",
        Title: "Owner",
        Email: "mike@xyzelectrical.com",
        PhoneNumber: "(555) 987-6543",
        IsPrimary: "TRUE"
      }
    ];

    // Create workbook with two sheets
    const workbook = XLSX.utils.book_new();
    
    const companiesSheet = XLSX.utils.json_to_sheet(companiesData);
    XLSX.utils.book_append_sheet(workbook, companiesSheet, "Companies");
    
    const representativesSheet = XLSX.utils.json_to_sheet(representativesData);
    XLSX.utils.book_append_sheet(workbook, representativesSheet, "Representatives");

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

          const companyData = {
            company_name: row.CompanyName,
            company_type: row.CompanyType || 'Subcontractor',
            address: row.Address || null,
            phone_number: row.PhoneNumber || null,
            website: row.Website || null,
            owner_id: user.id
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

          // Process marketplace company if additional fields exist
          if (row.ServiceAreas || row.Specialties || row.LicenseNumbers || row.Rating) {
            const marketplaceData = {
              company_name: row.CompanyName,
              company_type: row.CompanyType || 'Subcontractor',
              address: row.Address || null,
              phone_number: row.PhoneNumber || null,
              website: row.Website || null,
              service_areas: row.ServiceAreas ? row.ServiceAreas.split(';').filter(Boolean) : null,
              specialties: row.Specialties ? row.Specialties.split(';').filter(Boolean) : null,
              license_numbers: row.LicenseNumbers ? row.LicenseNumbers.split(';').filter(Boolean) : null,
              rating: row.Rating ? parseFloat(row.Rating) : null,
              review_count: row.ReviewCount ? parseInt(row.ReviewCount) : null,
              description: row.Description || null,
              insurance_verified: row.InsuranceVerified === 'TRUE'
            };

            // Check if marketplace company exists
            const { data: existingMarketplace } = await supabase
              .from('marketplace_companies')
              .select('id')
              .eq('company_name', row.CompanyName)
              .maybeSingle();

            if (existingMarketplace) {
              await supabase
                .from('marketplace_companies')
                .update(marketplaceData)
                .eq('id', existingMarketplace.id);
            } else {
              await supabase
                .from('marketplace_companies')
                .insert(marketplaceData);
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
            is_primary: row.IsPrimary === 'TRUE'
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

          // Also create marketplace representative if marketplace company exists
          const { data: marketplaceCompany } = await supabase
            .from('marketplace_companies')
            .select('id')
            .eq('company_name', row.CompanyName)
            .maybeSingle();

          if (marketplaceCompany) {
            const { data: existingMarketplaceRep } = await supabase
              .from('marketplace_company_representatives')
              .select('id')
              .eq('marketplace_company_id', marketplaceCompany.id)
              .eq('email', row.Email)
              .maybeSingle();

            const marketplaceRepData = {
              marketplace_company_id: marketplaceCompany.id,
              first_name: row.FirstName,
              last_name: row.LastName,
              title: row.Title || null,
              email: row.Email || null,
              phone_number: row.PhoneNumber || null,
              is_primary: row.IsPrimary === 'TRUE'
            };

            if (!existingMarketplaceRep) {
              await supabase
                .from('marketplace_company_representatives')
                .insert(marketplaceRepData);
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
      queryClient.invalidateQueries({ queryKey: ['marketplace-companies'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-representatives'] });

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
              Download the template, fill in your data, and upload it back.
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CompaniesExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VALID_TYPES = ["Subcontractor", "Vendor", "Consultant", "Lender", "Municipality", "Utility"];
const VALID_TITLES = ["Estimator", "Project Manager", "Foreman", "Superintendent", "Sales Rep", "Owner", "Office Manager", "Accountant"];

export function CompaniesExcelImportDialog({ open, onOpenChange }: CompaniesExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const downloadTemplate = () => {
    const companiesData = [
      {
        "Company Name": "ABC Plumbing",
        Type: "Subcontractor",
        Address: "123 Main St",
        City: "Austin",
        State: "TX",
        "Zip Code": "78701",
        Phone: "512-555-0100",
        Website: "www.abcplumbing.com",
        "Cost Codes": "5000, 5010",
      },
      {
        "Company Name": "XYZ Electric",
        Type: "Subcontractor",
        Address: "456 Oak Ave",
        City: "Dallas",
        State: "TX",
        "Zip Code": "75201",
        Phone: "214-555-0200",
        Website: "",
        "Cost Codes": "6000",
      },
      {
        "Company Name": "Acme Lumber",
        Type: "Vendor",
        Address: "789 Pine Rd",
        City: "Houston",
        State: "TX",
        "Zip Code": "77001",
        Phone: "713-555-0300",
        Website: "",
        "Cost Codes": "4000, 4010, 4020",
      },
    ];

    const repsData = [
      { "Company Name": "ABC Plumbing", "First Name": "John", "Last Name": "Smith", Email: "john@abcplumbing.com", Phone: "512-555-0101", Title: "Owner" },
      { "Company Name": "ABC Plumbing", "First Name": "Jane", "Last Name": "Doe", Email: "jane@abcplumbing.com", Phone: "", Title: "Estimator" },
      { "Company Name": "XYZ Electric", "First Name": "Mike", "Last Name": "Jones", Email: "mike@xyzelectric.com", Phone: "214-555-0201", Title: "Project Manager" },
    ];

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(companiesData);
    const ws2 = XLSX.utils.json_to_sheet(repsData);

    // Set column widths
    ws1["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 6 },
      { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
    ];
    ws2["!cols"] = [
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws1, "Companies");
    XLSX.utils.book_append_sheet(wb, ws2, "Representatives");
    XLSX.writeFile(wb, "companies_import_template.xlsx");
  };

  const handleImport = async () => {
    if (!file) {
      toast({ title: "Error", description: "Please select a file to import", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userDetails } = await supabase
        .from("users")
        .select("home_builder_id")
        .eq("id", user.id)
        .single();

      const homeBuilderId = userDetails?.home_builder_id || user.id;

      // Fetch existing cost codes for matching
      const { data: existingCostCodes } = await supabase
        .from("cost_codes")
        .select("id, code")
        .eq("owner_id", homeBuilderId);

      const costCodeMap = new Map<string, string>();
      (existingCostCodes || []).forEach((cc) => {
        costCodeMap.set(cc.code.trim(), cc.id);
      });

      // Fetch existing companies to check for duplicates
      const { data: existingCompanies } = await supabase
        .from("companies")
        .select("company_name")
        .eq("home_builder_id", homeBuilderId);

      const existingNames = new Set(
        (existingCompanies || []).map((c) => c.company_name.trim().toLowerCase())
      );

      // Parse Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      // Parse Sheet 1: Companies
      const companiesSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!companiesSheet) throw new Error("No Companies sheet found");
      const companiesRows: any[] = XLSX.utils.sheet_to_json(companiesSheet);

      // Parse Sheet 2: Representatives (optional)
      const repsSheet = workbook.SheetNames[1] ? workbook.Sheets[workbook.SheetNames[1]] : null;
      const repsRows: any[] = repsSheet ? XLSX.utils.sheet_to_json(repsSheet) : [];

      // Group reps by company name
      const repsByCompany = new Map<string, any[]>();
      repsRows.forEach((row) => {
        const companyName = (row["Company Name"] || "").trim();
        if (!companyName) return;
        const key = companyName.toLowerCase();
        if (!repsByCompany.has(key)) repsByCompany.set(key, []);
        repsByCompany.get(key)!.push(row);
      });

      const warnings: string[] = [];
      let companiesImported = 0;
      let repsImported = 0;
      let costCodeAssociations = 0;
      let skippedDuplicates = 0;

      for (const row of companiesRows) {
        const companyName = (row["Company Name"] || "").trim();
        if (!companyName) continue;

        // Skip duplicates
        if (existingNames.has(companyName.toLowerCase())) {
          skippedDuplicates++;
          warnings.push(`Skipped duplicate: "${companyName}"`);
          continue;
        }

        // Validate type
        let companyType = (row["Type"] || row["type"] || "").trim();
        if (!VALID_TYPES.includes(companyType)) {
          if (companyType) warnings.push(`Invalid type "${companyType}" for "${companyName}", defaulting to Subcontractor`);
          companyType = "Subcontractor";
        }

        const addressLine1 = (row["Address"] || row["address"] || "").trim();
        const city = (row["City"] || row["city"] || "").trim();
        const state = (row["State"] || row["state"] || "").trim();
        const zipCode = (row["Zip Code"] || row["zip_code"] || row["Zip"] || "").toString().trim();
        const phone = (row["Phone"] || row["phone"] || "").toString().trim();
        const website = (row["Website"] || row["website"] || "").trim();

        // Build legacy address
        const addressParts = [addressLine1, city, state, zipCode].filter(Boolean);
        const fullAddress = addressParts.join(", ") || null;

        // Insert company
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .insert({
            company_name: companyName,
            company_type: companyType,
            address_line_1: addressLine1 || null,
            city: city || null,
            state: state || null,
            zip_code: zipCode || null,
            address: fullAddress,
            phone_number: phone || null,
            website: website || null,
            home_builder_id: homeBuilderId,
          })
          .select("id")
          .single();

        if (companyError) {
          warnings.push(`Failed to import "${companyName}": ${companyError.message}`);
          continue;
        }

        companiesImported++;
        existingNames.add(companyName.toLowerCase());

        // Parse and associate cost codes
        const costCodesStr = (row["Cost Codes"] || row["cost_codes"] || "").toString().trim();
        if (costCodesStr) {
          const codes = costCodesStr.split(",").map((c: string) => c.trim()).filter(Boolean);
          const associations: { company_id: string; cost_code_id: string }[] = [];

          for (const code of codes) {
            const costCodeId = costCodeMap.get(code);
            if (costCodeId) {
              associations.push({ company_id: company.id, cost_code_id: costCodeId });
            } else {
              warnings.push(`Cost code "${code}" not found for "${companyName}"`);
            }
          }

          if (associations.length > 0) {
            const { error: ccError } = await supabase
              .from("company_cost_codes")
              .insert(associations);

            if (!ccError) {
              costCodeAssociations += associations.length;
            }
          }
        }

        // Insert representatives for this company
        const companyReps = repsByCompany.get(companyName.toLowerCase()) || [];
        for (const rep of companyReps) {
          const firstName = (rep["First Name"] || "").trim();
          const email = (rep["Email"] || rep["email"] || "").trim();
          if (!firstName || !email) {
            warnings.push(`Skipped rep for "${companyName}": missing first name or email`);
            continue;
          }

          let title = (rep["Title"] || rep["title"] || "").trim();
          if (!VALID_TITLES.includes(title)) {
            if (title) warnings.push(`Invalid title "${title}" for ${firstName}, defaulting to Estimator`);
            title = "Estimator";
          }

          const { error: repError } = await supabase
            .from("company_representatives")
            .insert({
              company_id: company.id,
              first_name: firstName,
              last_name: (rep["Last Name"] || "").trim() || null,
              email,
              phone_number: (rep["Phone"] || rep["phone"] || "").toString().trim() || null,
              title,
              home_builder_id: homeBuilderId,
            });

          if (!repError) {
            repsImported++;
          } else {
            warnings.push(`Failed to add rep "${firstName}" for "${companyName}"`);
          }
        }
      }

      // Check for orphaned reps
      repsByCompany.forEach((reps, companyKey) => {
        const wasImported = companiesRows.some(
          (row) => (row["Company Name"] || "").trim().toLowerCase() === companyKey
        );
        if (!wasImported) {
          warnings.push(`${reps.length} rep(s) for "${reps[0]["Company Name"]}" skipped (company not found)`);
        }
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.invalidateQueries({ queryKey: ["onboarding-live-checks"] });

      // Build summary
      const parts = [
        `${companiesImported} companies`,
        `${repsImported} representatives`,
        `${costCodeAssociations} cost code associations`,
      ];

      toast({
        title: "Import Complete",
        description: `Imported ${parts.join(", ")}${skippedDuplicates > 0 ? `. ${skippedDuplicates} duplicate(s) skipped.` : ""}`,
      });

      if (warnings.length > 0) {
        console.warn("Import warnings:", warnings);
        // Show first few warnings
        const displayWarnings = warnings.slice(0, 3);
        if (warnings.length > 3) displayWarnings.push(`...and ${warnings.length - 3} more`);
        toast({
          title: "Import Warnings",
          description: displayWarnings.join("\n"),
          variant: "destructive",
        });
      }

      setFile(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!importing) {
      if (!newOpen) setFile(null);
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Companies from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="companies-excel-file">Excel File</Label>
            <Input
              id="companies-excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={importing}
            />
            <p className="text-sm text-muted-foreground">
              Upload an Excel file with two sheets: "Companies" (name, type, address, cost codes) and "Representatives" (linked by company name).
            </p>
          </div>

          <div className="flex items-center justify-center">
            <Button variant="outline" onClick={downloadTemplate} disabled={importing}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

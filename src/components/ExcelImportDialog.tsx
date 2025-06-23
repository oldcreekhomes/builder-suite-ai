
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

interface ExcelImportDialogProps {
  onImportCostCodes: (costCodes: any[]) => void;
}

export function ExcelImportDialog({ onImportCostCodes }: ExcelImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map Excel data to cost code format
      const costCodes = jsonData.map((row: any) => ({
        code: row.Code || row.code || '',
        name: row.Name || row.name || row.Description || row.description || '',
        parentGroup: row.ParentGroup || row.parentGroup || row['Parent Group'] || '',
        quantity: row.Quantity || row.quantity || '',
        price: row.Price || row.price || '',
        unitOfMeasure: row.UnitOfMeasure || row.unitOfMeasure || row['Unit of Measure'] || '',
        hasSpecifications: row.HasSpecifications || row.hasSpecifications || row['Has Specifications'] || '',
        hasBidding: row.HasBidding || row.hasBidding || row['Has Bidding'] || '',
      }));

      onImportCostCodes(costCodes);
      setOpen(false);
      setFile(null);
      
      toast({
        title: "Success",
        description: `Imported ${costCodes.length} cost codes successfully`,
      });
    } catch (error) {
      console.error('Error importing Excel file:', error);
      toast({
        title: "Error",
        description: "Failed to import Excel file. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Code: '001',
        Name: 'Site Preparation',
        ParentGroup: '',
        Quantity: '1',
        Price: '5000',
        'Unit of Measure': 'each',
        'Has Specifications': 'yes',
        'Has Bidding': 'yes'
      },
      {
        Code: '002',
        Name: 'Excavation',
        ParentGroup: '001',
        Quantity: '100',
        Price: '50',
        'Unit of Measure': 'square-feet',
        'Has Specifications': 'no',
        'Has Bidding': 'yes'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Codes');
    XLSX.writeFile(workbook, 'cost_codes_template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Cost Codes from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
            <p className="text-sm text-gray-500">
              Upload an Excel file with cost code data. The file should include columns: Code, Name, ParentGroup, Quantity, Price, Unit of Measure, Has Specifications, Has Bidding.
            </p>
          </div>
          
          <div className="flex items-center justify-center">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

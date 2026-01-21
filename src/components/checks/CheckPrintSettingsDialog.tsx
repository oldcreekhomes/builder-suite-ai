import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RotateCcw, Printer } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { CheckPrintTestDocument } from './CheckPrintDocument';
import { useCheckPrintSettings, DEFAULT_PRINT_SETTINGS, CheckPrintSettings } from '@/hooks/useCheckPrintSettings';

interface CheckPrintSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

type SettingsField = keyof typeof DEFAULT_PRINT_SETTINGS;

interface FieldConfig {
  key: SettingsField;
  label: string;
  description?: string;
}

// Company fields (4 lines)
const companyFields: FieldConfig[] = [
  { key: 'company_name_x', label: 'Company Line 1 X' },
  { key: 'company_name_y', label: 'Company Line 1 Y' },
  { key: 'company_line2_x', label: 'Company Line 2 X' },
  { key: 'company_line2_y', label: 'Company Line 2 Y' },
  { key: 'company_line3_x', label: 'Company Line 3 X' },
  { key: 'company_line3_y', label: 'Company Line 3 Y' },
  { key: 'company_line4_x', label: 'Company Line 4 X' },
  { key: 'company_line4_y', label: 'Company Line 4 Y' },
];

// Check header fields
const checkHeaderFields: FieldConfig[] = [
  { key: 'check_number_x', label: 'Check Number X' },
  { key: 'check_number_y', label: 'Check Number Y' },
  { key: 'routing_fraction_x', label: 'Routing Fraction X' },
  { key: 'routing_fraction_y', label: 'Routing Fraction Y' },
  { key: 'date_label_x', label: 'Date Label X' },
  { key: 'date_label_y', label: 'Date Label Y' },
];

// PAY TO THE ORDER OF labels
const payLabelFields: FieldConfig[] = [
  { key: 'pay_label_x', label: 'PAY Label X' },
  { key: 'pay_label_y', label: 'PAY Label Y' },
  { key: 'to_the_label_x', label: 'TO THE Label X' },
  { key: 'to_the_label_y', label: 'TO THE Label Y' },
  { key: 'order_of_label_x', label: 'ORDER OF: Label X' },
  { key: 'order_of_label_y', label: 'ORDER OF: Label Y' },
];

// Payee fields (4 lines)
const payeeFields: FieldConfig[] = [
  { key: 'payee_x', label: 'Payee Line 1 X' },
  { key: 'payee_y', label: 'Payee Line 1 Y' },
  { key: 'payee_line2_x', label: 'Payee Line 2 X' },
  { key: 'payee_line2_y', label: 'Payee Line 2 Y' },
  { key: 'payee_line3_x', label: 'Payee Line 3 X' },
  { key: 'payee_line3_y', label: 'Payee Line 3 Y' },
  { key: 'payee_line4_x', label: 'Payee Line 4 X' },
  { key: 'payee_label_y', label: 'Payee Line 4 Y' },
];

// Amount fields
const amountFields: FieldConfig[] = [
  { key: 'amount_numeric_x', label: 'Amount (Numeric) X' },
  { key: 'amount_numeric_y', label: 'Amount (Numeric) Y' },
  { key: 'amount_words_x', label: 'Amount (Words) X' },
  { key: 'amount_words_y', label: 'Amount (Words) Y' },
  { key: 'signature_label_x', label: 'Signature Label X' },
  { key: 'signature_label_y', label: 'Signature Label Y' },
];

// Bank fields (3 lines)
const bankFields: FieldConfig[] = [
  { key: 'bank_name_x', label: 'Bank Line 1 X' },
  { key: 'bank_name_y', label: 'Bank Line 1 Y' },
  { key: 'bank_line2_x', label: 'Bank Line 2 X' },
  { key: 'bank_line2_y', label: 'Bank Line 2 Y' },
  { key: 'bank_line3_x', label: 'Bank Line 3 X' },
  { key: 'bank_line3_y', label: 'Bank Line 3 Y' },
];

// MICR line fields
const micrFields: FieldConfig[] = [
  { key: 'micr_check_number_x', label: 'MICR Check# X' },
  { key: 'micr_check_number_y', label: 'MICR Check# Y' },
  { key: 'micr_routing_x', label: 'MICR Routing X' },
  { key: 'micr_routing_y', label: 'MICR Routing Y' },
  { key: 'micr_account_x', label: 'MICR Account X' },
  { key: 'micr_account_y', label: 'MICR Account Y' },
];

// Stub section fields
const stubFields: FieldConfig[] = [
  { key: 'stub_company_x', label: 'Company X' },
  { key: 'stub_company_y', label: 'Company Y' },
  { key: 'stub_payee_x', label: 'Payee X' },
  { key: 'stub_payee_y', label: 'Payee Y' },
  { key: 'stub_date_check_x', label: 'Date/Check# X' },
  { key: 'stub_date_check_y', label: 'Date/Check# Y' },
  { key: 'stub_invoice_date_x', label: 'Invoice Date X' },
  { key: 'stub_invoice_date_y', label: 'Invoice Date Y' },
  { key: 'stub_amount_x', label: 'Amount X' },
  { key: 'stub_amount_y', label: 'Amount Y' },
  { key: 'stub_bank_x', label: 'Bank Name X' },
  { key: 'stub_bank_y', label: 'Bank Name Y' },
  { key: 'stub_total_x', label: 'Total X' },
  { key: 'stub_total_y', label: 'Total Y' },
];

// Page settings
const pageFields: FieldConfig[] = [
  { key: 'page_width', label: 'Page Width', description: 'in inches' },
  { key: 'page_height', label: 'Page Height', description: 'in inches' },
  { key: 'check_height', label: 'Check Height', description: 'in inches' },
  { key: 'font_size', label: 'Font Size', description: 'in points' },
];

export function CheckPrintSettingsDialog({ open, onOpenChange, projectId }: CheckPrintSettingsDialogProps) {
  const { settings, saveSettings, isLoading } = useCheckPrintSettings(projectId);
  const [localSettings, setLocalSettings] = useState<Partial<CheckPrintSettings>>({});
  const [isPrinting, setIsPrinting] = useState(false);

  // Initialize local settings from saved or default
  useEffect(() => {
    if (open) {
      setLocalSettings(settings ?? { ...DEFAULT_PRINT_SETTINGS });
    }
  }, [open, settings]);

  const handleChange = (key: SettingsField, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setLocalSettings(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const handleSave = () => {
    saveSettings.mutate({ ...localSettings, project_id: projectId ?? null });
  };

  const handleReset = () => {
    setLocalSettings({ ...DEFAULT_PRINT_SETTINGS });
  };

  const handlePrintTest = async () => {
    setIsPrinting(true);
    try {
      const blob = await pdf(<CheckPrintTestDocument settings={localSettings} />).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const getValue = (key: SettingsField): string => {
    const val = localSettings[key as keyof typeof localSettings];
    if (typeof val === 'number') return val.toString();
    return (DEFAULT_PRINT_SETTINGS[key] as number).toString();
  };

  const renderFieldGroup = (fields: FieldConfig[]) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {fields.map(({ key, label, description }) => (
        <div key={key} className="space-y-1">
          <Label htmlFor={key} className="text-xs">
            {label}
            {description && <span className="text-muted-foreground ml-1">({description})</span>}
          </Label>
          <Input
            id={key}
            type="number"
            step="0.05"
            value={getValue(key)}
            onChange={(e) => handleChange(key, e.target.value)}
            className="h-8"
          />
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Check Print Settings
          </DialogTitle>
          <DialogDescription>
            Configure field positions (in inches from page edge) to align with your check stock.
            Print a test page to verify alignment.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="check">Check</TabsTrigger>
            <TabsTrigger value="bank">Bank & MICR</TabsTrigger>
            <TabsTrigger value="stub">Stub</TabsTrigger>
            <TabsTrigger value="page">Page</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Company name and address (4 lines, top left of check)
            </p>
            {renderFieldGroup(companyFields)}
          </TabsContent>

          <TabsContent value="check" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Check header, payee, and amount positions
            </p>
            <h4 className="font-medium text-sm">Header (Check #, Routing Fraction, Date)</h4>
            {renderFieldGroup(checkHeaderFields)}
            <h4 className="font-medium text-sm mt-4">PAY TO THE ORDER OF Labels</h4>
            {renderFieldGroup(payLabelFields)}
            <h4 className="font-medium text-sm mt-4">Payee Address (4 lines)</h4>
            {renderFieldGroup(payeeFields)}
            <h4 className="font-medium text-sm mt-4">Amount & Signature</h4>
            {renderFieldGroup(amountFields)}
          </TabsContent>

          <TabsContent value="bank" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Bank information (3 lines) and MICR line at bottom
            </p>
            <h4 className="font-medium text-sm">Bank Info (3 lines)</h4>
            {renderFieldGroup(bankFields)}
            <h4 className="font-medium text-sm mt-4">MICR Line (E-13B Font)</h4>
            {renderFieldGroup(micrFields)}
          </TabsContent>

          <TabsContent value="stub" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Position of fields on the detachable stub portion (below check)
            </p>
            {renderFieldGroup(stubFields)}
          </TabsContent>

          <TabsContent value="page" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Page dimensions and font settings
            </p>
            {renderFieldGroup(pageFields)}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-wrap gap-2 mt-6">
          <div className="flex gap-2 mr-auto">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button variant="outline" onClick={handlePrintTest} disabled={isPrinting}>
              <Printer className="h-4 w-4 mr-2" />
              Print Test Page
            </Button>
          </div>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveSettings.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

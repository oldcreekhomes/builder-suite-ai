import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, FileText, Loader2 } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVendorPaymentsReport, VendorData, ProjectVendorData } from "@/hooks/useVendorPaymentsReport";
import { VendorPaymentsPdfDocument } from "./pdf/VendorPaymentsPdfDocument";
import { useAuth } from "@/hooks/useAuth";

interface VendorPaymentsContentProps {
  projectId?: string;
}

export function VendorPaymentsContent({ projectId }: VendorPaymentsContentProps) {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState<Date>(new Date(currentYear, 0, 1));
  const [endDate, setEndDate] = useState<Date>(new Date(currentYear, 11, 31));
  const [selectedYear, setSelectedYear] = useState<number | 'custom'>(currentYear);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  
  const { data, isLoading, error } = useVendorPaymentsReport(startDate, endDate);
  const { session } = useAuth();

  // Generate year options (2020 to current year + 1)
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = 2020; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Check if current dates match a full year
  const checkIfFullYear = (start: Date, end: Date): number | 'custom' => {
    const startMonth = start.getMonth();
    const startDay = start.getDate();
    const endMonth = end.getMonth();
    const endDay = end.getDate();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    if (startMonth === 0 && startDay === 1 && endMonth === 11 && endDay === 31 && startYear === endYear) {
      return startYear;
    }
    return 'custom';
  };

  const handleYearChange = (value: string) => {
    if (value === 'custom') {
      setSelectedYear('custom');
    } else {
      const year = parseInt(value, 10);
      setSelectedYear(year);
      setStartDate(new Date(year, 0, 1));
      setEndDate(new Date(year, 11, 31));
    }
  };

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    setSelectedYear(checkIfFullYear(date, endDate));
  };

  const handleEndDateChange = (date: Date) => {
    setEndDate(date);
    setSelectedYear(checkIfFullYear(startDate, date));
  };
  
  // Get company name from session
  const companyName = session?.user?.user_metadata?.company_name || 'Company';

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleVendor = (vendorKey: string) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendorKey)) {
        next.delete(vendorKey);
      } else {
        next.add(vendorKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    const allProjects = new Set(data.projects.map(p => p.id));
    const allVendors = new Set<string>();
    data.projects.forEach(p => {
      p.vendors.forEach(v => {
        allVendors.add(`${p.id}-${v.id}`);
      });
    });
    setExpandedProjects(allProjects);
    setExpandedVendors(allVendors);
  };

  const collapseAll = () => {
    setExpandedProjects(new Set());
    setExpandedVendors(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">Error loading report: {String(error)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Year:</span>
            <Select
              value={String(selectedYear)}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">From:</span>
            <DateInputPicker
              date={startDate}
              onDateChange={handleStartDateChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">To:</span>
            <DateInputPicker
              date={endDate}
              onDateChange={handleEndDateChange}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
        
        {data && data.projects.length > 0 && (
          <PDFDownloadLink
            document={
              <VendorPaymentsPdfDocument
                companyName={companyName}
                startDate={format(startDate, 'yyyy-MM-dd')}
                endDate={format(endDate, 'yyyy-MM-dd')}
                projects={data.projects}
                grandTotal={data.grandTotal}
              />
            }
            fileName={`vendor-payments-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`}
          >
            {({ loading }) => (
              <Button variant="outline" disabled={loading}>
                <FileText className="h-4 w-4 mr-2" />
                {loading ? 'Generating...' : 'Export PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      {/* Report Content */}
      {!data || data.projects.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No Builder Suite projects with vendor transactions found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.projects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              isExpanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
              expandedVendors={expandedVendors}
              onToggleVendor={toggleVendor}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}

          {/* Grand Total */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Grand Total (All Builder Suite Projects)</span>
                <span className="text-lg font-bold">{formatCurrency(data.grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface ProjectSectionProps {
  project: ProjectVendorData;
  isExpanded: boolean;
  onToggle: () => void;
  expandedVendors: Set<string>;
  onToggleVendor: (key: string) => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

function ProjectSection({
  project,
  isExpanded,
  onToggle,
  expandedVendors,
  onToggleVendor,
  formatCurrency,
  formatDate,
}: ProjectSectionProps) {
  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <CardTitle className="text-base">PROJECT: {project.address}</CardTitle>
              </div>
              <span className="font-bold">{formatCurrency(project.projectTotal)}</span>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {project.vendors.map((vendor) => (
              <VendorSection
                key={vendor.id}
                projectId={project.id}
                vendor={vendor}
                isExpanded={expandedVendors.has(`${project.id}-${vendor.id}`)}
                onToggle={() => onToggleVendor(`${project.id}-${vendor.id}`)}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface VendorSectionProps {
  projectId: string;
  vendor: VendorData;
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

function VendorSection({
  projectId,
  vendor,
  isExpanded,
  onToggle,
  formatCurrency,
  formatDate,
}: VendorSectionProps) {
  return (
    <div className="border rounded-lg">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium">{vendor.name}</span>
              <span className="text-muted-foreground text-sm">
                ({vendor.transactions.length} transactions)
              </span>
            </div>
            <span className="font-semibold">{formatCurrency(vendor.total)}</span>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <Table containerClassName="max-h-none">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[100px]">Num</TableHead>
                  <TableHead>Memo</TableHead>
                  <TableHead className="text-right w-[120px]">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendor.transactions.map((tx, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{tx.type}</TableCell>
                    <TableCell>{formatDate(tx.date)}</TableCell>
                    <TableCell>{tx.num || '-'}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{tx.memo || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={4}>Total - {vendor.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(vendor.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { useTemplateContent, DEFAULT_EXHIBITS } from "@/hooks/useTemplateContent";
import { useContractFormData } from "@/hooks/useContractFormData";

interface LineItem {
  letter: string;
  description: string;
  amount: number;
}

interface AlternateItem {
  letter: string;
  description: string;
  amount: number;
}

const DEFAULT_ALTERNATES: AlternateItem[] = [
  { letter: "1", description: "Retaining Walls", amount: 48500 },
  { letter: "2", description: "Additional Clearing — Parcel B", amount: 12750 },
  { letter: "3", description: "Temporary Access Road", amount: 22000 },
];

interface ContractFields {
  contractorName: string;
  contractorAddress: string;
  contractorPhone: string;
  contractorPM: string;
  subcontractorName: string;
  subcontractorAddress: string;
  subcontractorPhone: string;
  subcontractorContact: string;
  projectName: string;
  projectAddress: string;
  projectPhone: string;
  projectContact: string;
  startDate: string;
  contractDate: string;
  contractorSignerName: string;
  contractorSignerTitle: string;
  contractorSignerDate: string;
  subcontractorSignerName: string;
  subcontractorSignerTitle: string;
  subcontractorSignerDate: string;
  scopeOfWork: string;
  projectDrawings: string;
  generalRequirements: string;
}

const TOTAL_PAGES = 6;

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

const SubcontractorContractForm = ({ onPrintReady }: { onPrintReady?: (printFn: () => void) => void }) => {
  const { articles, exhibits, isLoading } = useTemplateContent("subcontractor-contract");
  const { savedData, isLoading: isLoadingFormData, save: saveFormData, isSaving } = useContractFormData();
  const [currentPage, setCurrentPage] = useState(1);
  const isInitialLoad = useRef(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const DEFAULT_LINE_ITEMS: LineItem[] = [
    { letter: "A", description: "General Conditions/Mobilization", amount: 19653 },
    { letter: "B", description: "Erosion Control", amount: 20382 },
    { letter: "C", description: "Site Demolition", amount: 18726 },
    { letter: "D", description: "Building Demolition", amount: 22489 },
    { letter: "E", description: "Clearing", amount: 9998 },
    { letter: "F", description: "Excavation and Grading", amount: 282578 },
    { letter: "G", description: "Sanitary", amount: 129546 },
    { letter: "H", description: "Storm Drain", amount: 236503 },
    { letter: "I", description: "Water", amount: 86259 },
    { letter: "J", description: "Site Concrete", amount: 68423 },
    { letter: "K", description: "Asphalt and Paving", amount: 45569 },
  ];

  const DEFAULT_FIELDS: ContractFields = {
    contractorName: "Old Creek Homes, LLC",
    contractorAddress: "228 S Washington St Suite B-30, Alexandria, VA 22314",
    contractorPhone: "(240)-418-2388",
    contractorPM: "Steven Chen",
    subcontractorName: "LCS Site Services LLC.",
    subcontractorAddress: "P.O Box 5983 | Springfield, VA 22150",
    subcontractorPhone: "(703) 887-9598",
    subcontractorContact: "Adam Hutson",
    projectName: "WESTRIDGE TOWNHOMES PHASE II",
    projectAddress: "100 Nob Hill Ct, Alexandria, VA 22314",
    projectPhone: "(240)-418-2388",
    projectContact: "Steven Chen",
    startDate: "",
    contractDate: "March 12, 2026",
    contractorSignerName: "",
    contractorSignerTitle: "",
    contractorSignerDate: "",
    subcontractorSignerName: "",
    subcontractorSignerTitle: "",
    subcontractorSignerDate: "",
    scopeOfWork: `A. General Conditions/Mobilization
   1. Project mobilization and site setup
   2. Temporary facilities and utilities
   3. Construction entrance and access roads
   4. Project management and supervision
   5. Demobilization upon completion

B. Erosion Control
   1. Installation of silt fence perimeter controls
   2. Construction entrance stabilization
   3. Sediment basin installation and maintenance
   4. Inlet protection devices
   5. Ongoing erosion control maintenance and inspections

C. Site Demolition
   1. Removal of existing pavement and curbing
   2. Demolition of existing site utilities
   3. Removal of existing fencing and signage
   4. Hauling and disposal of demolition debris

D. Building Demolition
   1. Demolition of existing structures
   2. Foundation removal and disposal
   3. Utility disconnection and capping
   4. Debris hauling and landfill disposal

E. Clearing
   1. Tree removal and stump grinding
   2. Brush clearing and disposal
   3. Topsoil stripping and stockpiling
   4. Root removal from grading areas

F. Excavation and Grading
   1. Mass earthwork cut and fill operations
   2. Building pad preparation and compaction
   3. Fine grading for roadways and parking
   4. Subgrade preparation and proof rolling
   5. Import/export of fill material as required
   6. Compaction testing coordination

G. Sanitary
   1. Sanitary sewer main installation
   2. Sanitary sewer lateral connections
   3. Manhole installation
   4. Testing and inspection coordination
   5. Trench backfill and compaction

H. Storm Drain
   1. Storm drain pipe installation
   2. Storm drain structure and inlet installation
   3. Stormwater management facility construction
   4. Outfall construction and stabilization
   5. Testing and video inspection

I. Water
   1. Water main installation
   2. Water service lateral connections by VA American Water
   3. Fire hydrant installation
   4. Valve and fitting installation
   5. Pressure, Fire Marshal and chlorination testing
   6. Removal, transportation and disposal of spoils

J. Site Concrete
   1. Concrete curb and gutter installation
   2. Sidewalk installations
   3. Apron installations
   4. Curb & gutter installations
   5. Inspection coordination
   6. Maintenance of Traffic including flaggers
   7. Removal, transportation and disposal of spoils

K. Asphalt and Paving
   1. Aggregate base course installation
   2. Asphalt base course paving. Assumes demobilization at this point.
   3. Asphalt surface course paving. 2nd mobilization included
   4. Removal, transportation and disposal of spoils if needed
   5. Inspection coordination as required
   6. Maintenance of Traffic including flaggers

L. Retaining Walls
   1. Excluded from contract
   2. Subcontractor must meet with Contractor, prior to starting, to coordinate installation of retaining walls`,
    projectDrawings: exhibits.projectDrawings,
    generalRequirements: exhibits.generalRequirements,
  };

  const [alternates, setAlternates] = useState<AlternateItem[]>(DEFAULT_ALTERNATES);
  const [lineItems, setLineItems] = useState<LineItem[]>(DEFAULT_LINE_ITEMS);
  const [fields, setFields] = useState<ContractFields>(DEFAULT_FIELDS);

  // Load saved data once available
  useEffect(() => {
    if (savedData && isInitialLoad.current) {
      if (savedData.fields) {
        const mergedFields = { ...DEFAULT_FIELDS, ...savedData.fields };
        // One-time migration: if saved scope of work is missing updated I/J/K/L sections, use new defaults
        if (savedData.fields.scopeOfWork && !savedData.fields.scopeOfWork.includes("VA American Water")) {
          mergedFields.scopeOfWork = DEFAULT_FIELDS.scopeOfWork;
        }
        // One-time migration: if saved projectDrawings is missing the full sheet index, use new defaults
        if (!savedData.fields.projectDrawings || !savedData.fields.projectDrawings.includes("Sheet 1: Cover Sheet") || !savedData.fields.projectDrawings.includes("HIGHLIGHTED SCOPE OF WORK")) {
          mergedFields.projectDrawings = DEFAULT_EXHIBITS.projectDrawings;
        }
        setFields(mergedFields);
      }
      if (savedData.lineItems) {
        setLineItems(savedData.lineItems);
      }
      if (savedData.alternates) {
        setAlternates(savedData.alternates);
      }
      isInitialLoad.current = false;
    } else if (!isLoadingFormData && !savedData) {
      isInitialLoad.current = false;
    }
  }, [savedData, isLoadingFormData]);

  // Debounced autosave - 2 seconds after last change
  useEffect(() => {
    if (isInitialLoad.current || isLoadingFormData) return;

    const timer = setTimeout(() => {
      setSaveStatus("saving");
      saveFormData(
        { fields: fields as unknown as { [key: string]: string }, lineItems, alternates },
        {
          onSuccess: () => {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          },
          onError: () => {
            setSaveStatus("idle");
          },
        }
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [fields, lineItems, alternates]);

  const contractTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const alternatesTotal = alternates.reduce((sum, item) => sum + item.amount, 0);

  const updateAlternateAmount = (index: number, raw: string) => {
    const num = parseFloat(raw.replace(/[^0-9.-]/g, ""));
    setAlternates((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount: isNaN(num) ? 0 : num } : item))
    );
  };

  const addAlternate = () => {
    const nextNum = alternates.length + 1;
    setAlternates((prev) => [...prev, { letter: String(nextNum), description: "", amount: 0 }]);
  };

  const removeAlternate = (index: number) => {
    setAlternates((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, letter: String(i + 1) })));
  };

  const update = (key: keyof ContractFields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const renderField = (label: string, fieldKey: keyof ContractFields, className = "") => (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="text-sm font-medium whitespace-nowrap">{label}:</span>
      <Input
        value={fields[fieldKey]}
        onChange={(e) => update(fieldKey, e.target.value)}
        className="h-8 text-sm flex-1 border-b border-t-0 border-x-0 rounded-none bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Enter value"
      />
    </div>
  );

  // ── Print helpers ──

  const generatePrintHeader = (subtitle: string) => `
    <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
      <h1 style="font-size: 16px; font-weight: 700; text-decoration: underline; margin: 0;">SUBCONTRACTOR AGREEMENT</h1>
      <p style="font-size: 10px; color: #888; margin: 4px 0 0 0;">${subtitle}</p>
    </div>
  `;

  const generatePrintPartyBlock = (title: string, company: string, address: string, phone: string, contact: string, contactLabel: string) => `
    <div style="margin-bottom: 8px;">
      <div style="font-weight: 700; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 11px;"><strong>Company:</strong> ${company}</div>
      <div style="font-size: 11px;"><strong>Address:</strong> ${address}</div>
      <div style="font-size: 11px;"><strong>Phone:</strong> ${phone}</div>
      <div style="font-size: 11px;"><strong>${contactLabel}:</strong> ${contact}</div>
    </div>
  `;

  const generatePrintLineItems = () => lineItems.map(item => `
    <tr>
      <td style="padding: 2px 6px; border-bottom: 1px solid #ddd; font-weight: 500;">${item.letter}</td>
      <td style="padding: 2px 6px; border-bottom: 1px solid #ddd;">${item.description}</td>
      <td style="padding: 2px 6px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  const getEnrichedArticles = (list: typeof articles) =>
    list.map(article =>
      article.num === 3
        ? { ...article, body: `The Contractor agrees to pay the Subcontractor ${formatCurrency(contractTotal)} for full performance of the Work. Payments will be made based on approved progress of the Work in accordance with the Contractor's payment procedures.` }
        : article
    );

  const generatePrintArticles = (list: typeof articles) => list.map(article => `
    <div style="margin-bottom: 6px;">
      <h3 style="font-size: 10px; font-weight: 700; margin: 0 0 1px 0;">ARTICLE ${article.num} – ${article.title}</h3>
      <div style="font-size: 9.5px; white-space: pre-line; color: #555; line-height: 1.3;">${article.body}</div>
    </div>
  `).join('');



  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Capture print timestamp once
    const printedAt = new Date();
    const printDate = printedAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    const printTime = printedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Footer helper
    const makeFooter = (pageNum: number, totalPages: number) => `
      <div style="position: absolute; bottom: 0.5in; left: 0.75in; right: 0.75in; border-top: 1px solid #000; padding-top: 4px; display: flex; justify-content: space-between; font-size: 9px; color: #444;">
        <span>${printDate}</span>
        <span>${printTime}</span>
        <span>Page ${pageNum} of ${totalPages}</span>
      </div>
    `;

    // Section-aware Exhibit A pagination
    const scopeText = fields.scopeOfWork || '';
    // Split by major section headers (A., B., C., ... Z.) at the start of a line
    const sectionRegex = /(?=^[A-Z]\.\s)/m;
    const rawSections = scopeText.split(sectionRegex).filter(s => s.trim());
    
    // Group sections into pages based on estimated line count
    const MAX_LINES_PER_PAGE = 68; // reduced from 75 to leave room for footer
    const scopeChunks: string[] = [];
    let currentChunk = '';
    let currentLineCount = 0;
    
    for (const section of rawSections) {
      const sectionLines = section.split('\n').length;
      if (currentLineCount > 0 && currentLineCount + sectionLines > MAX_LINES_PER_PAGE) {
        // Push current chunk and start a new page
        scopeChunks.push(currentChunk);
        currentChunk = section;
        currentLineCount = sectionLines;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + section;
        currentLineCount += sectionLines;
      }
    }
    if (currentChunk.trim()) scopeChunks.push(currentChunk);
    if (scopeChunks.length === 0) scopeChunks.push('');

    // Section-aware Exhibit B pagination
    const drawingsText = fields.projectDrawings || '';
    const drawingsLines = drawingsText.split('\n');
    const MAX_DRAWING_LINES = 55;
    const drawingChunks: string[] = [];
    let currentDrawingChunk = '';
    let currentDrawingLineCount = 0;
    
    for (const line of drawingsLines) {
      if (currentDrawingLineCount > 0 && currentDrawingLineCount + 1 > MAX_DRAWING_LINES) {
        drawingChunks.push(currentDrawingChunk);
        currentDrawingChunk = line;
        currentDrawingLineCount = 1;
      } else {
        currentDrawingChunk += (currentDrawingChunk ? '\n' : '') + line;
        currentDrawingLineCount += 1;
      }
    }
    if (currentDrawingChunk.trim()) drawingChunks.push(currentDrawingChunk);
    if (drawingChunks.length === 0) drawingChunks.push('');

    // Calculate total pages: 1 (summary) + 2 (articles) + scopeChunks + drawingChunks + 1 (signatures)
    const totalPages = 3 + scopeChunks.length + drawingChunks.length + 1;

    const makePage = (pageNum: number, subtitle: string, content: string) => `
      <div style="position: relative; width: 8.5in; height: 11in; padding: 0.5in 0.75in 0.9in 0.75in; page-break-after: always; box-sizing: border-box;">
        ${generatePrintHeader(subtitle)}
        <div style="font-size: 11px;">${content}</div>
        ${makeFooter(pageNum, totalPages)}
      </div>
    `;

    // Page 1: Contract Summary
    const page1Content = [
      `<p style="font-size: 10px; margin-bottom: 12px;">THIS AGREEMENT, made and entered into this <span style="border-bottom: 1px solid #000; padding: 0 4px;">${fields.contractDate || '_______________'}</span> ("Contract Date") by and between</p>`,
      generatePrintPartyBlock("CONTRACTOR", fields.contractorName, fields.contractorAddress, fields.contractorPhone, fields.contractorPM, "Project Manager"),
      `<p style="font-size: 10px; font-style: italic; text-align: center; margin: 4px 0;">(hereinafter called the "Contractor") and</p>`,
      generatePrintPartyBlock("SUBCONTRACTOR", fields.subcontractorName, fields.subcontractorAddress, fields.subcontractorPhone, fields.subcontractorContact, "ATTN"),
      `<p style="font-size: 10px; font-style: italic; text-align: center; margin: 4px 0;">(hereinafter called "Subcontractor")</p>`,
      generatePrintPartyBlock("PROJECT", fields.projectName, fields.projectAddress, fields.projectPhone, fields.projectContact, "ATTN"),
      `<p style="font-size: 10px; font-style: italic; text-align: center; margin: 4px 0 12px 0;">(hereinafter referred to as the "Project").</p>`,
      `<div><div style="font-weight: 700; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 6px;">CONTRACT VALUE BREAKDOWN</div>`,
      `<table><thead><tr style="border-bottom: 2px solid #000;"><th style="text-align: left; padding: 2px 6px; font-size: 10px; width: 30px;">Item</th><th style="text-align: left; padding: 2px 6px; font-size: 10px;">Description</th><th style="text-align: right; padding: 2px 6px; font-size: 10px; width: 100px;">Amount</th></tr></thead>`,
      `<tbody>${generatePrintLineItems()}</tbody>`,
      `<tfoot><tr style="border-top: 2px solid #000;"><td style="padding: 4px 6px;"></td><td style="padding: 4px 6px; font-weight: 700;">TOTAL</td><td style="padding: 4px 6px; text-align: right; font-weight: 700;">${formatCurrency(contractTotal)}</td></tr></tfoot></table></div>`,
      alternates.length > 0 ? `<div style="margin-top: 12px;"><div style="font-weight: 700; font-size: 10px; letter-spacing: 0.05em; margin-bottom: 6px;">ADD ALTERNATES</div><table><thead><tr style="border-bottom: 2px solid #000;"><th style="text-align: left; padding: 2px 6px; font-size: 10px; width: 30px;">Item</th><th style="text-align: left; padding: 2px 6px; font-size: 10px;">Description</th><th style="text-align: right; padding: 2px 6px; font-size: 10px; width: 100px;">Amount</th></tr></thead><tbody>${alternates.map(item => `<tr><td style="padding: 2px 6px; border-bottom: 1px solid #ddd; font-weight: 500;">${item.letter}</td><td style="padding: 2px 6px; border-bottom: 1px solid #ddd;">${item.description}</td><td style="padding: 2px 6px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.amount)}</td></tr>`).join('')}</tbody><tfoot><tr style="border-top: 2px solid #000;"><td style="padding: 4px 6px;"></td><td style="padding: 4px 6px; font-weight: 700;">ALTERNATES TOTAL</td><td style="padding: 4px 6px; text-align: right; font-weight: 700;">${formatCurrency(alternatesTotal)}</td></tr></tfoot></table></div>` : '',
      fields.startDate ? `<p style="font-size: 11px; margin-top: 12px;"><strong>Start Date:</strong> ${fields.startDate}</p>` : '',
    ].join('');

    // Articles
    const enrichedArticles = getEnrichedArticles(articles);
    const articlesFirstHalf = enrichedArticles.filter(a => a.num <= 9);
    const articlesSecondHalf = enrichedArticles.filter(a => a.num > 9);
    const page2Content = generatePrintArticles(articlesFirstHalf);
    const page3Content = generatePrintArticles(articlesSecondHalf);

    // Scope pages
    const scopePages = scopeChunks.map((chunk, i) => {
      const subtitle = i === 0 ? "EXHIBIT A – SCOPE OF WORK" : "EXHIBIT A – SCOPE OF WORK (CONTINUED)";
      const content = `<div style="white-space: pre-line;">${chunk}</div>`;
      return makePage(4 + i, subtitle, content);
    }).join('');

    // Exhibit B pages
    const exhibitBStartPage = 4 + scopeChunks.length;
    const exhibitBPages = drawingChunks.map((chunk, i) => {
      const subtitle = i === 0 ? "EXHIBIT B – PROJECT DRAWINGS" : "EXHIBIT B – PROJECT DRAWINGS (CONTINUED)";
      const content = `<div style="white-space: pre-line; font-size: 11px;">${chunk}</div>`;
      return makePage(exhibitBStartPage + i, subtitle, content);
    }).join('');

    // Signatures
    const sigPageNum = exhibitBStartPage + drawingChunks.length;
    const signaturesContent = [
      `<div style="display: flex; gap: 40px; margin-top: 24px;">`,
      `<div style="flex: 1;"><p style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Contractor</p><p style="font-weight: 600;">${fields.contractorName || 'CONTRACTOR'}</p><div style="border-bottom: 1px solid #999; height: 40px; margin-top: 20px;"></div><p style="font-size: 10px; color: #888;">Signature</p><p style="font-size: 11px; margin-top: 8px; display: flex;"><strong style="min-width: 40px;">Name:</strong><span style="flex: 1; border-bottom: 1px solid #000;">${fields.contractorSignerName ? '&nbsp;' + fields.contractorSignerName : '&nbsp;'}</span></p><p style="font-size: 11px; display: flex;"><strong style="min-width: 40px;">Title:</strong><span style="flex: 1; border-bottom: 1px solid #000;">${fields.contractorSignerTitle ? '&nbsp;' + fields.contractorSignerTitle : '&nbsp;'}</span></p><p style="font-size: 11px; display: flex;"><strong style="min-width: 40px;">Date:</strong><span style="flex: 1; border-bottom: 1px solid #000;">${fields.contractorSignerDate ? '&nbsp;' + fields.contractorSignerDate : '&nbsp;'}</span></p></div>`,
      `<div style="flex: 1;"><p style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Subcontractor</p><p style="font-weight: 600;">${fields.subcontractorName || 'SUBCONTRACTOR'}</p><div style="border-bottom: 1px solid #999; height: 40px; margin-top: 20px;"></div><p style="font-size: 10px; color: #888;">Signature</p><p style="font-size: 11px; margin-top: 8px; display: flex;"><strong style="min-width: 40px;">Name:</strong><span style="flex: 1; border-bottom: 1px solid #000;">${fields.subcontractorSignerName ? '&nbsp;' + fields.subcontractorSignerName : '&nbsp;'}</span></p><p style="font-size: 11px; display: flex;"><strong style="min-width: 40px;">Title:</strong><span style="flex: 1; border-bottom: 1px solid #000;">${fields.subcontractorSignerTitle ? '&nbsp;' + fields.subcontractorSignerTitle : '&nbsp;'}</span></p><p style="font-size: 11px; display: flex;"><strong style="min-width: 40px;">Date:</strong><span style="flex: 1; border-bottom: 1px solid #000;">${fields.subcontractorSignerDate ? '&nbsp;' + fields.subcontractorSignerDate : '&nbsp;'}</span></p></div>`,
      `</div>`,
    ].join('');

    const htmlContent = `<!DOCTYPE html><html><head><title>Subcontractor Agreement</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Montserrat', sans-serif; font-size: 11px; margin: 0; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  @page { margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style></head><body>
${makePage(1, "CONTRACT SUMMARY", page1Content)}
${makePage(2, "ARTICLES", page2Content)}
${makePage(3, "ARTICLES (CONTINUED)", page3Content)}
${scopePages}
${exhibitBPages}
${makePage(sigPageNum, "SIGNATURES", signaturesContent)}
</body></html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.document.fonts.ready.then(() => {
      setTimeout(() => printWindow.print(), 150);
    });
  }, [fields, lineItems, contractTotal, articles]);

  useEffect(() => {
    if (onPrintReady) {
      onPrintReady(handlePrint);
    }
  }, [onPrintReady, handlePrint]);

  if (isLoading || isLoadingFormData) {
    return (
      <div className="print-container bg-background text-foreground max-w-[8.5in] mx-auto p-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // ── On-screen helpers ──

  const renderPageHeader = (subtitle: string) => (
    <div className="text-center border-b border-foreground pb-3 mb-6">
      <h1 className="text-lg font-bold tracking-wide text-foreground underline">SUBCONTRACTOR AGREEMENT</h1>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );

  const renderPageNav = () => (
    <div className="no-print flex items-center justify-between border-b pb-4 mb-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
        </div>
        {saveStatus === "saving" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-green-500" />
            Saved
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage((p) => Math.min(TOTAL_PAGES, p + 1))}
        disabled={currentPage === TOTAL_PAGES}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderArticles = (list: typeof articles) =>
    list.map((article) => (
      <div key={article.num} className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">
          ARTICLE {article.num} – {article.title}
        </h3>
        <div className="text-sm text-muted-foreground whitespace-pre-line">
          {article.body}
        </div>
      </div>
    ));

  const renderPartyBlock = (title: string, fieldKeys: { name: keyof ContractFields; address: keyof ContractFields; phone: keyof ContractFields; contact: keyof ContractFields }, contactLabel: string) => (
    <div className="p-3 space-y-1">
      <h3 className="text-xs font-bold text-foreground tracking-wide">{title}</h3>
      {renderField("Company", fieldKeys.name)}
      {renderField("Address", fieldKeys.address)}
      {renderField("Phone", fieldKeys.phone)}
      {renderField(contactLabel, fieldKeys.contact)}
    </div>
  );

  const updateLineItemAmount = (index: number, value: string) => {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, amount: isNaN(parsed) ? 0 : parsed } : item))
    );
  };

  const renderPage1Content = () => (
    <div className="space-y-3">
      {renderPageHeader("CONTRACT SUMMARY")}

      <p className="text-xs text-foreground leading-relaxed">
        THIS AGREEMENT, made and entered into this{" "}
        <span className="inline-block min-w-[180px] border-b border-foreground">
          <Input
            value={fields.contractDate}
            onChange={(e) => update("contractDate", e.target.value)}
            className="h-5 text-xs border-0 bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0 inline"
            placeholder="date"
          />
        </span>{" "}
        ("Contract Date") by and between
      </p>

      {renderPartyBlock("CONTRACTOR", { name: "contractorName", address: "contractorAddress", phone: "contractorPhone", contact: "contractorPM" }, "Project Manager")}
      <p className="text-xs text-foreground italic text-center">(hereinafter called the "Contractor") and</p>
      {renderPartyBlock("SUBCONTRACTOR", { name: "subcontractorName", address: "subcontractorAddress", phone: "subcontractorPhone", contact: "subcontractorContact" }, "ATTN")}
      <p className="text-xs text-foreground italic text-center">(hereinafter called "Subcontractor")</p>
      {renderPartyBlock("PROJECT", { name: "projectName", address: "projectAddress", phone: "projectPhone", contact: "projectContact" }, "ATTN")}
      <p className="text-xs text-foreground italic text-center">(hereinafter referred to as the "Project").</p>

      <div className="p-3">
        <h3 className="text-xs font-bold text-foreground tracking-wide mb-2">CONTRACT VALUE BREAKDOWN</h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-foreground">
              <th className="text-left py-1 w-8 font-semibold text-foreground">Item</th>
              <th className="text-left py-1 font-semibold text-foreground">Description</th>
              <th className="text-right py-1 font-semibold text-foreground w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={item.letter} className="border-b border-muted/50">
                <td className="py-0.5 text-foreground font-medium">{item.letter}</td>
                <td className="py-0.5 text-foreground">{item.description}</td>
                <td className="py-0.5 text-right">
                  <Input
                    value={formatCurrency(item.amount)}
                    onChange={(e) => updateLineItemAmount(index, e.target.value)}
                    className="h-5 text-xs text-right border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-28 ml-auto"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground">
              <td className="py-1" />
              <td className="py-1 text-foreground font-bold">TOTAL</td>
              <td className="py-1 text-right text-foreground font-bold">{formatCurrency(contractTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-foreground tracking-wide">ADD ALTERNATES</h3>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={addAlternate}>+ Add</Button>
          </div>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-foreground">
              <th className="text-left py-1 w-8 font-semibold text-foreground">Item</th>
              <th className="text-left py-1 font-semibold text-foreground">Description</th>
              <th className="text-right py-1 font-semibold text-foreground w-28">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {alternates.map((item, index) => (
              <tr key={index} className="border-b border-muted/50">
                <td className="py-0.5 text-foreground font-medium">{item.letter}</td>
                <td className="py-0.5">
                  <Input
                    value={item.description}
                    onChange={(e) => setAlternates((prev) => prev.map((a, i) => i === index ? { ...a, description: e.target.value } : a))}
                    className="h-5 text-xs border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Description"
                  />
                </td>
                <td className="py-0.5 text-right">
                  <Input
                    value={formatCurrency(item.amount)}
                    onChange={(e) => updateAlternateAmount(index, e.target.value)}
                    className="h-5 text-xs text-right border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-28 ml-auto"
                  />
                </td>
                <td className="py-0.5 text-center">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeAlternate(index)}>×</Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground">
              <td className="py-1" />
              <td className="py-1 text-foreground font-bold">ALTERNATES TOTAL</td>
              <td className="py-1 text-right text-foreground font-bold">{formatCurrency(alternatesTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-4">
        {renderField("Start Date", "startDate", "flex-1")}
      </div>
    </div>
  );

  const renderSignatures = () => (
    <section className="space-y-6">
      {renderPageHeader("SIGNATURES")}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Contractor</p>
          <p className="font-semibold text-foreground uppercase">{fields.contractorName || "CONTRACTOR"}</p>
          <div className="border-b border-muted-foreground/40 pt-8" />
          <p className="text-xs text-muted-foreground">Signature</p>
          {renderField("Name", "contractorSignerName")}
          {renderField("Title", "contractorSignerTitle")}
          {renderField("Date", "contractorSignerDate")}
        </div>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Subcontractor</p>
          <p className="font-semibold text-foreground uppercase">{fields.subcontractorName || "SUBCONTRACTOR"}</p>
          <div className="border-b border-muted-foreground/40 pt-8" />
          <p className="text-xs text-muted-foreground">Signature</p>
          {renderField("Name", "subcontractorSignerName")}
          {renderField("Title", "subcontractorSignerTitle")}
          {renderField("Date", "subcontractorSignerDate")}
        </div>
      </div>
    </section>
  );

  return (
    <div className="print-container bg-background text-foreground max-w-[8.5in] mx-auto border border-border rounded-lg shadow-sm">
      <div className="p-8 md:p-12 space-y-6 text-sm leading-relaxed">
        {renderPageNav()}

        {currentPage === 1 && renderPage1Content()}

        {currentPage === 2 && (
          <section className="space-y-4">
            {renderPageHeader("ARTICLES")}
            {renderArticles(getEnrichedArticles(articles).filter(a => a.num <= 9))}
          </section>
        )}

        {currentPage === 3 && (
          <section className="space-y-4">
            {renderPageHeader("ARTICLES (CONTINUED)")}
            {renderArticles(getEnrichedArticles(articles).filter(a => a.num > 9))}
          </section>
        )}

        {currentPage === 4 && (
          <section className="space-y-3">
            {renderPageHeader("EXHIBIT A – SCOPE OF WORK")}
            <Textarea
              value={fields.scopeOfWork}
              onChange={(e) => update("scopeOfWork", e.target.value)}
              placeholder="Describe the scope of work..."
              className="min-h-[600px] text-sm"
            />
          </section>
        )}

        {currentPage === 5 && (
          <section className="space-y-3">
            {renderPageHeader("EXHIBIT B – PROJECT DRAWINGS")}
            <Textarea
              value={fields.projectDrawings}
              onChange={(e) => update("projectDrawings", e.target.value)}
              className="min-h-[400px] text-sm"
            />
          </section>
        )}

        {currentPage === 6 && renderSignatures()}
      </div>
    </div>
  );
};

export default SubcontractorContractForm;

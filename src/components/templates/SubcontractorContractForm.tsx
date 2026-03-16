import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTemplateContent } from "@/hooks/useTemplateContent";

interface LineItem {
  letter: string;
  description: string;
  amount: number;
}

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
  subcontractorSignerName: string;
  subcontractorSignerTitle: string;
  scopeOfWork: string;
  projectDrawings: string;
  generalRequirements: string;
}

const TOTAL_PAGES = 7;

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD" });

const SubcontractorContractForm = ({ onPrintReady }: { onPrintReady?: (printFn: () => void) => void }) => {
  const { articles, exhibits, isLoading } = useTemplateContent("subcontractor-contract");
  const [currentPage, setCurrentPage] = useState(1);

  const [lineItems, setLineItems] = useState<LineItem[]>([
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
  ]);

  const contractTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const [fields, setFields] = useState<ContractFields>({
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
    subcontractorSignerName: "",
    subcontractorSignerTitle: "",
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
   2. Water service lateral connections
   3. Fire hydrant installation
   4. Valve and fitting installation
   5. Pressure testing and bacteriological testing

J. Site Concrete
   1. Concrete curb and gutter installation
   2. Sidewalk construction
   3. Concrete pad and apron installation
   4. ADA ramp construction
   5. Concrete dumpster pads

K. Asphalt and Paving
   1. Aggregate base course installation
   2. Asphalt base course paving
   3. Asphalt surface course paving
   4. Pavement markings and striping
   5. Speed bumps and signage`,
    projectDrawings: exhibits.projectDrawings,
    generalRequirements: exhibits.generalRequirements,
  });

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
      <h1 style="font-size: 16px; font-weight: 700; text-decoration: underline; margin: 0;">SUBCONTRACT AGREEMENT</h1>
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

  const formatScopeForPrint = (text: string, startLetter: string, endLetter: string) => {
    const lines = text.split('\n');
    let html = '';
    let currentSection = '';
    let inRange = false;
    
    for (const line of lines) {
      const sectionMatch = line.trim().match(/^([A-Z])\./);
      if (sectionMatch) {
        const letter = sectionMatch[1];
        if (letter >= startLetter && letter <= endLetter) {
          inRange = true;
          if (currentSection) html += `</div>`;
          html += `<div style="break-inside: avoid;">`;
          html += `<div style="font-weight: 700; text-transform: uppercase; margin-top: 8px;">${line.trim()}</div>`;
          currentSection = letter;
        } else {
          if (currentSection) html += `</div>`;
          inRange = false;
          currentSection = '';
        }
      } else if (inRange) {
        html += `<div>${line}</div>`;
      }
    }
    if (currentSection) html += `</div>`;
    return html;
  };

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const totalPages = 7;

    const makeFooter = (pageNum: number) => `
      <div style="position: absolute; bottom: 0.5in; left: 0.75in; right: 0.75in; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #000; padding: 4px 0 6px 0; border-top: 0.5px solid #ccc;">
        <span>${dateStr}</span>
        <span>${timeStr}</span>
        <span>Page ${pageNum} of ${totalPages}</span>
      </div>
    `;

    const makePage = (pageNum: number, subtitle: string, content: string) => `
      <div style="min-height: 11in; position: relative; box-sizing: border-box; padding: 0.5in 0.75in; ${pageNum > 1 ? 'page-break-before: always;' : ''}">
        ${generatePrintHeader(subtitle)}
        <div style="margin-top: 12px;">
          ${content}
        </div>
        ${makeFooter(pageNum)}
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
      fields.startDate ? `<p style="font-size: 11px; margin-top: 12px;"><strong>Start Date:</strong> ${fields.startDate}</p>` : '',
    ].join('');

    // Page 2: Articles (1-9)
    const enrichedArticles = getEnrichedArticles(articles);
    const articlesFirstHalf = enrichedArticles.filter(a => a.num <= 9);
    const articlesSecondHalf = enrichedArticles.filter(a => a.num > 9);
    const page2Content = generatePrintArticles(articlesFirstHalf);

    // Page 3: Articles continued (10-15)
    const page3Content = generatePrintArticles(articlesSecondHalf);

    // Page 4: Exhibit A (A-F)
    const page4Content = `<div style="font-size: 11px;">${formatScopeForPrint(fields.scopeOfWork || '', 'A', 'F')}</div>`;

    // Page 5: Exhibit A continued (G-K)
    const page5Content = `<div style="font-size: 11px;">${formatScopeForPrint(fields.scopeOfWork || '', 'G', 'K')}</div>`;

    // Page 6: Exhibit B
    const page6Content = `<div style="white-space: pre-line; font-size: 11px;">${fields.projectDrawings || ''}</div>`;

    // Page 7: Signatures
    const page7Content = [
      `<div style="display: flex; gap: 40px; margin-top: 24px;">`,
      `<div style="flex: 1;"><p style="font-weight: 600;">CONTRACTOR</p><div style="border-bottom: 1px solid #999; height: 40px; margin-top: 20px;"></div><p style="font-size: 10px; color: #888;">Signature</p><p style="font-size: 11px; margin-top: 8px;"><strong>Name:</strong> ${fields.contractorSignerName || '_______________'}</p><p style="font-size: 11px;"><strong>Title:</strong> ${fields.contractorSignerTitle || '_______________'}</p></div>`,
      `<div style="flex: 1;"><p style="font-weight: 600;">SUBCONTRACTOR</p><div style="border-bottom: 1px solid #999; height: 40px; margin-top: 20px;"></div><p style="font-size: 10px; color: #888;">Signature</p><p style="font-size: 11px; margin-top: 8px;"><strong>Name:</strong> ${fields.subcontractorSignerName || '_______________'}</p><p style="font-size: 11px;"><strong>Title:</strong> ${fields.subcontractorSignerTitle || '_______________'}</p></div>`,
      `</div>`,
    ].join('');

    const htmlContent = [
      `<!DOCTYPE html><html><head><title> </title>`,
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap">`,
      `<style>`,
      `* { box-sizing: border-box; }`,
      `body { font-family: 'Montserrat', sans-serif; font-size: 11px; margin: 0; padding: 0; }`,
      `table { border-collapse: collapse; width: 100%; }`,
      `@media print { @page { margin: 0; size: letter; } }`,
      `</style></head><body style="padding: 0; margin: 0;">`,
      makePage(1, "CONTRACT SUMMARY", page1Content),
      makePage(2, "ARTICLES", page2Content),
      makePage(3, "ARTICLES (CONTINUED)", page3Content),
      makePage(4, "EXHIBIT A – SCOPE OF WORK", page4Content),
      makePage(5, "EXHIBIT A – SCOPE OF WORK (CONTINUED)", page5Content),
      makePage(6, "EXHIBIT B – PROJECT DRAWINGS", page6Content),
      makePage(7, "SIGNATURES", page7Content),
      `</body></html>`
    ].join('\n');

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

  if (isLoading) {
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
      <h1 className="text-lg font-bold tracking-wide text-foreground underline">SUBCONTRACT AGREEMENT</h1>
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
          <p className="font-semibold text-foreground">CONTRACTOR</p>
          <div className="border-b border-muted-foreground/40 pt-8" />
          <p className="text-xs text-muted-foreground">Signature</p>
          {renderField("Name", "contractorSignerName")}
          {renderField("Title", "contractorSignerTitle")}
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-foreground">SUBCONTRACTOR</p>
          <div className="border-b border-muted-foreground/40 pt-8" />
          <p className="text-xs text-muted-foreground">Signature</p>
          {renderField("Name", "subcontractorSignerName")}
          {renderField("Title", "subcontractorSignerTitle")}
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
            {renderPageHeader("EXHIBIT A – SCOPE OF WORK (CONTINUED)")}
            <p className="text-xs text-muted-foreground italic">This page displays sections G–K in print output.</p>
          </section>
        )}

        {currentPage === 6 && (
          <section className="space-y-3">
            {renderPageHeader("EXHIBIT B – PROJECT DRAWINGS")}
            <Textarea
              value={fields.projectDrawings}
              onChange={(e) => update("projectDrawings", e.target.value)}
              className="min-h-[400px] text-sm"
            />
          </section>
        )}

        {currentPage === 7 && renderSignatures()}
      </div>
    </div>
  );
};

export default SubcontractorContractForm;

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@4.0.0";
import jsPDF from "npm:jspdf@2.5.2";
import JSZip from "npm:jszip@3.10.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  recipientEmail: string;
  projectId: string;
  delivery: "combined" | "individual";
  reports: {
    balanceSheet: boolean;
    incomeStatement: boolean;
    jobCosts: boolean;
    bankStatementIds: string[];
  };
  asOfDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      recipientEmail,
      projectId,
      delivery,
      reports,
      asOfDate,
    }: ReportRequest = await req.json();

    console.log("Generating reports for project:", projectId);
    console.log("Selected reports:", reports);
    console.log("As of date:", asOfDate);

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("address")
      .eq("id", projectId)
      .single();

    const projectName = project?.address || "Project";

    // Generate PDFs
    const pdfFiles: Array<{ name: string; data: Uint8Array }> = [];

    // Balance Sheet
    if (reports.balanceSheet) {
      console.log("Generating Balance Sheet...");
      const balanceSheetPdf = await generateBalanceSheet(supabase, projectId, asOfDate);
      pdfFiles.push({
        name: `Balance_Sheet_as_of_${asOfDate}.pdf`,
        data: balanceSheetPdf,
      });
    }

    // Income Statement
    if (reports.incomeStatement) {
      console.log("Generating Income Statement...");
      const incomeStatementPdf = await generateIncomeStatement(supabase, projectId, asOfDate);
      pdfFiles.push({
        name: `Income_Statement_as_of_${asOfDate}.pdf`,
        data: incomeStatementPdf,
      });
    }

    // Job Costs
    if (reports.jobCosts) {
      console.log("Generating Job Costs Report...");
      const jobCostsPdf = await generateJobCostsReport(supabase, projectId, asOfDate);
      pdfFiles.push({
        name: `Job_Costs_as_of_${asOfDate}.pdf`,
        data: jobCostsPdf,
      });
    }

    // Bank Statements
    if (reports.bankStatementIds && reports.bankStatementIds.length > 0) {
      console.log("Fetching Bank Statements...");
      const bankStatements = await fetchBankStatements(supabase, projectId, reports.bankStatementIds);
      for (const statement of bankStatements) {
        pdfFiles.push(statement);
      }
    }

    // Prepare attachments
    let attachments: Array<{ filename: string; content: string }> = [];

    if (delivery === "combined") {
      // Create ZIP file
      console.log("Creating ZIP file...");
      const zip = new JSZip();
      for (const file of pdfFiles) {
        zip.file(file.name, file.data);
      }
      const zipData = await zip.generateAsync({ type: "uint8array" });
      const zipBase64 = btoa(String.fromCharCode(...zipData));
      
      attachments = [{
        filename: `Accounting_Reports_${projectName}_as_of_${asOfDate}.zip`,
        content: zipBase64,
      }];
    } else {
      // Individual PDFs
      attachments = pdfFiles.map(file => ({
        filename: file.name,
        content: btoa(String.fromCharCode(...file.data)),
      }));
    }

    // Send email
    console.log("Sending email to:", recipientEmail);
    const emailResponse = await resend.emails.send({
      from: "BuilderSuite AI <noreply@transactional.buildersuiteai.com>",
      to: [recipientEmail],
      subject: `Accounting Reports - ${projectName} (As of ${asOfDate})`,
      html: generateEmailTemplate(projectName, asOfDate, reports, pdfFiles.length),
      attachments,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-accounting-reports function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

async function generateBalanceSheet(supabase: any, projectId: string, asOfDate: string): Promise<Uint8Array> {
  const doc = new jsPDF();
  
  // Fetch account data
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("account_number");

  // Fetch journal entries
  const { data: journalLines } = await supabase
    .from("journal_entry_lines")
    .select(`
      *,
      journal_entries!inner(entry_date)
    `)
    .lte("journal_entries.entry_date", asOfDate);

  // Calculate balances
  const balances: Record<string, number> = {};
  journalLines?.forEach((line: any) => {
    if (!balances[line.account_id]) {
      balances[line.account_id] = 0;
    }
    balances[line.account_id] += (line.debit || 0) - (line.credit || 0);
  });

  // Generate PDF
  doc.setFontSize(18);
  doc.text("Balance Sheet", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text(`As of ${asOfDate}`, 105, 30, { align: "center" });

  let y = 50;
  doc.setFontSize(10);

  // Assets
  doc.text("ASSETS", 20, y);
  y += 10;
  accounts?.filter((a: any) => a.account_type === "asset").forEach((account: any) => {
    const balance = balances[account.id] || 0;
    doc.text(`  ${account.name}`, 20, y);
    doc.text(`$${balance.toFixed(2)}`, 150, y, { align: "right" });
    y += 7;
  });

  y += 10;

  // Liabilities
  doc.text("LIABILITIES", 20, y);
  y += 10;
  accounts?.filter((a: any) => a.account_type === "liability").forEach((account: any) => {
    const balance = Math.abs(balances[account.id] || 0);
    doc.text(`  ${account.name}`, 20, y);
    doc.text(`$${balance.toFixed(2)}`, 150, y, { align: "right" });
    y += 7;
  });

  y += 10;

  // Equity
  doc.text("EQUITY", 20, y);
  y += 10;
  accounts?.filter((a: any) => a.account_type === "equity").forEach((account: any) => {
    const balance = Math.abs(balances[account.id] || 0);
    doc.text(`  ${account.name}`, 20, y);
    doc.text(`$${balance.toFixed(2)}`, 150, y, { align: "right" });
    y += 7;
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

async function generateIncomeStatement(supabase: any, projectId: string, asOfDate: string): Promise<Uint8Array> {
  const doc = new jsPDF();
  
  // Fetch account data
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("account_number");

  // Fetch journal entries up to date
  const { data: journalLines } = await supabase
    .from("journal_entry_lines")
    .select(`
      *,
      journal_entries!inner(entry_date)
    `)
    .lte("journal_entries.entry_date", asOfDate);

  // Calculate balances
  const balances: Record<string, number> = {};
  journalLines?.forEach((line: any) => {
    if (!balances[line.account_id]) {
      balances[line.account_id] = 0;
    }
    balances[line.account_id] += (line.debit || 0) - (line.credit || 0);
  });

  // Generate PDF
  doc.setFontSize(18);
  doc.text("Income Statement", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text(`As of ${asOfDate}`, 105, 30, { align: "center" });

  let y = 50;
  doc.setFontSize(10);

  // Revenue
  doc.text("REVENUE", 20, y);
  y += 10;
  let totalRevenue = 0;
  accounts?.filter((a: any) => a.account_type === "revenue").forEach((account: any) => {
    const balance = Math.abs(balances[account.id] || 0);
    totalRevenue += balance;
    doc.text(`  ${account.name}`, 20, y);
    doc.text(`$${balance.toFixed(2)}`, 150, y, { align: "right" });
    y += 7;
  });

  y += 5;
  doc.text("Total Revenue", 20, y);
  doc.text(`$${totalRevenue.toFixed(2)}`, 150, y, { align: "right" });
  y += 15;

  // Expenses
  doc.text("EXPENSES", 20, y);
  y += 10;
  let totalExpenses = 0;
  accounts?.filter((a: any) => a.account_type === "expense").forEach((account: any) => {
    const balance = balances[account.id] || 0;
    totalExpenses += balance;
    doc.text(`  ${account.name}`, 20, y);
    doc.text(`$${balance.toFixed(2)}`, 150, y, { align: "right" });
    y += 7;
  });

  y += 5;
  doc.text("Total Expenses", 20, y);
  doc.text(`$${totalExpenses.toFixed(2)}`, 150, y, { align: "right" });
  y += 15;

  // Net Income
  const netIncome = totalRevenue - totalExpenses;
  doc.setFontSize(12);
  doc.text("NET INCOME", 20, y);
  doc.text(`$${netIncome.toFixed(2)}`, 150, y, { align: "right" });

  return new Uint8Array(doc.output("arraybuffer"));
}

async function generateJobCostsReport(supabase: any, projectId: string, asOfDate: string): Promise<Uint8Array> {
  const doc = new jsPDF();
  
  // Fetch project budgets
  const { data: budgets } = await supabase
    .from("project_budgets")
    .select(`
      *,
      cost_codes(code, name)
    `)
    .eq("project_id", projectId)
    .order("cost_code_id");

  // Generate PDF
  doc.setFontSize(18);
  doc.text("Job Costs Report", 105, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text(`As of ${asOfDate}`, 105, 30, { align: "center" });

  let y = 50;
  doc.setFontSize(9);

  // Header
  doc.text("Cost Code", 20, y);
  doc.text("Budget", 80, y);
  doc.text("Actual", 120, y);
  doc.text("Variance", 160, y);
  y += 10;

  // Data rows
  budgets?.forEach((budget: any) => {
    const costCode = budget.cost_codes;
    const budgetAmount = budget.budget_amount || 0;
    const actualAmount = budget.actual_amount || 0;
    const variance = budgetAmount - actualAmount;

    doc.text(`${costCode?.code} - ${costCode?.name}`, 20, y);
    doc.text(`$${budgetAmount.toFixed(2)}`, 80, y);
    doc.text(`$${actualAmount.toFixed(2)}`, 120, y);
    doc.text(`$${variance.toFixed(2)}`, 160, y);
    y += 7;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

async function fetchBankStatements(supabase: any, projectId: string, fileIds: string[]): Promise<Array<{ name: string; data: Uint8Array }>> {
  const { data: files } = await supabase
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .in("id", fileIds)
    .like("original_filename", "Bank Statements/%");

  const statements: Array<{ name: string; data: Uint8Array }> = [];

  for (const file of files || []) {
    try {
      const { data: fileData } = await supabase.storage
        .from("project-files")
        .download(file.storage_path);

      if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        const fileName = file.original_filename.replace("Bank Statements/", "");
        statements.push({
          name: fileName,
          data: new Uint8Array(arrayBuffer),
        });
      }
    } catch (error) {
      console.error(`Error fetching bank statement ${file.original_filename}:`, error);
    }
  }

  return statements;
}

function generateEmailTemplate(projectName: string, asOfDate: string, reports: any, fileCount: number): string {
  const selectedReports = [];
  if (reports.balanceSheet) selectedReports.push("Balance Sheet");
  if (reports.incomeStatement) selectedReports.push("Income Statement");
  if (reports.jobCosts) selectedReports.push("Job Costs Report");
  if (reports.bankStatementIds && reports.bankStatementIds.length > 0) {
    selectedReports.push(`Bank Statements (${reports.bankStatementIds.length})`);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          ul { list-style-type: none; padding-left: 0; }
          li { padding: 5px 0; }
          li:before { content: "✓ "; color: #0066cc; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Accounting Reports</h1>
          </div>
          <div class="content">
            <p><strong>Project:</strong> ${projectName}</p>
            <p><strong>As of Date:</strong> ${asOfDate}</p>
            <p><strong>Reports Included:</strong></p>
            <ul>
              ${selectedReports.map(report => `<li>${report}</li>`).join("")}
            </ul>
            <p>Please find ${fileCount} file${fileCount > 1 ? "s" : ""} attached to this email.</p>
          </div>
          <div class="footer">
            <p>This email was generated by BuilderSuite AI</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

serve(handler);

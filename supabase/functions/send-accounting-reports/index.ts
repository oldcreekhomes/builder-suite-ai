import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@4.0.0";
import { jsPDF } from "npm:jspdf@2.5.2";
import JSZip from "npm:jszip@3.10.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to format currency with commas
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

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
      .select("address, owner_id")
      .eq("id", projectId)
      .single();

    const projectName = project?.address || "Project";
    const ownerId = project?.owner_id;

    // Generate PDFs
    const pdfFiles: Array<{ name: string; data: Uint8Array }> = [];

    // Balance Sheet
    if (reports.balanceSheet) {
      console.log("Generating Balance Sheet...");
      const balanceSheetPdf = await generateBalanceSheet(supabase, projectId, ownerId, asOfDate);
      pdfFiles.push({
        name: `Balance_Sheet_as_of_${asOfDate}.pdf`,
        data: balanceSheetPdf,
      });
    }

    // Income Statement
    if (reports.incomeStatement) {
      console.log("Generating Income Statement...");
      const incomeStatementPdf = await generateIncomeStatement(supabase, projectId, ownerId, asOfDate);
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

async function generateBalanceSheet(supabase: any, projectId: string, ownerId: string, asOfDate: string): Promise<Uint8Array> {
  const doc = new jsPDF();
  
  // Fetch account data filtered by owner
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("code");

  // Fetch journal entries filtered by project and date
  const { data: journalLines } = await supabase
    .from("journal_entry_lines")
    .select(`
      *,
      journal_entries!inner(entry_date)
    `)
    .eq("project_id", projectId)
    .lte("journal_entries.entry_date", asOfDate);

  // Calculate balances
  const balances: Record<string, number> = {};
  journalLines?.forEach((line: any) => {
    if (!balances[line.account_id]) {
      balances[line.account_id] = 0;
    }
    balances[line.account_id] += (line.debit || 0) - (line.credit || 0);
  });

  // Generate PDF with styling
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with background
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("Balance Sheet", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(`As of ${asOfDate}`, pageWidth / 2, 28, { align: "center" });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);

  let y = 55;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const amountX = rightMargin - 45;

  // Assets Section
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y - 5, pageWidth - 40, 8, "F");
  doc.text("ASSETS", leftMargin + 2, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  let totalAssets = 0;
  accounts?.filter((a: any) => a.type === "asset").forEach((account: any) => {
    const balance = balances[account.id] || 0;
    if (balance !== 0) {
      totalAssets += balance;
      doc.text(`${account.code} - ${account.name}`, leftMargin + 5, y);
      doc.text(`$${formatCurrency(balance)}`, amountX, y, { align: "right" });
      y += 6;
    }
  });
  
  // Assets total with border
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(amountX - 50, y - 2, amountX + 2, y - 2);
  doc.setFont(undefined, "bold");
  doc.text("Total Assets", leftMargin + 5, y);
  doc.text(`$${formatCurrency(totalAssets)}`, amountX, y, { align: "right" });
  doc.line(amountX - 50, y + 1, amountX + 2, y + 1);
  doc.setFont(undefined, "normal");
  y += 15;

  // Liabilities Section
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y - 5, pageWidth - 40, 8, "F");
  doc.text("LIABILITIES", leftMargin + 2, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  let totalLiabilities = 0;
  accounts?.filter((a: any) => a.type === "liability").forEach((account: any) => {
    const balance = Math.abs(balances[account.id] || 0);
    if (balance !== 0) {
      totalLiabilities += balance;
      doc.text(`${account.code} - ${account.name}`, leftMargin + 5, y);
      doc.text(`$${formatCurrency(balance)}`, amountX, y, { align: "right" });
      y += 6;
    }
  });
  
  // Liabilities total with border
  y += 2;
  doc.line(amountX - 50, y - 2, amountX + 2, y - 2);
  doc.setFont(undefined, "bold");
  doc.text("Total Liabilities", leftMargin + 5, y);
  doc.text(`$${formatCurrency(totalLiabilities)}`, amountX, y, { align: "right" });
  doc.line(amountX - 50, y + 1, amountX + 2, y + 1);
  doc.setFont(undefined, "normal");
  y += 15;

  // Equity Section
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y - 5, pageWidth - 40, 8, "F");
  doc.text("EQUITY", leftMargin + 2, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  let totalEquity = 0;
  accounts?.filter((a: any) => a.type === "equity").forEach((account: any) => {
    const balance = Math.abs(balances[account.id] || 0);
    if (balance !== 0) {
      totalEquity += balance;
      doc.text(`${account.code} - ${account.name}`, leftMargin + 5, y);
      doc.text(`$${formatCurrency(balance)}`, amountX, y, { align: "right" });
      y += 6;
    }
  });
  
  // Equity total with border
  y += 2;
  doc.line(amountX - 50, y - 2, amountX + 2, y - 2);
  doc.setFont(undefined, "bold");
  doc.text("Total Equity", leftMargin + 5, y);
  doc.text(`$${formatCurrency(totalEquity)}`, amountX, y, { align: "right" });
  doc.line(amountX - 50, y + 1, amountX + 2, y + 1);

  return new Uint8Array(doc.output("arraybuffer"));
}

async function generateIncomeStatement(supabase: any, projectId: string, ownerId: string, asOfDate: string): Promise<Uint8Array> {
  const doc = new jsPDF();
  
  // Fetch account data filtered by owner
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("owner_id", ownerId)
    .order("code");

  // Fetch journal entries filtered by project and date
  const { data: journalLines } = await supabase
    .from("journal_entry_lines")
    .select(`
      *,
      journal_entries!inner(entry_date)
    `)
    .eq("project_id", projectId)
    .lte("journal_entries.entry_date", asOfDate);

  // Calculate balances
  const balances: Record<string, number> = {};
  journalLines?.forEach((line: any) => {
    if (!balances[line.account_id]) {
      balances[line.account_id] = 0;
    }
    balances[line.account_id] += (line.debit || 0) - (line.credit || 0);
  });

  // Generate PDF with styling
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with background
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("Income Statement", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(`As of ${asOfDate}`, pageWidth / 2, 28, { align: "center" });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);

  let y = 55;
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  const amountX = rightMargin - 45;

  // Revenue Section
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y - 5, pageWidth - 40, 8, "F");
  doc.text("REVENUE", leftMargin + 2, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  let totalRevenue = 0;
  accounts?.filter((a: any) => a.type === "revenue").forEach((account: any) => {
    const balance = Math.abs(balances[account.id] || 0);
    if (balance !== 0) {
      totalRevenue += balance;
      doc.text(`${account.code} - ${account.name}`, leftMargin + 5, y);
      doc.text(`$${formatCurrency(balance)}`, amountX, y, { align: "right" });
      y += 6;
    }
  });

  // Revenue total with border
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(amountX - 50, y - 2, amountX + 2, y - 2);
  doc.setFont(undefined, "bold");
  doc.text("Total Revenue", leftMargin + 5, y);
  doc.text(`$${formatCurrency(totalRevenue)}`, amountX, y, { align: "right" });
  doc.line(amountX - 50, y + 1, amountX + 2, y + 1);
  doc.setFont(undefined, "normal");
  y += 15;

  // Expenses Section
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y - 5, pageWidth - 40, 8, "F");
  doc.text("EXPENSES", leftMargin + 2, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  let totalExpenses = 0;
  accounts?.filter((a: any) => a.type === "expense").forEach((account: any) => {
    const balance = balances[account.id] || 0;
    if (balance !== 0) {
      totalExpenses += balance;
      doc.text(`${account.code} - ${account.name}`, leftMargin + 5, y);
      doc.text(`$${formatCurrency(balance)}`, amountX, y, { align: "right" });
      y += 6;
    }
  });

  // Expenses total with border
  y += 2;
  doc.line(amountX - 50, y - 2, amountX + 2, y - 2);
  doc.setFont(undefined, "bold");
  doc.text("Total Expenses", leftMargin + 5, y);
  doc.text(`$${formatCurrency(totalExpenses)}`, amountX, y, { align: "right" });
  doc.line(amountX - 50, y + 1, amountX + 2, y + 1);
  doc.setFont(undefined, "normal");
  y += 15;

  // Net Income Section
  const netIncome = totalRevenue - totalExpenses;
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y - 5, pageWidth - 40, 10, "F");
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("NET INCOME", leftMargin + 2, y);
  doc.text(`$${formatCurrency(netIncome)}`, amountX, y, { align: "right" });

  return new Uint8Array(doc.output("arraybuffer"));
}

async function generateJobCostsReport(supabase: any, projectId: string, asOfDate: string): Promise<Uint8Array> {
  const doc = new jsPDF();
  
  // Fetch journal entry lines for this project grouped by cost code
  const { data: journalLines } = await supabase
    .from("journal_entry_lines")
    .select(`
      cost_code_id,
      debit,
      credit,
      cost_codes(code, name),
      journal_entries!inner(entry_date)
    `)
    .eq("project_id", projectId)
    .not("cost_code_id", "is", null)
    .lte("journal_entries.entry_date", asOfDate);

  // Fetch budget data for this project
  const { data: budgetItems } = await supabase
    .from("budget_items")
    .select("cost_code_id, total")
    .eq("project_id", projectId);

  // Create budget lookup
  const budgetLookup: Record<string, number> = {};
  budgetItems?.forEach((item: any) => {
    if (item.cost_code_id) {
      budgetLookup[item.cost_code_id] = item.total || 0;
    }
  });

  // Group by cost code and calculate totals
  const costCodeTotals: Record<string, { code: string; name: string; actualAmount: number; budgetAmount: number }> = {};
  
  journalLines?.forEach((line: any) => {
    const costCodeId = line.cost_code_id;
    if (!costCodeTotals[costCodeId]) {
      costCodeTotals[costCodeId] = {
        code: line.cost_codes?.code || "N/A",
        name: line.cost_codes?.name || "Unknown",
        actualAmount: 0,
        budgetAmount: budgetLookup[costCodeId] || 0,
      };
    }
    costCodeTotals[costCodeId].actualAmount += (line.debit || 0) - (line.credit || 0);
  });

  // Convert to array and sort by code
  const costCodeArray = Object.values(costCodeTotals).sort((a, b) => a.code.localeCompare(b.code));

  // Generate PDF with styling
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with background
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("Job Costs Report", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(`As of ${asOfDate}`, pageWidth / 2, 28, { align: "center" });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);

  let y = 55;
  const leftMargin = 15;
  
  // Table header
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y - 5, pageWidth - 30, 8, "F");
  doc.text("Cost Code", leftMargin + 2, y);
  doc.text("Budget", 115, y, { align: "right" });
  doc.text("Actual", 150, y, { align: "right" });
  doc.text("Variance", 185, y, { align: "right" });
  doc.setFont(undefined, "normal");
  y += 8;

  // Draw header bottom border
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, pageWidth - 15, y);
  y += 5;

  // Data rows
  let grandTotalBudget = 0;
  let grandTotalActual = 0;
  costCodeArray.forEach((costCode) => {
    const actualAmount = costCode.actualAmount;
    const budgetAmount = costCode.budgetAmount;
    const variance = budgetAmount - actualAmount;
    
    grandTotalBudget += budgetAmount;
    grandTotalActual += actualAmount;

    doc.setFontSize(8);
    doc.text(`${costCode.code} - ${costCode.name}`, leftMargin + 2, y);
    doc.text(`$${formatCurrency(budgetAmount)}`, 115, y, { align: "right" });
    doc.text(`$${formatCurrency(actualAmount)}`, 150, y, { align: "right" });
    
    // Color variance based on positive/negative
    if (variance < 0) {
      doc.setTextColor(220, 38, 38); // Red for over budget
    }
    doc.text(`$${formatCurrency(variance)}`, 185, y, { align: "right" });
    doc.setTextColor(0, 0, 0); // Reset color
    
    y += 6;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  // Total row with border
  y += 3;
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, pageWidth - 15, y);
  y += 5;
  
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  const grandVariance = grandTotalBudget - grandTotalActual;
  doc.text("TOTAL", leftMargin + 2, y);
  doc.text(`$${formatCurrency(grandTotalBudget)}`, 115, y, { align: "right" });
  doc.text(`$${formatCurrency(grandTotalActual)}`, 150, y, { align: "right" });
  
  if (grandVariance < 0) {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(`$${formatCurrency(grandVariance)}`, 185, y, { align: "right" });
  
  // Double line under total
  y += 2;
  doc.line(leftMargin, y, pageWidth - 15, y);

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Accounting Reports - ${projectName}</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Accounting Reports</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectName}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            
                            <!-- Report Details Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                <tr>
                                    <td style="padding: 25px; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 12px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        <strong>Project:</strong> ${projectName}
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 16px 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        <strong>As of Date:</strong> ${asOfDate}
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="margin: 0; padding: 0 0 8px 0;">
                                                    <p style="color: #000000; font-size: 14px; font-weight: 600; line-height: 1.6; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        Reports Included:
                                                    </p>
                                                </td>
                                            </tr>
                                            ${selectedReports.map(report => `
                                            <tr>
                                                <td style="margin: 0; padding: 4px 0 4px 20px;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        ✓ ${report}
                                                    </p>
                                                </td>
                                            </tr>
                                            `).join('')}
                                            <tr>
                                                <td style="margin: 0; padding: 16px 0 0 0;">
                                                    <p style="color: #000000; font-size: 14px; line-height: 1.6; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                        Please find ${fileCount} file${fileCount > 1 ? 's' : ''} attached to this email.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #f8f8f8; margin: 0;">
                            <p style="color: #666666; font-size: 14px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                <a href="https://www.buildersuiteai.com" style="color: #666666; text-decoration: underline;" target="_blank">www.buildersuiteai.com</a>
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>`;
}

serve(handler);

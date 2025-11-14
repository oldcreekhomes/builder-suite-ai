import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@4.0.0";
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
  generatedPdfs?: {
    balanceSheet?: string;
    incomeStatement?: string;
    jobCosts?: string;
  };
  customMessage?: string;
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
      generatedPdfs,
      customMessage,
    }: ReportRequest = await req.json();

    console.log("Sending reports for project:", projectId);
    console.log("Selected reports:", reports);
    console.log("As of date:", asOfDate);

    // Format date from YYYY-MM-DD to MM-DD-YYYY
    const formattedDate = asOfDate.split('-').reverse().join('-').replace(/^(\d+)-(\d+)-(\d+)$/, '$2-$1-$3');

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("address, owner_id")
      .eq("id", projectId)
      .single();

    const projectName = project?.address || "Project";
    const ownerId = project?.owner_id;

    // Use pre-generated PDFs from frontend
    const pdfFiles: Array<{ name: string; data: Uint8Array }> = [];

    // Balance Sheet
    if (reports.balanceSheet && generatedPdfs?.balanceSheet) {
      console.log("Using pre-generated Balance Sheet PDF...");
      const balanceSheetPdf = Uint8Array.from(atob(generatedPdfs.balanceSheet), c => c.charCodeAt(0));
      pdfFiles.push({
        name: `Balance_Sheet_as_of_${asOfDate}.pdf`,
        data: balanceSheetPdf,
      });
    }

    // Income Statement
    if (reports.incomeStatement && generatedPdfs?.incomeStatement) {
      console.log("Using pre-generated Income Statement PDF...");
      const incomeStatementPdf = Uint8Array.from(atob(generatedPdfs.incomeStatement), c => c.charCodeAt(0));
      pdfFiles.push({
        name: `Income_Statement_as_of_${asOfDate}.pdf`,
        data: incomeStatementPdf,
      });
    }

    // Job Costs
    if (reports.jobCosts && generatedPdfs?.jobCosts) {
      console.log("Using pre-generated Job Costs PDF...");
      const jobCostsPdf = Uint8Array.from(atob(generatedPdfs.jobCosts), c => c.charCodeAt(0));
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
      subject: `Accounting Reports - ${projectName} (As of ${formattedDate})`,
      html: generateEmailTemplate(projectName, formattedDate, reports, pdfFiles.length, customMessage),
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

function generateEmailTemplate(projectName: string, asOfDate: string, reports: any, fileCount: number, customMessage?: string): string {
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
                    
                    <!-- Custom Message Section (only shown if message exists) -->
                    ${customMessage ? `
                    <tr>
                        <td style="padding: 30px 30px 0 30px; margin: 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #f8f9ff; border: 1px solid #e0e7ff; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 20px; margin: 0;">
                                        <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${customMessage}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}
                    
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

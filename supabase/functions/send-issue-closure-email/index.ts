import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

console.log("📨 send-issue-closure-email starting...");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log("🔑 RESEND_API_KEY present:", !!resendApiKey);
if (!resendApiKey) {
  console.error("❌ RESEND_API_KEY is not set for send-issue-closure-email");
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  email: string;
  firstName: string;
}

interface CcRecipient {
  email: string;
  name: string;
}

interface IssueClosureEmailRequest {
  recipients?: Recipient[];
  authorEmail?: string;
  authorName?: string;
  issueTitle: string;
  issueDescription?: string;
  issueCategory: string;
  companyName: string;
  solutionFiles?: string[];
  solutionMessage?: string;
  ccEmails?: CcRecipient[];
}

// Map a file extension to a colored badge config
function getFileBadge(filePath: string): { label: string; color: string } {
  const name = filePath.split('/').pop() || filePath;
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map: Record<string, { label: string; color: string }> = {
    pdf:  { label: 'PDF',  color: '#dc2626' },
    doc:  { label: 'DOC',  color: '#2563eb' },
    docx: { label: 'DOCX', color: '#2563eb' },
    xls:  { label: 'XLS',  color: '#16a34a' },
    xlsx: { label: 'XLSX', color: '#16a34a' },
    csv:  { label: 'CSV',  color: '#16a34a' },
    ppt:  { label: 'PPT',  color: '#ea580c' },
    pptx: { label: 'PPTX', color: '#ea580c' },
    png:  { label: 'PNG',  color: '#7c3aed' },
    jpg:  { label: 'JPG',  color: '#7c3aed' },
    jpeg: { label: 'JPG',  color: '#7c3aed' },
    gif:  { label: 'GIF',  color: '#7c3aed' },
    webp: { label: 'WEBP', color: '#7c3aed' },
  };
  return map[ext] || { label: ext ? ext.toUpperCase().slice(0, 4) : 'FILE', color: '#6b7280' };
}

function buildHtml(opts: {
  firstName: string;
  issueTitle: string;
  issueCategory: string;
  solutionFiles: string[];
  solutionMessage: string;
  closureDate: string;
}) {
  const { firstName, issueTitle, issueCategory, solutionFiles, solutionMessage, closureDate } = opts;

  const solutionFilesHtml = solutionFiles.length > 0
    ? solutionFiles.map((filePath, index) => {
        const simpleFileName = `File${index + 1}`;
        const downloadUrl = `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/issue-files/${filePath}`;
        const badge = getFileBadge(filePath);
        return `<span style="margin-right: 15px; display: inline-block; white-space: nowrap;"><span style="display: inline-block; background-color: ${badge.color}; color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 6px; border-radius: 3px; margin-right: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: middle;">${badge.label}</span><a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: middle;">${simpleFileName}</a></span>`;
      }).join('')
    : 'No solution files attached';

  const fileText = solutionFiles.length === 1 ? 'file' : 'files';

  const commentRowHtml = solutionMessage && solutionMessage.trim().length > 0
    ? `<tr>
         <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Solution:</td>
         <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${solutionMessage}</td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Issue Resolved on BuilderSuite ML</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #16a34a; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Issue Resolved</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            <p style="color: #000000; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${firstName},</p>
                            <p style="color: #000000; font-size: 16px; margin: 0 0 30px 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Please see the solution ${fileText} below. If you do not find the answer acceptable, please reopen an issue in BuilderSuite ML. Thank you for your help!</p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Issue Details:
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 20px; margin: 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                        <tr style="background-color: #f5f5f5;">
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Issue:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${issueTitle}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Category:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${issueCategory}</td>
                                                        </tr>
                                                        <tr style="background-color: #f5f5f5;">
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Solution Files:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${solutionFilesHtml}</td>
                                                        </tr>
                                                        ${commentRowHtml}
                                                        <tr${!commentRowHtml ? ' style="background-color: #f5f5f5;"' : ''}>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Date Resolved:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${closureDate}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #000000; font-size: 16px; margin: 30px 0 0 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Best regards,<br>BuilderSuite ML</p>
                            <p style="color: #000000; font-size: 14px; margin: 20px 0 0 0; line-height: 1.4; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;"><a href="https://www.buildersuiteml.com" target="_blank" rel="noopener noreferrer" style="color: #000000; text-decoration: none; font-weight: bold;">WWW.BUILDERSUITEML.COM</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: IssueClosureEmailRequest = await req.json();
    const {
      recipients,
      authorEmail,
      authorName,
      issueTitle,
      issueCategory,
      solutionFiles = [],
      solutionMessage = '',
      ccEmails = [],
    } = body;

    // Build final recipient list, preferring `recipients` if provided. Fall back to legacy author+cc.
    const finalRecipients: Recipient[] = [];
    const seen = new Set<string>();
    const addRecipient = (email?: string, firstName?: string) => {
      if (!email) return;
      const key = email.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      finalRecipients.push({
        email,
        firstName: (firstName || '').trim() || email.split('@')[0],
      });
    };

    if (Array.isArray(recipients) && recipients.length > 0) {
      recipients.forEach(r => addRecipient(r.email, r.firstName));
    } else {
      addRecipient(authorEmail, (authorName || '').split(' ')[0]);
      ccEmails.forEach(c => addRecipient(c.email, (c.name || '').split(' ')[0]));
    }

    if (finalRecipients.length === 0) {
      return new Response(JSON.stringify({ error: 'No recipients provided' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const closureDate = new Date().toLocaleDateString();

    let sent = 0;
    let failed = 0;
    const results: Array<{ email: string; id?: string; error?: string }> = [];

    for (const r of finalRecipients) {
      const html = buildHtml({
        firstName: r.firstName,
        issueTitle,
        issueCategory,
        solutionFiles,
        solutionMessage,
        closureDate,
      });
      try {
        const emailResponse = await resend.emails.send({
          from: "BuilderSuite ML <noreply@transactional.buildersuiteml.com>",
          to: [r.email],
          subject: "Issue Resolved on BuilderSuite ML",
          html,
        });
        console.log(`✅ Sent to ${r.email}:`, emailResponse?.data?.id);
        sent++;
        results.push({ email: r.email, id: emailResponse?.data?.id });
      } catch (err: any) {
        console.error(`❌ Failed to send to ${r.email}:`, err?.message || err);
        failed++;
        results.push({ email: r.email, error: err?.message || String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: sent > 0, sent, failed, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending issue closure email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

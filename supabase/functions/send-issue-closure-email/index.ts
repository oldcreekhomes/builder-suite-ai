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

interface IssueClosureEmailRequest {
  authorEmail: string;
  authorName: string;
  issueTitle: string;
  issueDescription?: string;
  issueCategory: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      authorEmail, 
      authorName, 
      issueTitle, 
      issueDescription, 
      issueCategory, 
      companyName 
    }: IssueClosureEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "BuilderSuite AI <noreply@transactional.buildersuiteai.com>",
      to: [authorEmail],
      subject: `Issue Closed - ${issueTitle} - ${issueCategory}`,
      html: `
        <h1>Issue Closed</h1>
        <p>Dear ${authorName},</p>
        <p>Thank you for reporting an issue to <strong>${companyName}</strong>. We're pleased to inform you that your issue has been resolved and closed.</p>
        
        <h2>Issue Details:</h2>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Title:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${issueTitle}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Category:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${issueCategory}</td>
          </tr>
          ${issueDescription ? `
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Description:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${issueDescription}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Date Closed:</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
        
        <p>We appreciate your contribution in helping us improve BuildCore. Your feedback is valuable and helps us maintain the quality of our platform.</p>
        <p>If you have any questions or need further assistance, please don't hesitate to contact your company administrator.</p>
        
        <p>Best regards,<br>The BuildCore Team</p>
        <p><a href="https://www.buildersuiteai.com" target="_blank" rel="noopener noreferrer" style="color: #666; text-decoration: none;">www.buildersuiteai.com</a></p>
      `,
    });

    console.log("Issue closure email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }), 
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
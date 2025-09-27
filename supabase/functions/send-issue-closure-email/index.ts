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
      subject: "Issue Closed on Builder Suite",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Issue Closed on Builder Suite</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <!-- Wrapper Table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Issue Closed</h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            
                            <p style="color: #000000; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Dear ${authorName.split(' ')[0]},</p>
                            
                            <p style="color: #000000; font-size: 16px; margin: 0 0 30px 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Thank you for helping us make Builder Suite a better tool for everyone.</p>
                            
                            <!-- Issue Information Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <!-- Issue Header -->
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Issue Details:
                                    </td>
                                </tr>
                                <!-- Issue Content -->
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 20px; margin: 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                        <tr style="background-color: #f5f5f5;">
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Title:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${issueTitle}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Category:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${issueCategory}</td>
                                                        </tr>
                                                        <tr style="background-color: #f5f5f5;">
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Files:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">See attached solution files</td>
                                                        </tr>
                                                        ${issueDescription ? `
                                                        <tr style="background-color: #f5f5f5;">
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Description:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${issueDescription}</td>
                                                        </tr>` : ''}
                                                        <tr>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Date Closed:</td>
                                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${new Date().toLocaleDateString()}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #000000; font-size: 16px; margin: 30px 0 0 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Best regards,<br>The Builder Suite Team</p>
                            
                            <p style="color: #666666; font-size: 14px; margin: 20px 0 0 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;"><a href="https://www.buildersuiteai.com" target="_blank" rel="noopener noreferrer" style="color: #666; text-decoration: none;">www.buildersuiteai.com</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
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
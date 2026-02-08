import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MessageRequest {
  marketplaceCompanyId: string;
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  message: string;
  responseMethod: 'email' | 'phone';
}

// Derive email from website domain
function deriveEmailFromWebsite(website: string): string | null {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
    const domain = url.hostname.replace('www.', '');
    return `info@${domain}`;
  } catch {
    return null;
  }
}

// Generate HTML email template
function generateEmailTemplate(
  companyName: string,
  senderName: string,
  senderEmail: string | undefined,
  senderPhone: string | undefined,
  message: string,
  responseMethod: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Builder Suite AI</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Marketplace Lead Notification</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none;">
        <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">You have received a new inquiry!</h2>
        
        <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">From:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${senderName}</td>
            </tr>
            ${senderEmail ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">
                <a href="mailto:${senderEmail}" style="color: #6366f1; text-decoration: none;">${senderEmail}</a>
              </td>
            </tr>
            ` : ''}
            ${senderPhone ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">
                <a href="tel:${senderPhone}" style="color: #6366f1; text-decoration: none;">${senderPhone}</a>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px; vertical-align: top;">Prefers:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500;">
                ${responseMethod === 'email' ? '📧 Email response' : '📱 Phone call or SMS'}
              </td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 20px;">
          <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">Message:</h3>
          <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1;">
            <p style="margin: 0; color: #334155; font-size: 14px; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            This lead was generated through <a href="https://buildersuiteai.com" style="color: #6366f1; text-decoration: none;">Builder Suite AI</a> Marketplace
          </p>
        </div>
      </div>
      
      <div style="background: #1e293b; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} Builder Suite AI. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service not configured");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: MessageRequest = await req.json();
    const { marketplaceCompanyId, senderName, senderEmail, senderPhone, message, responseMethod } = body;

    console.log("Processing message request for company:", marketplaceCompanyId);

    // Validate required fields
    if (!marketplaceCompanyId || !senderName || !message || !responseMethod) {
      throw new Error("Missing required fields");
    }

    if (responseMethod === 'email' && !senderEmail) {
      throw new Error("Email is required when email response is selected");
    }

    if (responseMethod === 'phone' && !senderPhone) {
      throw new Error("Phone is required when phone response is selected");
    }

    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from('marketplace_companies')
      .select('id, company_name, website')
      .eq('id', marketplaceCompanyId)
      .single();

    if (companyError || !company) {
      console.error("Company lookup error:", companyError);
      throw new Error("Company not found");
    }

    console.log("Found company:", company.company_name);

    // Try to find representative email first
    const { data: representatives } = await supabase
      .from('marketplace_company_representatives')
      .select('email')
      .eq('marketplace_company_id', marketplaceCompanyId)
      .not('email', 'is', null)
      .limit(1);

    let recipientEmail: string | null = null;

    // Tier 1: Use representative email
    if (representatives && representatives.length > 0 && representatives[0].email) {
      recipientEmail = representatives[0].email;
      console.log("Using representative email:", recipientEmail);
    }
    // Tier 2: Derive from website
    else if (company.website) {
      recipientEmail = deriveEmailFromWebsite(company.website);
      console.log("Derived email from website:", recipientEmail);
    }

    if (!recipientEmail) {
      throw new Error("No contact email available for this company. Unable to send message.");
    }

    // Send email via Resend
    console.log("Sending email to:", recipientEmail);
    
    const emailHtml = generateEmailTemplate(
      company.company_name,
      senderName,
      senderEmail,
      senderPhone,
      message,
      responseMethod
    );

    const { error: emailError } = await resend.emails.send({
      from: "Builder Suite AI <marketplace@transactional.buildersuiteai.com>",
      to: [recipientEmail],
      subject: `New inquiry from ${senderName} via Builder Suite`,
      html: emailHtml,
      replyTo: senderEmail || undefined,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error("Failed to send email");
    }

    console.log("Email sent successfully");

    // Record message in database
    const { error: insertError } = await supabase
      .from('marketplace_messages')
      .insert({
        marketplace_company_id: marketplaceCompanyId,
        sender_name: senderName,
        sender_email: senderEmail,
        sender_phone: senderPhone,
        message,
        response_method: responseMethod,
        recipient_email: recipientEmail,
      });

    if (insertError) {
      console.error("Failed to record message:", insertError);
      // Don't throw - email was sent successfully
    }

    // Increment message count on company
    const { error: updateError } = await supabase
      .from('marketplace_companies')
      .update({ 
        message_count: (company as any).message_count ? (company as any).message_count + 1 : 1 
      })
      .eq('id', marketplaceCompanyId);

    if (updateError) {
      console.error("Failed to update message count:", updateError);
      // Don't throw - email was sent successfully
    }

    // Use RPC to increment atomically
    await supabase.rpc('increment_marketplace_message_count', { 
      company_id: marketplaceCompanyId 
    }).catch(() => {
      // Fallback already handled above
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        recipientEmail: recipientEmail.replace(/^(.{2}).*(@.*)$/, '$1***$2') // Mask email for privacy
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-marketplace-message:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send message" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});


import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  employeeEmail: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeEmail, companyName }: ApprovalEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "BuildCore <onboarding@resend.dev>",
      to: [employeeEmail],
      subject: "Access Approved - Welcome to BuildCore!",
      html: `
        <h1>Welcome to BuildCore!</h1>
        <p>Great news! Your access to <strong>${companyName}</strong> has been approved.</p>
        <p>You can now log into your BuildCore account and start using the platform.</p>
        <p>
          <a href="${Deno.env.get("SITE_URL") || "https://preview--corebuild-project-hub.lovable.app"}" 
             style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Log In Now
          </a>
        </p>
        <p>If you have any questions, please contact your company administrator.</p>
        <p>Best regards,<br>The BuildCore Team</p>
        <p><a href="https://www.buildersuiteai.com" target="_blank" rel="noopener noreferrer" style="color: #666; text-decoration: none;">www.buildersuiteai.com</a></p>
      `,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending approval email:", error);
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

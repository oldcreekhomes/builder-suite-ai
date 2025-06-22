
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  invitationToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, companyName, invitationToken }: InvitationEmailRequest = await req.json();

    const confirmationUrl = `${Deno.env.get("SITE_URL") || "https://preview--corebuild-project-hub.lovable.app"}/confirm-invitation?token=${invitationToken}`;

    const emailResponse = await resend.emails.send({
      from: "BuildCore <onboarding@resend.dev>",
      to: [email],
      subject: `Welcome to ${companyName} - Complete Your BuildCore Setup`,
      html: `
        <h1>Welcome to ${companyName}!</h1>
        <p>Hi ${firstName},</p>
        <p>You've been invited to join <strong>${companyName}</strong> on BuildCore, our construction management platform.</p>
        <p>To complete your account setup and start collaborating with your team, please click the button below:</p>
        <p>
          <a href="${confirmationUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Complete Account Setup
          </a>
        </p>
        <p>This invitation will expire in 7 days. If you have any questions, please contact your company administrator.</p>
        <p>Best regards,<br>The BuildCore Team</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          If the button above doesn't work, copy and paste this link into your browser:<br>
          ${confirmationUrl}
        </p>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
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

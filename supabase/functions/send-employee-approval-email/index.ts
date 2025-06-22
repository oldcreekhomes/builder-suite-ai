
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  employeeId: string;
  employeeEmail: string;
  homeBuilderEmail: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeId, employeeEmail, homeBuilderEmail, companyName }: EmailRequest = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Send email to company owner for approval
    const ownerEmailResponse = await resend.emails.send({
      from: "BuildCore <onboarding@resend.dev>",
      to: [homeBuilderEmail],
      subject: "New Employee Approval Request",
      html: `
        <h1>New Employee Approval Request</h1>
        <p>A new employee has requested to join your company: <strong>${companyName}</strong></p>
        <p><strong>Employee Email:</strong> ${employeeEmail}</p>
        <p>Please log into your BuildCore dashboard to approve or deny this request.</p>
        <p>
          <a href="${Deno.env.get("SITE_URL") || "https://preview--corebuild-project-hub.lovable.app"}" 
             style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Review Request
          </a>
        </p>
        <p>Best regards,<br>The BuildCore Team</p>
      `,
    });

    // Send confirmation email to employee
    const employeeEmailResponse = await resend.emails.send({
      from: "BuildCore <onboarding@resend.dev>",
      to: [employeeEmail],
      subject: "Registration Pending Approval",
      html: `
        <h1>Registration Submitted Successfully</h1>
        <p>Thank you for registering with BuildCore!</p>
        <p>Your registration for <strong>${companyName}</strong> is currently pending approval.</p>
        <p>You will receive another email once your company administrator has approved your access.</p>
        <p>If you have any questions, please contact your company administrator.</p>
        <p>Best regards,<br>The BuildCore Team</p>
      `,
    });

    console.log("Emails sent successfully:", { ownerEmailResponse, employeeEmailResponse });

    return new Response(
      JSON.stringify({ 
        success: true, 
        ownerEmailId: ownerEmailResponse.data?.id,
        employeeEmailId: employeeEmailResponse.data?.id 
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending approval emails:", error);
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

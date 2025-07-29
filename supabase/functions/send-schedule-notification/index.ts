import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleNotificationRequest {
  recipientEmail: string;
  recipientName: string;
  projectName: string;
  projectAddress: string;
  projectManagerName: string;
  projectManagerPhone: string;
  projectManagerEmail: string;
  senderCompanyName: string;
  tasks: Array<{
    id: string;
    task_name: string;
    start_date: string;
    end_date: string;
    resources: string;
  }>;
  timeframe: string;
  customMessage?: string;
  companyId: string;
  representativeId: string;
}

// Format date for display (without year to save space)
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

const generateEmailHTML = (data: ScheduleNotificationRequest): string => {
  const { recipientName, projectName, projectAddress, projectManagerName, projectManagerPhone, projectManagerEmail, tasks, timeframe, customMessage, companyId, representativeId } = data;
  
  const tasksList = tasks.map(task => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e5e5; font-size: 13px; color: #000000; white-space: nowrap; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">${task.task_name}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e5e5; font-size: 13px; color: #333333; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">${formatDate(task.start_date)}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e5e5; font-size: 13px; color: #333333; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">${formatDate(task.end_date)}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e5e5e5; text-align: center; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-table; border-collapse: separate; margin: 0;">
          <tr>
            <td style="margin: 0; padding: 0 2px 0 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: separate; border-radius: 3px; background-color: #22c55e;">
                <tr>
                  <td style="margin: 0; padding: 6px 12px;">
                    <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-schedule-response?task_id=${task.id}&company_id=${companyId}&representative_id=${representativeId}&response=confirm" style="color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: block;">Confirm</a>
                  </td>
                </tr>
              </table>
            </td>
            <td style="margin: 0; padding: 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: separate; border-radius: 3px; background-color: #ef4444;">
                <tr>
                  <td style="margin: 0; padding: 6px 12px;">
                    <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-schedule-response?task_id=${task.id}&company_id=${companyId}&representative_id=${representativeId}&response=deny" style="color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: block;">Deny</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Schedule Notification</title>
        <!--[if mso]>
        <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        </noscript>
        <![endif]-->
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
                                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Schedule Updates</h1>
                                <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress}</p>
                            </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                            <td style="padding: 30px; margin: 0;">
                                
                                <!-- Greeting Section -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                    <tr>
                                        <td style="background-color: #f8f8f8; padding: 25px; border: 4px solid #000000; margin: 0;">
                                            <h2 style="color: #000000; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Hello ${recipientName},</h2>
                                            <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">You have tasks scheduled to start in the next ${timeframe}. Please review the details below and prepare accordingly.</p>
                                            ${customMessage ? `
                                                <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
                                                    <p style="margin: 0; color: #0c4a6e; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">"${customMessage}"</p>
                                                </div>
                                            ` : ''}
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Task Section -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                    <!-- Task Header -->
                                    <tr>
                                        <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                            Your Scheduled Tasks
                                        </td>
                                    </tr>
                                    <!-- Task Table -->
                                    <tr>
                                        <td style="padding: 0; margin: 0;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                                <!-- Table Header -->
                                                <thead>
                                                    <tr style="background-color: #f8f8f8;">
                                                        <td style="padding: 10px 8px; text-align: left; font-weight: 600; color: #000000; font-size: 13px; border-bottom: 1px solid #e5e5e5; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">Task Name</td>
                                                        <td style="padding: 10px 8px; text-align: left; font-weight: 600; color: #000000; font-size: 13px; border-bottom: 1px solid #e5e5e5; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">Start Date</td>
                                                        <td style="padding: 10px 8px; text-align: left; font-weight: 600; color: #000000; font-size: 13px; border-bottom: 1px solid #e5e5e5; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">End Date</td>
                                                        <td style="padding: 10px 8px; text-align: center; font-weight: 600; color: #000000; font-size: 13px; border-bottom: 1px solid #e5e5e5; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0;">Action</td>
                                                    </tr>
                                                </thead>
                                                <!-- Table Body -->
                                                <tbody>
                                                    ${tasksList}
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Contact Section -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                    <!-- Contact Header -->
                                    <tr>
                                        <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                            Project Manager
                                        </td>
                                    </tr>
                                    <!-- Contact Content -->
                                    <tr>
                                        <td style="padding: 20px; margin: 0;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="margin: 0; padding: 0 0 8px 0;">
                                                        <span style="color: #666666; font-weight: 500; display: inline-block; width: 60px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Name:</span>
                                                        <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectManagerName}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="margin: 0; padding: 0 0 8px 0;">
                                                        <span style="color: #666666; font-weight: 500; display: inline-block; width: 60px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Phone:</span>
                                                        <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectManagerPhone}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="margin: 0; padding: 0;">
                                                        <span style="color: #666666; font-weight: 500; display: inline-block; width: 60px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Email:</span>
                                                        <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectManagerEmail}</span>
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
                            <td style="text-align: center; padding: 25px 30px; border-top: 1px solid #e5e5e5; background-color: #f8f8f8; margin: 0;">
                                <a href="https://www.buildersuiteai.com" target="_blank" rel="noopener noreferrer" style="color: #666666; font-size: 12px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; text-decoration: none;">www.buildersuiteai.com</a>
                            </td>
                        </tr>
                        
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing schedule notification request...");
    
    const requestData: ScheduleNotificationRequest = await req.json();
    
    console.log("Sending notification to:", requestData.recipientEmail);
    console.log("Tasks count:", requestData.tasks.length);

    const emailHTML = generateEmailHTML(requestData);

    const emailResponse = await resend.emails.send({
      from: `${requestData.senderCompanyName} <noreply@transactional.buildersuiteai.com>`,
      to: [requestData.recipientEmail],
      subject: `Schedule Updates - ${requestData.projectAddress}`,
      html: emailHTML,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      recipient: requestData.recipientEmail 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-schedule-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
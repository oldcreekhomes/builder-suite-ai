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
  tasks: Array<{
    task_name: string;
    start_date: string;
    end_date: string;
    resources: string;
  }>;
  timeframe: string;
  customMessage?: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const generateEmailHTML = (data: ScheduleNotificationRequest): string => {
  const { recipientName, projectName, tasks, timeframe, customMessage } = data;
  
  const tasksList = tasks.map(task => `
    <tr style="border-bottom: 1px solid #e5e5e5;">
      <td style="padding: 12px; font-weight: 600; color: #374151;">${task.task_name}</td>
      <td style="padding: 12px; color: #6b7280;">${formatDate(task.start_date)}</td>
      <td style="padding: 12px; color: #6b7280;">${formatDate(task.end_date)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Schedule Notification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Upcoming Tasks</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Project: ${projectName}</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 22px;">Hello ${recipientName},</h2>
          <p style="color: #6b7280; margin: 0; font-size: 16px;">
            You have tasks scheduled to start in the next ${timeframe}. Please review the details below and prepare accordingly.
          </p>
          ${customMessage ? `
            <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
              <p style="margin: 0; color: #0c4a6e; font-style: italic;">"${customMessage}"</p>
            </div>
          ` : ''}
        </div>

        <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 30px;">
          <div style="background: #f3f4f6; padding: 15px; border-bottom: 1px solid #e5e5e5;">
            <h3 style="margin: 0; color: #374151; font-size: 18px;">Your Upcoming Tasks</h3>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e5e5;">Task Name</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e5e5;">Start Date</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e5e5;">End Date</th>
              </tr>
            </thead>
            <tbody>
              ${tasksList}
            </tbody>
          </table>
        </div>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">📅 Important Reminders</h4>
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            <li>Review all task requirements and materials needed</li>
            <li>Coordinate with team members and subcontractors</li>
            <li>Ensure all permits and approvals are in place</li>
            <li>Check weather conditions for outdoor tasks</li>
          </ul>
        </div>

        <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e5e5; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">This is an automated notification from your project management system.</p>
          <p style="margin: 5px 0 0 0;">If you have questions, please contact your project manager.</p>
        </div>
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
      from: "BuilderSuite AI <notifications@buildersuiteai.com>",
      to: [requestData.recipientEmail],
      subject: `Upcoming Tasks - ${requestData.projectName}`,
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
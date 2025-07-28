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
      <td class="task-name">${task.task_name}</td>
      <td>${formatDate(task.start_date)}</td>
      <td>${formatDate(task.end_date)}</td>
      <td class="center">
        <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-schedule-response?task_id=${task.id}&company_id=${companyId}&representative_id=${representativeId}&response=confirm" class="btn btn-confirm">Confirm</a>
        <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-schedule-response?task_id=${task.id}&company_id=${companyId}&representative_id=${representativeId}&response=deny" class="btn btn-deny">Deny</a>
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
        <style type="text/css">
            /* Reset styles */
            body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            table, td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            img {
                -ms-interpolation-mode: bicubic;
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
            
            /* Base styles */
            body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #f5f5f5;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
            }
            
            .header {
                background-color: #000000;
                padding: 40px 30px;
                text-align: center;
            }
            
            .header h1 {
                color: #ffffff;
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 10px 0;
                line-height: 1.2;
            }
            
            .header p {
                color: #cccccc;
                font-size: 16px;
                margin: 0;
                line-height: 1.4;
            }
            
            .content {
                padding: 30px;
            }
            
            .greeting {
                background-color: #f8f8f8;
                padding: 25px;
                margin-bottom: 30px;
                border-left: 4px solid #000000;
            }
            
            .greeting h2 {
                color: #000000;
                font-size: 20px;
                font-weight: 600;
                margin: 0 0 15px 0;
                line-height: 1.3;
            }
            
            .greeting p {
                color: #666666;
                font-size: 16px;
                margin: 0;
                line-height: 1.5;
            }
            
            .custom-message {
                margin-top: 20px;
                padding: 15px;
                background: #e0f2fe;
                border-left: 4px solid #0284c7;
                border-radius: 4px;
            }
            
            .custom-message p {
                margin: 0;
                color: #0c4a6e;
                font-style: italic;
            }
            
            .task-section {
                margin-bottom: 30px;
            }
            
            .task-header {
                background-color: #000000;
                color: #ffffff;
                padding: 15px 20px;
                font-size: 16px;
                font-weight: 600;
                margin: 0;
            }
            
            .task-table {
                width: 100%;
                border-collapse: collapse;
                background-color: #ffffff;
                border: 1px solid #e5e5e5;
            }
            
            .task-table th {
                background-color: #f8f8f8;
                padding: 10px 8px;
                text-align: left;
                font-weight: 600;
                color: #000000;
                font-size: 13px;
                border-bottom: 1px solid #e5e5e5;
                white-space: nowrap;
            }
            
            .task-table th.center {
                text-align: center;
            }
            
            .task-table td {
                padding: 10px 8px;
                border-bottom: 1px solid #e5e5e5;
                font-size: 13px;
                color: #333333;
                white-space: nowrap;
            }
            
            .task-table td.center {
                text-align: center;
            }
            
            .task-name {
                font-weight: 600;
                color: #000000;
            }
            
            .btn {
                display: inline-block;
                padding: 6px 12px;
                text-decoration: none;
                font-size: 11px;
                font-weight: 600;
                border-radius: 3px;
                margin: 0 3px 0 0;
                text-align: center;
                min-width: 50px;
            }
            
            .btn-confirm {
                background-color: #22c55e;
                color: #ffffff;
            }
            
            .btn-deny {
                background-color: #ef4444;
                color: #ffffff;
            }
            
            .contact-section {
                background-color: #ffffff;
                border: 1px solid #e5e5e5;
                padding: 0;
                margin-bottom: 30px;
            }
            
            .contact-header {
                background-color: #000000;
                color: #ffffff;
                padding: 15px 20px;
                font-size: 16px;
                font-weight: 600;
                margin: 0;
            }
            
            .contact-content {
                padding: 20px;
            }
            
            .contact-card {
                display: table;
                width: 100%;
            }
            
            .contact-info {
                color: #333333;
                font-size: 14px;
                line-height: 1.6;
            }
            
            .contact-row {
                margin-bottom: 8px;
            }
            
            .contact-label {
                color: #666666;
                font-weight: 500;
                display: inline-block;
                width: 60px;
            }
            
            .contact-value {
                color: #000000;
                font-weight: 600;
            }
            
            .footer {
                text-align: center;
                padding: 25px 30px;
                border-top: 1px solid #e5e5e5;
                background-color: #f8f8f8;
            }
            
            .footer p {
                color: #666666;
                font-size: 12px;
                margin: 0 0 5px 0;
                line-height: 1.4;
            }
            
            /* Mobile responsive */
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                }
                
                .header, .content {
                    padding: 20px !important;
                }
                
                .header h1 {
                    font-size: 24px !important;
                }
                
                .greeting {
                    padding: 20px !important;
                }
                
                .contact-content {
                    padding: 20px !important;
                }
                
                .task-table th, .task-table td {
                    padding: 8px 6px !important;
                    font-size: 11px !important;
                }
                
                .btn {
                    padding: 5px 10px !important;
                    font-size: 10px !important;
                    margin: 0 2px 0 0 !important;
                }
            }
        </style>
    </head>
    
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <h1>Schedule Updates</h1>
                <p>${projectAddress}</p>
            </div>
            
            <!-- Main Content -->
            <div class="content">
                <!-- Greeting -->
                <div class="greeting">
                    <h2>Hello ${recipientName},</h2>
                    <p>You have tasks scheduled to start in the next ${timeframe}. Please review the details below and prepare accordingly.</p>
                    ${customMessage ? `
                        <div class="custom-message">
                            <p>"${customMessage}"</p>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Task Section -->
                <div class="task-section">
                    <h3 class="task-header">Your Scheduled Tasks</h3>
                    <table class="task-table">
                        <thead>
                            <tr>
                                <th>Task Name</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th class="center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tasksList}
                        </tbody>
                    </table>
                </div>
                
                <!-- Contact Section -->
                <div class="contact-section">
                    <h3 class="contact-header">Project Manager</h3>
                    <div class="contact-content">
                        <div class="contact-card">
                            <div class="contact-info">
                                <div class="contact-row">
                                    <span class="contact-label">Name:</span>
                                    <span class="contact-value">${projectManagerName}</span>
                                </div>
                                <div class="contact-row">
                                    <span class="contact-label">Phone:</span>
                                    <span class="contact-value">${projectManagerPhone}</span>
                                </div>
                                <div class="contact-row">
                                    <span class="contact-label">Email:</span>
                                    <span class="contact-value">${projectManagerEmail}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>This is an automated notification from your project management system.</p>
                <p>If you have questions, please contact your project manager above.</p>
            </div>
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
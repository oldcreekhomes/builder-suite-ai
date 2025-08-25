import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('🔧 PO Email Edge function starting...');
const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log('🔑 RESEND_API_KEY available:', !!resendApiKey);

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY is not set');
}

const resend = new Resend(resendApiKey);

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface POEmailRequest {
  purchaseOrderId?: string;
  companyId?: string;
  biddingCompanyId?: string; // Keep for backward compatibility
  projectAddress: string;
  companyName: string;
  proposals?: string[];
  senderCompanyName?: string;
  customMessage?: string;
  totalAmount?: number;
  costCode?: any;
  testEmail?: string;
  files?: any[];
}

const generatePOEmailHTML = (data: any, purchaseOrderId?: string, companyId?: string) => {
  const projectAddress = data.projectAddress || 'Project Address Not Available';
  const companyName = data.companyName || 'Company Name Not Available';
  const proposals = data.proposals || [];
  const senderCompanyName = data.senderCompanyName || 'Builder Suite AI';
  const managerName = data.projectManager?.name || 'Project Manager';
  const managerEmail = data.projectManager?.email || '';
  const managerPhone = data.projectManager?.phone || '';
  const costCodeName = data.costCode?.name || 'Cost Code';
  const totalAmount = data.totalAmount;
  const files = data.files || [];
  const firstFile = files.length > 0 ? files[0] : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Purchase Order - ${projectAddress}: ${costCodeName}</title>
</head>

<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f5f5f5;">
        <tr>
            <td align="center" valign="top" style="margin: 0; padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 30px; background-color: #000000; margin: 0;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Purchase Order</h1>
                            <p style="color: #cccccc; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress}</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; margin: 0;">
                            
                            <!-- Purchase Order Information -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        You have been awarded this purchase order:
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 20px; margin: 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Project Address:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${projectAddress}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Contact:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: inline-block; vertical-align: top; line-height: 1.4;">${managerName}${managerPhone ? `<br>${managerPhone}` : ''}${managerEmail ? `<br>${managerEmail}` : ''}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Company:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${companyName}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Scope of Work:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${costCodeName}</span>
                                                            </td>
                                                        </tr>
                                                         ${totalAmount ? `
                                                         <tr>
                                                             <td style="margin: 0; padding: 0 0 8px 0;">
                                                                 <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Amount:</span>
                                                                 <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">$${Number(totalAmount).toLocaleString()}</span>
                                                             </td>
                                                         </tr>
                                                         ` : ''}
                                                         ${firstFile ? `
                                                         <tr>
                                                             <td style="margin: 0; padding: 0 0 8px 0;">
                                                                 <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Approved File:</span>
                                                                 <span style="display: inline-block; vertical-align: top;">
                                                                     <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/purchase-orders/${purchaseOrderId}/${firstFile.id || firstFile.name || firstFile}" style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; text-decoration: none; display: inline-block;" target="_blank">
                                                                         ${firstFile.name || firstFile.id || firstFile}
                                                                     </a>
                                                                     <span style="background-color: #10B981; color: #ffffff; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; margin-left: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                                         APPROVED
                                                                     </span>
                                                                 </span>
                                                             </td>
                                                         </tr>
                                                         ` : ''}
                                                        ${proposals.length > 0 ? `
                                                        <tr>
                                                            <td style="margin: 0; padding: 0 0 8px 0;">
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Proposals:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: inline-block; vertical-align: top;">${proposals.join('<br>')}</span>
                                                            </td>
                                                        </tr>
                                                        ` : ''}
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            ${purchaseOrderId && companyId ? `
                            <!-- PO Response Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; margin: 0 0 30px 0; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #000000; color: #ffffff; padding: 15px 20px; font-size: 16px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                        Purchase Order Response
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0; margin: 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e5e5;">
                                            <tr>
                                                <td style="padding: 30px 20px; text-align: center; margin: 0;">
                                                    <h3 style="color: #000000; font-size: 18px; font-weight: 600; margin: 0 0 20px 0; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Please confirm your acceptance of this purchase order:</h3>
                                                    
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding-right: 15px;">
                                                                <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-po-response?purchase_order_id=${purchaseOrderId}&company_id=${companyId}&response=approved" style="background-color: #10B981; border: 2px solid #10B981; color: #ffffff; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1; padding: 12px 24px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;" target="_blank">
                                                                     Confirm PO
                                                                 </a>
                                                             </td>
                                                             <td style="padding-left: 15px;">
                                                                 <a href="https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/handle-po-response?purchase_order_id=${purchaseOrderId}&company_id=${companyId}&response=rejected" style="background-color: #DC2626; border: 2px solid #DC2626; color: #ffffff; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1; padding: 12px 24px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none;" target="_blank">
                                                                     Deny PO
                                                                 </a>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="text-align: center; padding: 25px 30px; border-top: 1px solid #e5e5e5; background-color: #f8f8f8; margin: 0;">
                             <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                 <a href="https://www.buildersuiteai.com" style="color: #000000 !important; text-decoration: none !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">www.buildersuiteai.com</a>
                             </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 Processing PO email request...');
    const { 
      purchaseOrderId, 
      companyId, 
      biddingCompanyId, 
      projectAddress, 
      companyName, 
      proposals, 
      senderCompanyName, 
      customMessage, 
      totalAmount, 
      costCode,
      testEmail 
    }: POEmailRequest = await req.json();

    console.log('📝 Request data:', { 
      purchaseOrderId, 
      companyId, 
      biddingCompanyId, 
      projectAddress, 
      companyName, 
      proposalsCount: proposals?.length || 0, 
      senderCompanyName,
      totalAmount,
      testEmail 
    });

    let notificationRecipients: any[] = [];
    let projectDetails: any = null;
    let costCodeInfo: any = null;

    // Handle test email case
    if (testEmail) {
      notificationRecipients = [{
        first_name: 'Test',
        last_name: 'User',
        email: testEmail
      }];
    } 
    // Handle purchase order case
    else if (purchaseOrderId && companyId) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select(`
          company_name,
          company_representatives!company_representatives_company_id_fkey(
            id,
            first_name,
            last_name,
            email,
            receive_po_notifications
          )
        `)
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('❌ Error fetching company:', companyError);
        throw new Error(`Company not found: ${companyError.message}`);
      }

      if (!company) {
        throw new Error('Company not found');
      }

      // Filter representatives who want PO notifications
      notificationRecipients = company.company_representatives?.filter(
        (rep: any) => rep.receive_po_notifications && rep.email
      ) || [];

      console.log(`👥 Found ${notificationRecipients.length} representatives with PO notifications enabled`);

      if (notificationRecipients.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: "No representatives found with PO notifications enabled",
            success: false,
            emailsSent: 0
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Get project details from purchase order
      const { data: projectData, error: projectError } = await supabase
        .from('project_purchase_orders')
        .select(`
          project_id,
          cost_code_id,
          files,
          projects!inner(
            address,
            manager,
            users!inner(
              first_name,
              last_name,
              email,
              phone_number
            )
          ),
          cost_codes!inner(
            code,
            name
          )
        `)
        .eq('id', purchaseOrderId)
        .single();

      if (!projectError && projectData) {
        projectDetails = projectData.projects;
        costCodeInfo = projectData.cost_codes;
      }
    }
    // Handle backward compatibility with biddingCompanyId
    else if (biddingCompanyId) {
      console.log('🔄 Using backward compatibility with biddingCompanyId');
      // This is the old logic for backward compatibility
      const { data: biddingCompany, error: biddingError } = await supabase
        .from('project_bid_package_companies')
        .select(`
          companies!inner(
            company_name,
            company_representatives!inner(
              first_name,
              last_name,
              email,
              receive_po_notifications
            )
          )
        `)
        .eq('id', biddingCompanyId)
        .single();

      if (biddingError || !biddingCompany) {
        console.error('❌ Error fetching bidding company:', biddingError);
        throw new Error('Bidding company not found');
      }

      notificationRecipients = biddingCompany.companies.company_representatives?.filter(
        (rep: any) => rep.receive_po_notifications && rep.email
      ) || [];
    }

    if (notificationRecipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No recipients found with valid email addresses or PO notifications enabled",
          success: false,
          emailsSent: 0
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get project manager details
    const { data: projectManagerData } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone_number')
      .eq('id', projectDetails?.manager || '')
      .single();

    const projectManager = projectManagerData ? {
      name: `${projectManagerData.first_name || ''} ${projectManagerData.last_name || ''}`.trim(),
      email: projectManagerData.email,
      phone: projectManagerData.phone_number
    } : null;

    // Get project details and files
    let purchaseOrderFiles: any[] = [];
    
    if (purchaseOrderId) {
      const { data: poData } = await supabase
        .from('project_purchase_orders')
        .select('files')
        .eq('id', purchaseOrderId)
        .single();
      
      if (poData?.files && Array.isArray(poData.files)) {
        purchaseOrderFiles = poData.files;
      }
    }

    // Generate email HTML with confirmation buttons for regular emails (not test)
    const emailHTML = generatePOEmailHTML({
      projectAddress,
      companyName: companyName || 'Unknown Company',
      proposals: proposals || [],
      senderCompanyName: senderCompanyName || 'Builder Suite AI',
      projectManager,
      costCode: costCodeInfo,
      totalAmount,
      files: purchaseOrderFiles
    }, testEmail ? undefined : purchaseOrderId, testEmail ? undefined : companyId);

    // Send emails to all recipients
    const emailPromises = notificationRecipients.map(async (rep: any) => {
      console.log(`📤 Sending PO email to: ${rep.email}`);
      
      return await resend.emails.send({
        from: `${senderCompanyName || 'Builder Suite AI'} <noreply@transactional.buildersuiteai.com>`,
        to: [rep.email],
        subject: `Purchase Order - ${projectAddress || 'Project'}: ${costCodeInfo?.name || 'Cost Code'}`,
        html: emailHTML,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Count successful emails
    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
    const failedEmails = emailResults.filter(result => result.status === 'rejected');

    if (failedEmails.length > 0) {
      console.error('❌ Some emails failed to send:', failedEmails);
    }

    console.log(`✅ Successfully sent ${successfulEmails} PO notification emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: successfulEmails,
        totalRecipients: notificationRecipients.length,
        message: `PO notification sent to ${successfulEmails} recipients`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in send-po-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
  poNumber?: string;
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

const generateFileDownloadLinks = (files: any[]) => {
  if (!files || files.length === 0) return 'No files attached';
  
  const fileLinks = files.map((file, index) => {
    // Extract original filename to get the extension
    let originalFileName = file.name || file.id || file;
    
    // Get file extension from original filename
    let fileExtension = '.pdf'; // default
    const extensionMatch = originalFileName.match(/\.([a-zA-Z0-9]+)$/);
    if (extensionMatch) {
      fileExtension = '.' + extensionMatch[1];
    }
    
    // Create simple generic filename
    const displayName = `File ${index + 1}${fileExtension}`;
    
    // Build proper download URL
    let downloadUrl = file.url;
    if (!downloadUrl) {
      // Construct URL for purchase order files
      const fileId = file.id || file.name || file;
      downloadUrl = `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/purchase-orders/${file.projectId || file.projectId}/${fileId}`;
    }
    
    console.log('🔗 Generating PO file link:', { originalFile: file, displayName, downloadUrl });
    
    return `<div style="line-height: 20px; margin: 2px 0; display: flex; align-items: center;">
      <a href="${downloadUrl}" style="color: #000000; text-decoration: none; display: inline-block;" target="_blank">
        ${displayName}
      </a>
    </div>`;
  }).join('');
  
  // Return vertical list container
  return `<div style="display: inline-block; vertical-align: top;">${fileLinks}</div>`;
};

const generatePOEmailHTML = (data: any, purchaseOrderId?: string, companyId?: string) => {
  const projectAddress = data.projectAddress || 'Project Address Not Available';
  const companyName = data.companyName || 'Company Name Not Available';
  const proposals = data.proposals || [];
  const senderCompanyName = data.senderCompanyName || 'Builder Suite AI';
  const managerName = data.projectManager?.name || 'Project Manager';
  const managerEmail = data.projectManager?.email || '';
  const managerPhone = data.projectManager?.phone || '';
  // Format cost code as "code: name" if both are available
  const costCodeName = data.costCode?.code && data.costCode?.name 
    ? `${data.costCode.code}: ${data.costCode.name}` 
    : data.costCode?.name || 'Cost Code';
  const totalAmount = data.totalAmount;
  const files = data.files || [];
  const fileLinks = generateFileDownloadLinks(files);
  const customMessage = data.customMessage;
  const contractFiles = data.contractFiles || [];

  // Helper function to extract simple filename from technical filename
  const getSimpleFilename = (filename: string) => {
    if (!filename) return 'file.pdf';
    
    // Extract the extension
    const parts = filename.split('.');
    const extension = parts.length > 1 ? parts[parts.length - 1] : 'pdf';
    
    // Check if filename contains typical generated patterns (UUIDs, timestamps, etc.)
    const hasGeneratedPattern = /^[a-f0-9\-]+_[a-f0-9\-]+_\d+_[a-z0-9]+\./i.test(filename) || 
                              /\d{13,}_[a-z0-9]+\./i.test(filename);
    
    if (hasGeneratedPattern) {
      // Return generic filename based on context
      return `bid.${extension}`;
    }
    
    // If it's already a simple filename, return as is
    return filename;
  };

  const poNumberDisplay = data.poNumber || 'Purchase Order';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${poNumberDisplay} - ${projectAddress}</title>
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
                                                                <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">PO Number:</span>
                                                                <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${poNumberDisplay}</span>
                                                            </td>
                                                        </tr>
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
                                                                 <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Cost Code:</span>
                                                                 <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${costCodeName}</span>
                                                             </td>
                                                         </tr>
                                                         ${contractFiles.length > 0 ? `
                                                         <tr>
                                                             <td style="margin: 0; padding: 0 0 8px 0;">
                                                                 <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Contract:</span>
                                                                 <span style="display: inline-block; vertical-align: top;">
                                                                     ${contractFiles.map((file: any) => `
                                                                          <a href="${file.url}" style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; text-decoration: none; display: inline-block; margin-bottom: 4px;" target="_blank">
                                                                              ${getSimpleFilename(file.name)}
                                                                          </a>
                                                                         <span style="background-color: #3B82F6; color: #ffffff; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; margin-left: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                                                                             CONTRACT
                                                                         </span><br>
                                                                     `).join('')}
                                                                 </span>
                                                             </td>
                                                         </tr>
                                                         ` : ''}
                                                         ${totalAmount ? `
                                                         <tr>
                                                             <td style="margin: 0; padding: 0 0 8px 0;">
                                                                 <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">Amount:</span>
                                                                 <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">$${Number(totalAmount).toLocaleString()}</span>
                                                             </td>
                                                         </tr>
                                                         ` : ''}
                                                          ${files.length > 0 ? `
                                                          <tr>
                                                              <td style="margin: 0; padding: 0 0 8px 0;">
                                                                  <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Approved Files:</span>
                                                                  <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: inline-block; vertical-align: top;">${fileLinks}</span>
                                                              </td>
                                                          </tr>
                                                           ` : ''}
                                                         ${customMessage ? `
                                                         <tr>
                                                             <td style="margin: 0; padding: 0 0 8px 0;">
                                                                 <span style="color: #666666; font-weight: 500; display: inline-block; width: 120px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; vertical-align: top;">Message:</span>
                                                                 <span style="color: #000000; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: inline-block; vertical-align: top; line-height: 1.4;">${customMessage}</span>
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
    const requestData: POEmailRequest = await req.json();
    const { 
      purchaseOrderId, 
      companyId, 
      biddingCompanyId, 
      projectAddress, 
      companyName, 
      proposals, 
      senderCompanyName, 
      customMessage, 
      costCode,
      testEmail 
    } = requestData;
    
    // Make totalAmount mutable so we can update it from PO data
    let totalAmount = requestData.totalAmount;

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
    let projectManager: any = null;

    // Always fetch project details and cost code if purchaseOrderId is provided
    if (purchaseOrderId) {
      console.log('🔍 Fetching purchase order details...');
      
      // First, get the purchase order data
      const { data: poData, error: poError } = await supabase
        .from('project_purchase_orders')
        .select('*')
        .eq('id', purchaseOrderId)
        .single();

      if (poError) {
        console.error('❌ Error fetching purchase order details:', poError);
      } else {
        console.log('✅ Found purchase order data:', poData);
        
        // Use PO's total amount if not provided in request
        if (!totalAmount && poData.total_amount) {
          totalAmount = poData.total_amount;
          console.log('✅ Using PO total amount:', totalAmount);
        }
        
        // Explicitly fetch project details
        if (poData.project_id) {
          console.log('🔍 Fetching project details for ID:', poData.project_id);
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, address, construction_manager')
            .eq('id', poData.project_id)
            .single();

          if (projectError) {
            console.error('❌ Error fetching project details:', projectError);
          } else {
            projectDetails = projectData;
            console.log('✅ Found project details:', projectDetails);
          }
        }
        
        // Explicitly fetch cost code details
        if (poData.cost_code_id) {
          console.log('🔍 Fetching cost code details for ID:', poData.cost_code_id);
          const { data: costCodeData, error: costCodeError } = await supabase
            .from('cost_codes')
            .select('id, code, name')
            .eq('id', poData.cost_code_id)
            .single();

          if (costCodeError) {
            console.error('❌ Error fetching cost code details:', costCodeError);
          } else {
            costCodeInfo = costCodeData;
            console.log('✅ Found cost code details:', costCodeInfo);
          }
        }

        // Fetch project manager details if manager ID is available
        if (projectDetails?.construction_manager) {
          console.log('🔍 Fetching project manager details for ID:', projectDetails.construction_manager);
          const { data: managerData, error: managerError } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, phone_number')
            .eq('id', projectDetails.construction_manager)
            .single();

          if (managerError) {
            console.error('❌ Error fetching project manager:', managerError);
          } else {
            projectManager = {
              name: `${managerData.first_name || ''} ${managerData.last_name || ''}`.trim(),
              email: managerData.email,
              phone: managerData.phone_number
            };
            console.log('✅ Found project manager:', projectManager);
          }
        }
      }
    }

    let fetchedCompanyName = companyName; // Default to request parameter

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

      // Use the fetched company name
      fetchedCompanyName = company.company_name;
      console.log('✅ Using fetched company name:', fetchedCompanyName);

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

      notificationRecipients = biddingCompany.companies?.[0]?.company_representatives?.filter(
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

    // Get project details and files
    let purchaseOrderFiles: any[] = [];
    let proposalFiles: any[] = [];
    
    if (purchaseOrderId) {
      const { data: poData } = await supabase
        .from('project_purchase_orders')
        .select('files, project_id, cost_code_id, bid_package_id')
        .eq('id', purchaseOrderId)
        .single();
      
      if (poData?.files && Array.isArray(poData.files)) {
        purchaseOrderFiles = poData.files;
      }

      // Fetch proposal files from the company's bid
      if (poData?.project_id && poData?.cost_code_id && companyId) {
        console.log('🔍 Fetching proposal files for project:', poData.project_id, 'cost code:', poData.cost_code_id, 'company:', companyId);
        
        // First try to get from bid_package_id if available
        let bidPackageId = poData.bid_package_id;
        
        // If no bid_package_id, find it by project and cost code
        if (!bidPackageId) {
          const { data: bidPackageData, error: bidPackageError } = await supabase
            .from('project_bid_packages')
            .select('id')
            .eq('project_id', poData.project_id)
            .eq('cost_code_id', poData.cost_code_id)
            .single();

          if (bidPackageError) {
            console.error('❌ Error fetching bid package:', bidPackageError);
          } else if (bidPackageData) {
            bidPackageId = bidPackageData.id;
            console.log('✅ Found bid package:', bidPackageId);
          }
        } else {
          console.log('✅ Using bid package from PO:', bidPackageId);
        }
        
        // Get the company's proposal files from the project_bids table
        if (bidPackageId) {
          const { data: bidData, error: bidError } = await supabase
            .from('project_bids')
            .select('proposals')
            .eq('bid_package_id', bidPackageId)
            .eq('company_id', companyId)
            .single();

          if (bidError) {
            console.error('❌ Error fetching bid data:', bidError);
          } else if (bidData?.proposals && Array.isArray(bidData.proposals)) {
            console.log('✅ Found proposal files:', bidData.proposals);
            
            // Generate public URLs for each proposal file
            proposalFiles = bidData.proposals.map((fileName: string) => ({
              name: fileName,
              url: `https://nlmnwlvmmkngrgatnzkj.supabase.co/storage/v1/object/public/project-files/proposals/${encodeURIComponent(fileName)}`
            }));
            
            console.log('📋 Proposal files prepared:', proposalFiles);
          }
        }
      }
    }

    // Use project address from fetched data if available, otherwise use provided address
    const finalProjectAddress = projectDetails?.address || projectAddress;

    // Determine final files to use in email
    const finalFiles = purchaseOrderFiles.length > 0 ? purchaseOrderFiles : proposalFiles;
    
    console.log('📋 Final email files:', {
      purchaseOrderFilesCount: purchaseOrderFiles.length,
      proposalFilesCount: proposalFiles.length,
      finalFilesCount: finalFiles.length,
      firstFileName: finalFiles.length > 0 ? finalFiles[0]?.name || 'unknown' : 'none'
    });

    console.log('👤 Project manager data being passed to template:', projectManager);

    // Generate email HTML with confirmation buttons (including for test emails)
    const emailHTML = generatePOEmailHTML({
      projectAddress: finalProjectAddress,
      companyName: fetchedCompanyName || 'Unknown Company',
      proposals: proposals || [],
      senderCompanyName: senderCompanyName || 'Builder Suite AI',
      projectManager,
      costCode: costCodeInfo,
      totalAmount,
      files: finalFiles, // Use the already calculated final files
      projectId: projectDetails?.id,
      customMessage,
      contractFiles: [], // Clear contract files since we're using proposal files as approved files
      poNumber: requestData.poNumber // Pass the PO number from the request
    }, purchaseOrderId, companyId);

    // Send emails to all recipients
    const emailPromises = notificationRecipients.map(async (rep: any) => {
      console.log(`📤 Sending PO email to: ${rep.email}`);
      
      return await resend.emails.send({
        from: `${senderCompanyName || 'Builder Suite AI'} <noreply@transactional.buildersuiteai.com>`,
        to: [rep.email],
        subject: `Purchase Order - ${finalProjectAddress || 'Project'}`,
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
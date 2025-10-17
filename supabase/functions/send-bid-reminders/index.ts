import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

console.log('🔧 Send Bid Reminders function starting...');

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BidReminderData {
  bid_package_id: string;
  bid_package_name: string;
  specifications: string | null;
  files: string[];
  due_date: string | null;
  reminder_date: string | null;
  project_bid_id: string;
  company_id: string;
  company_name: string;
  company_address: string | null;
  company_phone: string | null;
  project_address: string;
  project_manager: string | null;
  project_manager_email: string | null;
  project_manager_phone: string | null;
  cost_code: string;
  cost_code_name: string;
  representatives: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
    title: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Querying for bid packages with reminder date = today...');
    
    // Query for bid packages with reminder_date = CURRENT_DATE and incomplete bids
    const { data: bidPackages, error: queryError } = await supabase.rpc(
      'get_bid_reminders_for_today'
    ).returns<BidReminderData[]>();

    if (queryError) {
      console.error('❌ Error querying bid reminders:', queryError);
      
      // Fallback to direct query if RPC doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('project_bid_packages')
        .select(`
          id,
          name,
          specifications,
          files,
          due_date,
          reminder_date,
          status,
          cost_code_id,
          project_id,
          cost_codes (
            code,
            name
          ),
          projects (
            address,
            manager,
            manager_email,
            manager_phone
          ),
          project_bids!inner (
            id,
            company_id,
            price,
            proposals,
            reminder_sent_at,
            companies!inner (
              id,
              company_name,
              address,
              phone_number
            )
          )
        `)
        .eq('status', 'sent')
        .gte('reminder_date', new Date().toISOString().split('T')[0])
        .lte('reminder_date', new Date().toISOString().split('T')[0]);

      if (fallbackError) {
        throw fallbackError;
      }

      // Process fallback data
      const remindersToSend: any[] = [];
      
      for (const pkg of fallbackData || []) {
        // Get representatives for companies that need reminders
        for (const bid of pkg.project_bids) {
          // Check if reminder needed: no price OR no proposals AND not already sent
          const needsReminder = 
            (bid.price === null || bid.proposals === null || bid.proposals.length === 0) &&
            bid.reminder_sent_at === null;

          if (needsReminder) {
            // Get representatives
            const { data: reps } = await supabase
              .from('company_representatives')
              .select('id, first_name, last_name, email, phone_number, title')
              .eq('company_id', bid.company_id)
              .eq('receive_bid_notifications', true);

            if (reps && reps.length > 0) {
              remindersToSend.push({
                bid_package_id: pkg.id,
                bid_package_name: pkg.name,
                specifications: pkg.specifications,
                files: pkg.files || [],
                due_date: pkg.due_date,
                reminder_date: pkg.reminder_date,
                project_bid_id: bid.id,
                company_id: bid.company_id,
                company_name: bid.companies.company_name,
                company_address: bid.companies.address,
                company_phone: bid.companies.phone_number,
                project_address: pkg.projects.address,
                project_manager: pkg.projects.manager,
                project_manager_email: pkg.projects.manager_email,
                project_manager_phone: pkg.projects.manager_phone,
                cost_code: pkg.cost_codes.code,
                cost_code_name: pkg.cost_codes.name,
                representatives: reps
              });
            }
          }
        }
      }

      console.log(`📦 Found ${remindersToSend.length} bid packages needing reminders`);

      if (remindersToSend.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'No reminders to send',
            remindersProcessed: 0
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      // Group by bid package to send batch emails
      const packageGroups = remindersToSend.reduce((acc, reminder) => {
        if (!acc[reminder.bid_package_id]) {
          acc[reminder.bid_package_id] = {
            bidPackage: {
              id: reminder.bid_package_id,
              name: reminder.bid_package_name,
              costCode: {
                code: reminder.cost_code,
                name: reminder.cost_code_name
              },
              due_date: reminder.due_date,
              reminder_date: reminder.reminder_date,
              specifications: reminder.specifications,
              files: reminder.files
            },
            project: {
              address: reminder.project_address,
              manager: reminder.project_manager,
              managerEmail: reminder.project_manager_email,
              managerPhone: reminder.project_manager_phone
            },
            companies: [],
            projectBidIds: []
          };
        }
        
        acc[reminder.bid_package_id].companies.push({
          id: reminder.company_id,
          company_name: reminder.company_name,
          address: reminder.company_address,
          phone_number: reminder.company_phone,
          representatives: reminder.representatives
        });
        
        acc[reminder.bid_package_id].projectBidIds.push(reminder.project_bid_id);
        
        return acc;
      }, {} as Record<string, any>);

      // Send reminder emails for each bid package
      let successCount = 0;
      let errorCount = 0;

      for (const [packageId, data] of Object.entries(packageGroups)) {
        try {
          console.log(`📧 Sending reminder for bid package ${packageId} to ${data.companies.length} companies`);
          
          // Call the send-bid-package-email function with isReminder flag
          const emailResponse = await supabase.functions.invoke('send-bid-package-email', {
            body: {
              bidPackage: data.bidPackage,
              project: data.project,
              companies: data.companies,
              isReminder: true
            }
          });

          if (emailResponse.error) {
            console.error(`❌ Error sending reminder for package ${packageId}:`, emailResponse.error);
            errorCount++;
            continue;
          }

          console.log(`✅ Reminder sent for package ${packageId}`);

          // Update reminder_sent_at for all project_bids in this batch
          const { error: updateError } = await supabase
            .from('project_bids')
            .update({ reminder_sent_at: new Date().toISOString() })
            .in('id', data.projectBidIds);

          if (updateError) {
            console.error(`⚠️ Error updating reminder_sent_at for package ${packageId}:`, updateError);
          } else {
            console.log(`✅ Updated reminder_sent_at for ${data.projectBidIds.length} project bids`);
          }

          successCount++;
        } catch (error) {
          console.error(`❌ Exception sending reminder for package ${packageId}:`, error);
          errorCount++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Processed ${successCount + errorCount} bid packages`,
          remindersProcessed: successCount,
          errors: errorCount,
          totalCompanies: remindersToSend.length
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // If RPC exists and worked, process the data (future implementation)
    console.log(`📦 Found ${bidPackages?.length || 0} bid packages needing reminders via RPC`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'RPC method not yet implemented',
        remindersProcessed: 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error("❌ Error in send-bid-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);

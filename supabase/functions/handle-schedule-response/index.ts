import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  console.log('Processing schedule response request...');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const taskId = url.searchParams.get('task_id');
    const companyId = url.searchParams.get('company_id');
    const response = url.searchParams.get('response');

    console.log('Schedule response params:', { taskId, companyId, response });

    if (!taskId || !companyId || !response) {
      console.error('Missing required parameters');
      return new Response('Missing required parameters', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    if (response !== 'confirm' && response !== 'deny') {
      console.error('Invalid response value');
      return new Response('Invalid response value', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Update the task confirmation status
    const confirmed = response === 'confirm';
    const { data: updatedTask, error: updateError } = await supabase
      .from('project_schedule_tasks')
      .update({ confirmed })
      .eq('id', taskId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return new Response(`Error updating task: ${updateError.message}`, { 
        status: 500,
        headers: corsHeaders 
      });
    }

    console.log('Task updated successfully:', updatedTask);

    // Get task and project details for the redirect
    const { data: taskDetails, error: taskError } = await supabase
      .from('project_schedule_tasks')
      .select(`
        *,
        projects (
          name,
          address
        )
      `)
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error('Error fetching task details:', taskError);
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('company_name')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company details:', companyError);
    }

    // Redirect to confirmation page with details
    const confirmationUrl = new URL('https://nlmnwlvmmkngrgatnzkj.supabase.co/schedule-response-confirmation');
    confirmationUrl.searchParams.set('response', response);
    confirmationUrl.searchParams.set('task_name', taskDetails?.task_name || 'Unknown Task');
    confirmationUrl.searchParams.set('project_name', taskDetails?.projects?.name || 'Unknown Project');
    confirmationUrl.searchParams.set('company_name', company?.company_name || 'Unknown Company');

    console.log('Redirecting to:', confirmationUrl.toString());

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': confirmationUrl.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error in handle-schedule-response function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
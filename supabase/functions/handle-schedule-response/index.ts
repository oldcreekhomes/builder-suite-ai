import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create Supabase client with service role key for bypassing RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
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
      return new Response(
        generateErrorHTML('Missing required parameters'),
        {
          status: 400,
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        }
      );
    }

    if (response !== 'confirm' && response !== 'deny') {
      console.error('Invalid response value');
      return new Response(
        generateErrorHTML('Invalid response value'),
        {
          status: 400,
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        }
      );
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
      return new Response(
        generateErrorHTML('Failed to update task confirmation'),
        {
          status: 500,
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        }
      );
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
    // Use the request origin to dynamically determine the correct domain
    const requestUrl = new URL(req.url);
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || `${requestUrl.protocol}//${requestUrl.host}`;
    const confirmationUrl = new URL(`${origin}/schedule-response-confirmation`);
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
      generateErrorHTML('An unexpected error occurred'),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html', ...corsHeaders },
      }
    );
  }
};

function generateErrorHTML(errorMessage: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .error-container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      max-width: 500px;
    }
    .error-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }
    h1 {
      color: #dc2626;
      margin-bottom: 10px;
    }
    p {
      color: #64748b;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">❌</div>
    <h1>Error</h1>
    <p>${errorMessage}</p>
    <button onclick="window.close()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
      Close
    </button>
  </div>
</body>
</html>`;
}

serve(handler);
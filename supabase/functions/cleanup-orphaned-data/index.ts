import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const orphanedJournalEntryIds = [
      'e814e497-0a9f-4304-8d55-c402005d10cc',
      'b8a03c88-fe8c-47e9-a5fc-2b5ba5b0c715',
      '4235650d-f2f7-4ed6-a97a-4584cc3f1332',
      '2e5a54c6-2408-4be0-a4e7-33029c5400db',
      '88642265-ed48-4319-acfa-ab2846a555d3',
      '396f1a36-c422-4ef7-ad3c-75579ceab46f',
    ];

    const results = [];

    // Delete orphaned journal entries
    for (const jeId of orphanedJournalEntryIds) {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', jeId);
      
      results.push({ type: 'journal_entry', id: jeId, success: !error, error: error?.message });
    }

    // Delete the $0 bill line
    const { error: blError } = await supabase
      .from('bill_lines')
      .delete()
      .eq('id', '5378d3ca-0918-4973-a52e-9fe1d65f0ae9');

    results.push({ type: 'bill_line', id: '5378d3ca', success: !blError, error: blError?.message });

    // Update bill total_amount to reflect removal of $0 line (no change needed since it was $0)

    return new Response(
      JSON.stringify({ message: 'Cleanup completed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

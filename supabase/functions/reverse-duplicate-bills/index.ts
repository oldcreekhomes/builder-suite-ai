import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Hardcoded IDs for the duplicate bills to reverse
const DUPLICATE_BILL_IDS = [
  '7ab46452-6955-4b8a-a00a-f62329c1bb6a', // Sept 9, $6,000
  'fcb6805f-cfb1-46c3-80b5-54a86442cafc', // Sept 24, $1,495.92
]

const REVERSAL_REASON = 'Duplicate entry - correct bill already exists'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting reversal of duplicate bills:', DUPLICATE_BILL_IDS);

    const results = [];

    for (const billId of DUPLICATE_BILL_IDS) {
      console.log(`\n=== Processing bill ${billId} ===`);

      // 1. Fetch the original bill
      const { data: originalBill, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      if (billError || !originalBill) {
        console.error(`Error fetching bill ${billId}:`, billError);
        results.push({ billId, success: false, error: billError?.message || 'Bill not found' });
        continue;
      }

      console.log(`Original bill found: ${originalBill.reference_number || 'No ref'}, amount: ${originalBill.total_amount}`);

      // 2. Fetch the original bill lines
      const { data: originalLines, error: linesError } = await supabase
        .from('bill_lines')
        .select('*')
        .eq('bill_id', billId)
        .order('line_number');

      if (linesError || !originalLines) {
        console.error(`Error fetching bill lines for ${billId}:`, linesError);
        results.push({ billId, success: false, error: linesError?.message || 'Lines not found' });
        continue;
      }

      console.log(`Found ${originalLines.length} bill lines to reverse`);

      // 3. Fetch the original journal entries using source_type and source_id
      const { data: originalJournalEntries, error: jeError } = await supabase
        .from('journal_entries')
        .select('*, journal_entry_lines(*)')
        .eq('source_type', 'bill')
        .eq('source_id', billId)
        .order('created_at');

      if (jeError) {
        console.error(`Error fetching journal entries for ${billId}:`, jeError);
        results.push({ billId, success: false, error: jeError.message });
        continue;
      }

      console.log(`Found ${originalJournalEntries?.length || 0} journal entries to reverse`);

      // 4. Create a new reversing bill
      const reversingBill = {
        owner_id: originalBill.owner_id,
        vendor_id: originalBill.vendor_id,
        project_id: originalBill.project_id,
        bill_date: originalBill.bill_date,
        due_date: originalBill.due_date,
        reference_number: `REVERSAL: ${originalBill.reference_number || 'No ref'}`,
        total_amount: -originalBill.total_amount,
        status: 'posted',
        is_reversal: true,
        reverses_id: billId,
        correction_reason: REVERSAL_REASON,
        created_by: originalBill.created_by,
        notes: `Reversal of duplicate bill ${originalBill.reference_number || billId}`,
      };

      const { data: newReversingBill, error: reversingBillError } = await supabase
        .from('bills')
        .insert(reversingBill)
        .select()
        .single();

      if (reversingBillError || !newReversingBill) {
        console.error(`Error creating reversing bill for ${billId}:`, reversingBillError);
        results.push({ billId, success: false, error: reversingBillError?.message || 'Failed to create reversing bill' });
        continue;
      }

      console.log(`Created reversing bill: ${newReversingBill.id}`);

      // 5. Create reversing bill lines
      const reversingLines = originalLines.map(line => ({
        bill_id: newReversingBill.id,
        owner_id: line.owner_id,
        line_number: line.line_number,
        line_type: line.line_type,
        account_id: line.account_id,
        cost_code_id: line.cost_code_id,
        project_id: line.project_id,
        memo: `REVERSAL: ${line.memo || ''}`,
        quantity: -line.quantity,
        unit_cost: line.unit_cost,
        amount: -line.amount,
        is_reversal: true,
        reverses_line_id: line.id,
      }));

      const { error: insertLinesError } = await supabase
        .from('bill_lines')
        .insert(reversingLines);

      if (insertLinesError) {
        console.error(`Error inserting reversing lines for ${billId}:`, insertLinesError);
        results.push({ billId, success: false, error: insertLinesError.message });
        continue;
      }

      console.log(`Created ${reversingLines.length} reversing bill lines`);

      // 6. Create reversing journal entries
      if (originalJournalEntries && originalJournalEntries.length > 0) {
        for (const je of originalJournalEntries) {
          const reversingJE = {
            owner_id: je.owner_id,
            project_id: je.project_id,
            source_type: 'bill',
            source_id: newReversingBill.id,
            entry_date: je.entry_date,
            description: `REVERSAL: ${je.description}`,
            is_reversal: true,
            reverses_entry_id: je.id,
          };

          const { data: newJE, error: insertJEError } = await supabase
            .from('journal_entries')
            .insert(reversingJE)
            .select()
            .single();

          if (insertJEError || !newJE) {
            console.error(`Error inserting reversing journal entry for ${billId}:`, insertJEError);
            results.push({ billId, success: false, error: insertJEError?.message || 'JE creation failed' });
            break;
          }

          // Create reversing journal entry lines (swap debit/credit)
          const reversingJELines = je.journal_entry_lines.map((line: any) => ({
            journal_entry_id: newJE.id,
            owner_id: line.owner_id,
            account_id: line.account_id,
            cost_code_id: line.cost_code_id,
            project_id: line.project_id,
            line_number: line.line_number,
            debit: line.credit, // Swap debit and credit
            credit: line.debit,
            memo: `REVERSAL: ${line.memo || ''}`,
            is_reversal: true,
            reverses_line_id: line.id,
          }));

          const { error: insertJELinesError } = await supabase
            .from('journal_entry_lines')
            .insert(reversingJELines);

          if (insertJELinesError) {
            console.error(`Error inserting reversing JE lines for ${billId}:`, insertJELinesError);
            results.push({ billId, success: false, error: insertJELinesError.message });
            break;
          }

          console.log(`Created reversing journal entry with ${reversingJELines.length} lines`);

          // Update original journal entry to mark it as reversed
          const { error: updateJEError } = await supabase
            .from('journal_entries')
            .update({ reversed_by_id: newJE.id })
            .eq('id', je.id);

          if (updateJEError) {
            console.error(`Error updating original journal entry ${je.id}:`, updateJEError);
          }
        }
      }

      // 7. Mark the original bill as reversed
      const { error: updateBillError } = await supabase
        .from('bills')
        .update({
          status: 'reversed',
          reversed_by_id: newReversingBill.id,
          reversed_at: new Date().toISOString(),
          correction_reason: REVERSAL_REASON,
        })
        .eq('id', billId);

      if (updateBillError) {
        console.error(`Error updating bill ${billId}:`, updateBillError);
        results.push({ billId, success: false, error: updateBillError.message });
        continue;
      }

      console.log(`Successfully reversed bill ${billId}`);
      results.push({ billId, success: true, message: 'Bill reversed successfully', reversingBillId: newReversingBill.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reversal process completed',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reverse-duplicate-bills function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

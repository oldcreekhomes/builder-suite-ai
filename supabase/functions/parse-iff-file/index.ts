import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IFFAccount {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  description?: string;
  parent_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting IFF file parsing...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    // Get user role and owner_id
    const { data: userData } = await supabase
      .from('users')
      .select('role, home_builder_id')
      .eq('id', user.id)
      .single();

    const owner_id = userData?.role === 'employee' ? userData.home_builder_id : user.id;

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);

    // Read file content
    const fileContent = await file.text();
    console.log('File content length:', fileContent.length);

    // Parse IFF file
    const accounts = parseIFFFile(fileContent);
    console.log(`Parsed ${accounts.length} accounts from IFF file`);

    // Insert accounts into database
    const accountsToInsert = accounts.map(account => ({
      ...account,
      owner_id,
      is_active: true
    }));

    const { data: insertedAccounts, error: insertError } = await supabase
      .from('accounts')
      .insert(accountsToInsert)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log(`Successfully imported ${insertedAccounts?.length || 0} accounts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedAccounts?.length || 0} accounts`,
        accounts: insertedAccounts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing IFF file:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process IFF file'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function parseIFFFile(content: string): IFFAccount[] {
  console.log('Starting IFF file parsing...');
  
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const accounts: IFFAccount[] = [];
  
  let currentSection = '';
  let isInAccountSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for section headers
    if (line.startsWith('!')) {
      currentSection = line;
      isInAccountSection = line.includes('ACCNT') || line.includes('ACCOUNT');
      console.log('Found section:', currentSection, 'isAccountSection:', isInAccountSection);
      continue;
    }
    
    // Skip if not in account section
    if (!isInAccountSection) continue;
    
    // Parse account lines - IFF format typically uses tab-separated values
    const fields = line.split('\t');
    
    if (fields.length < 3) continue; // Need at least account number, name, and type
    
    const accountNumber = fields[0]?.trim();
    const accountName = fields[1]?.trim();
    const accountTypeRaw = fields[2]?.trim();
    
    if (!accountNumber || !accountName || !accountTypeRaw) continue;
    
    // Map QuickBooks account types to our system
    const accountType = mapQBAccountType(accountTypeRaw);
    
    if (accountType) {
      accounts.push({
        code: accountNumber,
        name: accountName,
        type: accountType,
        description: fields[3]?.trim() || undefined
      });
      
      console.log(`Parsed account: ${accountNumber} - ${accountName} (${accountType})`);
    }
  }
  
  console.log(`Total accounts parsed: ${accounts.length}`);
  return accounts;
}

function mapQBAccountType(qbType: string): 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | null {
  const type = qbType.toLowerCase().replace(/\s+/g, '');
  
  // Asset accounts
  if (type.includes('asset') || 
      type.includes('cash') || 
      type.includes('bank') ||
      type.includes('checking') ||
      type.includes('savings') ||
      type.includes('receivable') ||
      type.includes('inventory') ||
      type.includes('fixedasset') ||
      type.includes('otherasset')) {
    return 'asset';
  }
  
  // Liability accounts
  if (type.includes('liability') ||
      type.includes('payable') ||
      type.includes('creditcard') ||
      type.includes('loan') ||
      type.includes('othercurrentliability') ||
      type.includes('longtermliability')) {
    return 'liability';
  }
  
  // Equity accounts
  if (type.includes('equity') ||
      type.includes('capital') ||
      type.includes('retainedearnings') ||
      type.includes('openingbalance') ||
      type.includes('draw')) {
    return 'equity';
  }
  
  // Revenue/Income accounts
  if (type.includes('income') ||
      type.includes('revenue') ||
      type.includes('sales') ||
      type.includes('service') ||
      type.includes('otherincome')) {
    return 'revenue';
  }
  
  // Expense accounts
  if (type.includes('expense') ||
      type.includes('cost') ||
      type.includes('cogs') ||
      type.includes('costofgoodssold') ||
      type.includes('otherexpense')) {
    return 'expense';
  }
  
  console.log(`Unknown account type: ${qbType}, skipping...`);
  return null;
}
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BidSubmissionRequest {
  bidPackageId: string;
  companyId: string;
  price: number;
  files: File[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing bid submission request...');
    
    const formData = await req.formData();
    const bidPackageId = formData.get('bidPackageId') as string;
    const companyId = formData.get('companyId') as string;
    const price = parseFloat(formData.get('price') as string);
    
    console.log('Bid submission params:', {
      bidPackageId,
      companyId,
      price
    });

    if (!bidPackageId || !companyId || !price) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process uploaded files
    const files = formData.getAll('files') as File[];
    const uploadedFileNames: string[] = [];
    
    console.log(`Processing ${files.length} files...`);

    for (const file of files) {
      if (file && file.size > 0) {
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const extension = file.name.split('.').pop();
        const uniqueFileName = `${bidPackageId}_${companyId}_${timestamp}_${random}.${extension}`;
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(`proposals/${uniqueFileName}`, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw new Error(`Failed to upload file: ${file.name}`);
        }

        uploadedFileNames.push(uniqueFileName);
        console.log(`Uploaded file: ${uniqueFileName}`);
      }
    }

    // Check if bid package company record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('project_bid_package_companies')
      .select('id, proposals')
      .eq('bid_package_id', bidPackageId)
      .eq('company_id', companyId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing record:', checkError);
      throw checkError;
    }

    let updateData: any = {
      price: price,
      updated_at: new Date().toISOString()
    };

    // Merge with existing proposals if any
    if (existingRecord?.proposals) {
      updateData.proposals = [...existingRecord.proposals, ...uploadedFileNames];
    } else {
      updateData.proposals = uploadedFileNames;
    }

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('project_bid_package_companies')
        .update(updateData)
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('Error updating bid record:', updateError);
        throw updateError;
      }
    } else {
      // Create new record
      updateData.bid_package_id = bidPackageId;
      updateData.company_id = companyId;
      updateData.bid_status = 'submitted';

      const { error: insertError } = await supabase
        .from('project_bid_package_companies')
        .insert(updateData);

      if (insertError) {
        console.error('Error creating bid record:', insertError);
        throw insertError;
      }
    }

    console.log('Bid submission completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Bid submitted successfully',
        filesUploaded: uploadedFileNames.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in submit-bid function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sheet_id,
      roboflow_workspace = "old-creek-homes",
      roboflow_project = "exterior-elevations-test",
      roboflow_version = 1,
      confidence_threshold = 0.5
    } = await req.json();
    
    if (!sheet_id) {
      return new Response(JSON.stringify({ error: 'sheet_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY');
    
    if (!roboflowApiKey) {
      return new Response(JSON.stringify({ error: 'ROBOFLOW_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Fetching sheet:', sheet_id);

    // Fetch sheet details
    const { data: sheet, error: sheetError } = await supabase
      .from('takeoff_sheets')
      .select('*')
      .eq('id', sheet_id)
      .single();

    if (sheetError || !sheet) {
      console.error('Sheet fetch error:', sheetError);
      return new Response(JSON.stringify({ error: 'Sheet not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all estimate cost codes for this owner
    const { data: costCodes, error: costCodesError } = await supabase
      .from('cost_codes')
      .select('*')
      .eq('owner_id', sheet.owner_id)
      .eq('estimate', true)
      .neq('has_subcategories', true)
      .order('code');

    if (costCodesError || !costCodes || costCodes.length === 0) {
      console.error('Cost codes fetch error:', costCodesError);
      return new Response(JSON.stringify({ error: 'No estimate cost codes found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter cost codes for windows and doors
    const filteredCostCodes = costCodes.filter(cc => {
      const name = cc.name?.toLowerCase() || '';
      return name.includes('window') || name.includes('door') || name.includes('garage');
    });

    console.log('Filtered cost codes:', filteredCostCodes.length);

    // Get public URL for the sheet file
    const { data: fileData } = supabase.storage
      .from('project-files')
      .getPublicUrl(sheet.file_path);

    if (!fileData?.publicUrl) {
      return new Response(JSON.stringify({ error: 'Failed to get file URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download the file
    const fileResponse = await fetch(fileData.publicUrl);
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log(`Downloaded file: ${fileBuffer.byteLength} bytes`);
    
    // Convert to base64
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      const bytes = new Uint8Array(buffer);
      const chunkSize = 8192;
      let binary = '';
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      
      return btoa(binary);
    }
    
    const base64Image = arrayBufferToBase64(fileBuffer);
    console.log('Base64 conversion complete, calling Roboflow...');

    // Roboflow: JSON POST to inference API
    const { data: signed } = await supabase.storage
      .from('project-files')
      .createSignedUrl(sheet.file_path, 300);
    const imageUrl = signed?.signedUrl || fileData.publicUrl;

    const model_id = `${roboflow_project}/${roboflow_version}`;
    console.log('Calling Roboflow with model_id:', model_id);
    console.log('Image URL (truncated):', imageUrl.slice(0, 120));

    let roboflowData: any | null = null;
    let lastStatus = 0;
    let lastText = '';

    // Attempt JSON POST to inference API
    const rfUrl = 'https://detect.roboflow.com/infer/object_detection';
    let rfResp = await fetch(rfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_id: model_id,
        image: { type: 'url', value: imageUrl },
        api_key: roboflowApiKey,
        confidence: confidence_threshold
      })
    });

    if (rfResp.ok) {
      roboflowData = await rfResp.json();
      console.log('Roboflow JSON POST succeeded');
    } else {
      lastStatus = rfResp.status;
      lastText = await rfResp.text();
      console.error('Roboflow JSON POST failed:', lastStatus, lastText?.slice(0, 300));

      // Fallback: GET with image query param
      const rfGetUrl = `https://detect.roboflow.com/${roboflow_project}/${roboflow_version}?api_key=${roboflowApiKey}&confidence=${confidence_threshold}&image=${encodeURIComponent(imageUrl)}`;
      rfResp = await fetch(rfGetUrl, { method: 'GET' });
      if (rfResp.ok) {
        roboflowData = await rfResp.json();
        console.log('Roboflow GET fallback succeeded');
      } else {
        lastStatus = rfResp.status;
        lastText = await rfResp.text();
        console.error('Roboflow GET fallback failed:', lastStatus, lastText?.slice(0, 300));
      }
    }

    if (!roboflowData) {
      // Handle auth errors explicitly
      if (lastStatus === 401 || lastStatus === 403) {
        return new Response(JSON.stringify({
          success: false,
          error_code: 403,
          error: 'Roboflow authentication failed. Check API key and project/version access.',
          details: lastText?.slice(0, 300)
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Roboflow error (${lastStatus})`, details: lastText?.slice(0, 300) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Roboflow response:', roboflowData.predictions?.length || 0, 'detections');

    if (!roboflowData.predictions || !Array.isArray(roboflowData.predictions)) {
      return new Response(JSON.stringify({ error: 'Invalid Roboflow response structure' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract and store image dimensions used by Roboflow for accurate coordinate system
    const aiProcessingWidth = roboflowData.image?.width || null;
    const aiProcessingHeight = roboflowData.image?.height || null;
    console.log('Roboflow processing dimensions:', aiProcessingWidth, 'x', aiProcessingHeight);

    if (aiProcessingWidth && aiProcessingHeight) {
      const { error: updateSheetError } = await supabase
        .from('takeoff_sheets')
        .update({
          ai_processing_width: aiProcessingWidth,
          ai_processing_height: aiProcessingHeight
        })
        .eq('id', sheet_id);

      if (updateSheetError) {
        console.error('Error updating sheet dimensions:', updateSheetError);
      } else {
        console.log('Stored AI processing dimensions in sheet metadata');
      }
    }

    // Map Roboflow class names to cost codes
    const classMapping: Record<string, any> = {};
    filteredCostCodes.forEach(cc => {
      const name = cc.name?.toLowerCase() || '';
      if (name.includes('window') && name.includes('single')) {
        classMapping['Window-Single'] = cc;
      } else if (name.includes('window') && name.includes('double')) {
        classMapping['Window-Double'] = cc;
      } else if (name.includes('window') && name.includes('triple')) {
        classMapping['Window-Triple'] = cc;
      } else if (name.includes('garage') && name.includes('single')) {
        classMapping['GarageDoor-Single'] = cc;
      } else if (name.includes('garage') && name.includes('double')) {
        classMapping['GarageDoor-Double'] = cc;
      }
    });

    console.log('Class mapping:', Object.keys(classMapping));

    // Helper function to get color for category
    const getColorForCategory = (category: string): string => {
      const colorMap: Record<string, string> = {
        'Windows - Single': '#f7f13b',
        'Windows - Double': '#3b82f6',
        'Windows - Triple': '#10b981',
        'Garage Door - Single': '#f97316',
        'Garage Door - Double': '#ef4444',
      };
      return colorMap[category] || '#8b5cf6';
    };

    // Normalize class/name variants to a canonical display category
    const normalizeCategory = (classOrName: string): string => {
      if (/^Window-Single$/i.test(classOrName)) return 'Windows - Single';
      if (/^Window-Double$/i.test(classOrName)) return 'Windows - Double';
      if (/^Window-Triple$/i.test(classOrName)) return 'Windows - Triple';
      if (/^GarageDoor-Single$/i.test(classOrName)) return 'Garage Door - Single';
      if (/^GarageDoor-Double$/i.test(classOrName)) return 'Garage Door - Double';
      const lower = (classOrName || '').toLowerCase();
      if (lower.includes('window') && lower.includes('single')) return 'Windows - Single';
      if (lower.includes('window') && lower.includes('double')) return 'Windows - Double';
      if (lower.includes('window') && lower.includes('triple')) return 'Windows - Triple';
      if (lower.includes('garage') && lower.includes('single')) return 'Garage Door - Single';
      if (lower.includes('garage') && lower.includes('double')) return 'Garage Door - Double';
      return classOrName;
    };

    // Group detections by class
    const groupedByClass: Record<string, any[]> = {};
    roboflowData.predictions.forEach((pred: any) => {
      if (!groupedByClass[pred.class]) {
        groupedByClass[pred.class] = [];
      }
      groupedByClass[pred.class].push(pred);
    });

    // Create takeoff items with quantities
    const takeoffItems = Object.entries(groupedByClass).map(([className, preds]) => {
      const costCode = classMapping[className];
      const displayCategory = normalizeCategory(costCode?.name || className);
      const color = getColorForCategory(displayCategory);
      const avgConfidence = preds.reduce((sum, p) => sum + p.confidence, 0) / preds.length;

      console.log(`Creating item: class="${className}", name="${costCode?.name}", category="${displayCategory}", color="${color}", count=${preds.length}`);
      
      return {
        cost_code_id: costCode?.id,
        category: displayCategory,
        quantity: preds.length,
        unit_price: costCode?.price || 0,
        notes: `Detected ${preds.length} instances with ${Math.round(avgConfidence * 100)}% avg confidence`,
        detections: preds,
        color,
      };
    });

    console.log('Takeoff items created:', takeoffItems.length);

    // Delete previous AI-generated items and their annotations for this sheet
    const { data: oldItems, error: findOldErr } = await supabase
      .from('takeoff_items')
      .select('id')
      .eq('takeoff_sheet_id', sheet_id)
      .like('notes', '%avg confidence%');

    if (findOldErr) {
      console.error('Error finding previous AI items:', findOldErr);
    } else if (oldItems && oldItems.length > 0) {
      const oldIds = oldItems.map((i: any) => i.id);
      const { error: delAnnErr } = await supabase
        .from('takeoff_annotations')
        .delete()
        .in('takeoff_item_id', oldIds);
      if (delAnnErr) {
        console.error('Error deleting previous annotations:', delAnnErr);
      }
      const { error: delItemsErr } = await supabase
        .from('takeoff_items')
        .delete()
        .in('id', oldIds);
      if (delItemsErr) {
        console.error('Error deleting previous AI items:', delItemsErr);
      } else {
        console.log(`Deleted ${oldIds.length} previous AI items`);
      }
    }

    // Insert takeoff items into database
    const { data: insertedItems, error: insertError } = await supabase
      .from('takeoff_items')
      .insert(
        takeoffItems.map(item => ({
          takeoff_sheet_id: sheet_id,
          owner_id: sheet.owner_id,
          item_type: 'count',
          category: item.category,
          quantity: item.quantity,
          unit_of_measure: 'each',
          unit_price: item.unit_price,
          cost_code_id: item.cost_code_id,
          notes: item.notes,
          color: item.color
        }))
      )
      .select();

    if (insertError) {
      console.error('Error inserting items:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to insert takeoff items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully created', insertedItems?.length || 0, 'takeoff items');

    // Create annotations with bounding boxes
    const annotations = [];
    
    for (const item of insertedItems) {
      const takeoffItem = takeoffItems.find(ti => ti.category === item.category);
      if (!takeoffItem?.detections) continue;

      for (const detection of takeoffItem.detections) {
        // Convert Roboflow center-based coordinates to top-left based
        const left = detection.x - detection.width / 2;
        const top = detection.y - detection.height / 2;
        
        annotations.push({
          takeoff_sheet_id: sheet_id,
          takeoff_item_id: item.id,
          owner_id: sheet.owner_id,
          annotation_type: 'rectangle',
          geometry: {
            left: left,
            top: top,
            width: detection.width,
            height: detection.height,
            strokeWidth: 3
          },
          color: item.color,
          label: `${item.category} (${Math.round(detection.confidence * 100)}%)`,
          visible: true
        });
      }
    }

    if (annotations.length > 0) {
      const { error: annotError } = await supabase
        .from('takeoff_annotations')
        .insert(annotations);

      if (annotError) {
        console.error('Error creating annotations:', annotError);
        // Don't throw - items were created successfully
      } else {
        console.log('Created', annotations.length, 'bounding box annotations');
      }
    }

    // Calculate average confidence
    const totalDetections = roboflowData.predictions.length;
    const avgConfidence = totalDetections > 0
      ? roboflowData.predictions.reduce((sum: number, p: any) => sum + p.confidence, 0) / totalDetections
      : 0;

    return new Response(JSON.stringify({
      success: true,
      items: insertedItems,
      annotations_created: annotations.length,
      sheet_name: sheet.name,
      detection_summary: {
        total_detections: totalDetections,
        avg_confidence: Math.round(avgConfidence * 100),
        classes_detected: Object.keys(groupedByClass)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Extract takeoff error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConvertRequest {
  photoId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { photoId }: ConvertRequest = await req.json()
    
    if (!photoId) {
      return new Response(
        JSON.stringify({ error: 'Photo ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get photo data from database
    const { data: photo, error: fetchError } = await supabase
      .from('project_photos')
      .select('*')
      .eq('id', photoId)
      .single()

    if (fetchError || !photo) {
      return new Response(
        JSON.stringify({ error: 'Photo not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if it's a HEIC file
    const isHeicFile = photo.description?.toLowerCase().endsWith('.heic') || 
                      photo.url.toLowerCase().includes('.heic')
    
    if (!isHeicFile) {
      return new Response(
        JSON.stringify({ error: 'Photo is not a HEIC file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use Supabase's image transformation to convert HEIC to JPEG
    // Extract the storage path from the URL
    const urlParts = photo.url.split('/')
    const storagePath = urlParts.slice(-4).join('/')
    
    // Create JPEG version using Supabase's transform API
    const transformUrl = `${supabaseUrl}/storage/v1/render/image/public/project-files/${storagePath}?format=jpeg&quality=85`
    
    // Fetch the transformed JPEG
    const transformResponse = await fetch(transformUrl)
    if (!transformResponse.ok) {
      throw new Error(`Transform failed: ${transformResponse.statusText}`)
    }

    const jpegBlob = await transformResponse.blob()
    
    // Create new filename with .jpg extension
    const originalName = photo.description?.replace(/\.heic$/i, '') || 'photo'
    const newDescription = `${originalName}.jpg`
    
    // Extract file ID from original path
    const fileName = urlParts[urlParts.length - 1]
    const fileId = fileName.split('_')[0]
    const newFileName = `${photo.uploaded_by}/${photo.project_id}/photos/${fileId}_${newDescription}`
    
    // Upload the converted JPEG
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(newFileName, jpegBlob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get new public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(newFileName)

    // Update the database record
    const { error: updateError } = await supabase
      .from('project_photos')
      .update({
        url: publicUrl,
        description: newDescription
      })
      .eq('id', photoId)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    // Delete the old HEIC file
    const { error: deleteError } = await supabase.storage
      .from('project-files')
      .remove([storagePath])

    if (deleteError) {
      console.warn('Failed to delete original HEIC file:', deleteError.message)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newUrl: publicUrl, 
        newDescription: newDescription 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Conversion error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
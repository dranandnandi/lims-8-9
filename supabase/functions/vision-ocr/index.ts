const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-attachment-id, x-order-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

interface VisionRequest {
  attachmentId?: string;
  base64Image?: string;
  documentType?: string;
  testType?: string;
  aiProcessingType?: string;
  analysisType?: 'text' | 'objects' | 'colors' | 'all';
}

interface VisionResponse {
  fullText?: string;
  objects?: any[];
  colors?: any[];
  confidence?: number;
  error?: string;
}

/**
 * Call Google Cloud Vision AI Text Detection
 */
async function getVisionText(base64Image: string, apiKey: string): Promise<any> {
  // Validate base64 image
  if (!base64Image || base64Image.length === 0) {
    throw new Error('Invalid base64 image data');
  }

  // Remove data URL prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Check if base64 is valid
  try {
    atob(cleanBase64);
  } catch (error) {
    throw new Error('Invalid base64 encoding');
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: cleanBase64,
            },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION' },
              { type: 'TEXT_DETECTION' }
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Vision API Error Details:', errorText);
    throw new Error(`Vision API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const annotations = result.responses[0];
  
  // Check for API errors in response
  if (annotations.error) {
    throw new Error(`Vision API response error: ${annotations.error.message}`);
  }
  
  return {
    fullText: annotations.fullTextAnnotation?.text || '',
    textAnnotations: annotations.textAnnotations || [],
    confidence: annotations.textAnnotations?.[0]?.confidence || 0,
  };
}

/**
 * Call Google Cloud Vision AI Object Detection
 */
async function getVisionObjects(base64Image: string, apiKey: string): Promise<any> {
  // Validate base64 image
  if (!base64Image || base64Image.length === 0) {
    throw new Error('Invalid base64 image data');
  }

  // Remove data URL prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: cleanBase64,
            },
            features: [
              { type: 'OBJECT_LOCALIZATION', maxResults: 20 },
              { type: 'LABEL_DETECTION', maxResults: 20 }
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Vision API Error Details:', errorText);
    throw new Error(`Vision API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const annotations = result.responses[0];
  
  // Check for API errors in response
  if (annotations.error) {
    throw new Error(`Vision API response error: ${annotations.error.message}`);
  }
  
  return {
    objects: annotations.localizedObjectAnnotations || [],
    labels: annotations.labelAnnotations || [],
    objectCount: annotations.localizedObjectAnnotations?.length || 0,
    labelCount: annotations.labelAnnotations?.length || 0,
  };
}

/**
 * Call Google Cloud Vision AI Color Detection
 */
async function getVisionColors(base64Image: string, apiKey: string): Promise<any> {
  // Validate base64 image
  if (!base64Image || base64Image.length === 0) {
    throw new Error('Invalid base64 image data');
  }

  // Remove data URL prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: cleanBase64,
            },
            features: [
              { type: 'IMAGE_PROPERTIES' }
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Vision API Error Details:', errorText);
    throw new Error(`Vision API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const annotations = result.responses[0];
  
  // Check for API errors in response
  if (annotations.error) {
    throw new Error(`Vision API response error: ${annotations.error.message}`);
  }
  
  const colors = annotations.imagePropertiesAnnotation?.dominantColors?.colors || [];
  
  return {
    dominantColors: colors.map((colorInfo: any) => ({
      color: {
        red: colorInfo.color.red || 0,
        green: colorInfo.color.green || 0,
        blue: colorInfo.color.blue || 0
      },
      score: colorInfo.score || 0,
      pixelFraction: colorInfo.pixelFraction || 0,
      hexColor: rgbToHex(
        colorInfo.color.red || 0,
        colorInfo.color.green || 0,
        colorInfo.color.blue || 0
      )
    })),
    colorCount: colors.length
  };
}

/**
 * Helper function to convert RGB to HEX
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Get image from Supabase Storage
 */
async function getImageFromStorage(attachmentId: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  // Get attachment record
  const attachmentResponse = await fetch(
    `${supabaseUrl}/rest/v1/attachments?id=eq.${attachmentId}&select=*`,
    {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!attachmentResponse.ok) {
    throw new Error('Failed to fetch attachment record');
  }

  const attachments = await attachmentResponse.json();
  if (!attachments || attachments.length === 0) {
    throw new Error('Attachment not found');
  }

  const attachment = attachments[0];

  // Download file from Supabase Storage
  const fileResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/attachments/${attachment.file_path}`,
    {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    }
  );

  if (!fileResponse.ok) {
    throw new Error('Failed to download file from storage');
  }

  const fileBlob = await fileResponse.blob();
  const arrayBuffer = await fileBlob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  return base64;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for API key first - try ALLGOOGLE_KEY first, then fallback to GOOGLE_CLOUD_API_KEY
    const visionApiKey = Deno.env.get('ALLGOOGLE_KEY') || Deno.env.get('GOOGLE_CLOUD_API_KEY');
    if (!visionApiKey) {
      console.error('Google API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Google API key not configured',
          details: 'Please set ALLGOOGLE_KEY or GOOGLE_CLOUD_API_KEY in Supabase secrets'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { attachmentId, base64Image, documentType, testType, analysisType = 'all', aiProcessingType }: VisionRequest = await req.json();

    if (!attachmentId && !base64Image) {
      return new Response(
        JSON.stringify({ error: 'Missing attachmentId or base64Image' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting Vision AI processing for ${aiProcessingType || documentType || testType || 'unknown'} type`);

    // Get image data
    let imageData = base64Image;
    if (attachmentId && !base64Image) {
      imageData = await getImageFromStorage(attachmentId);
    }

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data available' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const visionResults: VisionResponse = {};

    // Determine which Vision AI features to use based on document/test type
    const needsText = analysisType === 'all' || analysisType === 'text' ||
                     aiProcessingType === 'ocr_report' ||
                     ['instrument-screen', 'printed-report', 'handwritten', 'test-request-form'].includes(documentType || '');
    
    const needsObjects = analysisType === 'all' || analysisType === 'objects' ||
                        aiProcessingType === 'vision_card' ||
                        ['blood-group', 'covid-test', 'malaria-test', 'pregnancy-test', 'dengue-test'].includes(testType || '');
    
    const needsColors = analysisType === 'all' || analysisType === 'colors' ||
                       aiProcessingType === 'vision_color' ||
                       ['urine-strip', 'blood-group', 'pipette-validation'].includes(testType || documentType || '');

    // Execute Vision AI calls based on requirements
    if (needsText) {
      try {
        console.log('Performing text extraction with Vision AI...');
        const textResult = await getVisionText(imageData, visionApiKey);
        visionResults.fullText = textResult.fullText;
        visionResults.confidence = textResult.confidence;
        console.log(`Text extraction completed. Extracted ${textResult.fullText.length} characters`);
      } catch (error) {
        console.error('Text extraction failed:', error);
        visionResults.error = `Text extraction failed: ${error.message}`;
      }
    }

    if (needsObjects) {
      try {
        console.log('Performing object detection with Vision AI...');
        const objectResult = await getVisionObjects(imageData, visionApiKey);
        visionResults.objects = objectResult.objects;
        console.log(`Object detection completed. Found ${objectResult.objectCount} objects`);
      } catch (error) {
        console.error('Object detection failed:', error);
        if (!visionResults.error) visionResults.error = `Object detection failed: ${error.message}`;
      }
    }

    if (needsColors) {
      try {
        console.log('Performing color analysis with Vision AI...');
        const colorResult = await getVisionColors(imageData, visionApiKey);
        visionResults.colors = colorResult.dominantColors;
        console.log(`Color analysis completed. Found ${colorResult.colorCount} dominant colors`);
      } catch (error) {
        console.error('Color analysis failed:', error);
        if (!visionResults.error) visionResults.error = `Color analysis failed: ${error.message}`;
      }
    }

    // Add metadata
    const responseData = {
      ...visionResults,
      originalBase64Image: imageData,
      metadata: {
        documentType: documentType || testType || aiProcessingType,
        aiProcessingType: aiProcessingType || null,
        analysisType,
        featuresUsed: {
          text: needsText,
          objects: needsObjects,
          colors: needsColors
        },
        processingTimestamp: new Date().toISOString(),
        attachmentId: attachmentId || null
      }
    };

    // Update attachment with AI processing metadata if attachmentId provided
    if (attachmentId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        try {
          await fetch(
            `${supabaseUrl}/rest/v1/attachments?id=eq.${attachmentId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ai_processed: !visionResults.error,
                ai_confidence: visionResults.confidence || null,
                processing_status: visionResults.error ? 'failed' : 'processed',
                ai_processed_at: new Date().toISOString(),
                ai_processing_type: aiProcessingType || documentType || testType,
                ai_metadata: {
                  vision_features_used: {
                    text: needsText,
                    objects: needsObjects,
                    colors: needsColors
                  },
                  text_length: visionResults.fullText?.length || 0,
                  objects_count: visionResults.objects?.length || 0,
                  colors_count: visionResults.colors?.length || 0,
                  error: visionResults.error || null
                }
              })
            }
          );
          console.log(`Updated attachment ${attachmentId} with AI processing metadata`);
        } catch (updateError) {
          console.error('Failed to update attachment metadata:', updateError);
          // Don't fail the request if metadata update fails
        }
      }
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Vision OCR function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Vision processing failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
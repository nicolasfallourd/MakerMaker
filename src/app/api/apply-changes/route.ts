// @Doc
// API route for applying text changes to Instagram stories using FLUX Kontext Pro via Replicate API
// Takes the original image and analysis with changes, then generates a new version with updated text

import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});



export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Missing REPLICATE_API_TOKEN' },
        { status: 500 }
      );
    }

    // Check if this is a FormData request (custom image upload)
    const contentType = request.headers.get('content-type');
    let imageUrl: string;
    let analysisResult: Record<string, unknown> | null;
    let customPrompt: string;
    let isCustomImage = false;

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData for custom image upload
      const formData = await request.formData();
      const customImage = formData.get('customImage') as File;
      customPrompt = formData.get('customPrompt') as string;


      if (!customImage) {
        return NextResponse.json(
          { error: 'No custom image provided' },
          { status: 400 }
        );
      }

      console.log('📤 [DEBUG] Uploading custom image to Replicate file storage...');
      
      // Use replicate.files.create() to get a publicly accessible URL
      const file = await replicate.files.create(customImage);
      imageUrl = file.urls.get; // This gives us a publicly accessible replicate.delivery URL
      isCustomImage = true;
      
      console.log('✅ [DEBUG] Custom image uploaded to Replicate:');
      console.log('🔗 Image URL:', imageUrl);
      console.log('📊 Original size:', customImage.size, 'bytes');
      console.log('🎭 MIME type:', customImage.type);
      console.log('📁 File name:', customImage.name);
      
      // For custom images, we don't have analysis result, so we'll use the prompt directly
      analysisResult = null;
    } else {
      // Handle JSON request (original flow)
      const body = await request.json();
      ({ imageUrl, analysisResult, customPrompt } = body);
      isCustomImage = false;
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    if (!customPrompt) {
      return NextResponse.json(
        { error: 'No prompt provided' },
        { status: 400 }
      );
    }

    // For custom images, we don't require analysis result
    if (!analysisResult && contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'No analysis result provided' },
        { status: 400 }
      );
    }

    // Use custom prompt if provided, otherwise build the prompt for FLUX Kontext Pro
    let prompt: string;
    
    if (customPrompt) {
      prompt = customPrompt;
    } else if (analysisResult && 'textBlocks' in analysisResult && Array.isArray(analysisResult.textBlocks)) {
      prompt = "Update this Instagram story image by replacing the text content as follows:\n\n";
      
      const textBlocks = analysisResult.textBlocks as Array<Record<string, unknown>>;
      const changesFound = textBlocks.some((block) => 'newContent' in block && block.newContent);
      
      if (!changesFound) {
        return NextResponse.json(
          { error: 'No changes detected in the analysis' },
          { status: 400 }
        );
      }

      textBlocks.forEach((block) => {
        if ('newContent' in block && block.newContent) {
          const type = 'type' in block ? String(block.type) : 'Text';
          const originalContent = 'originalContent' in block ? String(block.originalContent) : '';
          const newContent = String(block.newContent);
          prompt += `${type}: Replace "${originalContent}" with "${newContent}"\n`;
        }
      });

      prompt += "\nMaintain the same visual style, layout, colors, and typography. Only change the text content as specified. Keep the same aspect ratio and overall design aesthetic.";
    } else {
      return NextResponse.json(
        { error: 'No prompt or analysis result provided' },
        { status: 400 }
      );
    }

    console.log('\n🔧 [DEBUG] Applying Changes to Instagram Story:');
    if (isCustomImage) {
      console.log('📸 Custom Image URL:', imageUrl);
      console.log('🔗 [DEBUG] Using custom uploaded image (Replicate URL)');
    } else {
      console.log('📸 Original Image URL:', imageUrl);
      console.log('🔗 [DEBUG] Using original replicate.delivery URL directly');
    }
    console.log('📝 FLUX Prompt:', prompt);
    console.log('🔧 Model: black-forest-labs/flux-kontext-pro');

    // Prepare input parameters for FLUX Kontext Pro
    const inputParams = {
      input_image: imageUrl, // Always a string URL now (either replicate.delivery or uploaded file URL)
      prompt: prompt,
      aspect_ratio: "9:16",
      output_format: "jpg",
      output_quality: 90,
      safety_tolerance: 2,
      prompt_upsampling: true
    };

    console.log('📤 [DEBUG] Sending to FLUX Kontext Pro:');
    console.log('🔧 Input Parameters:', JSON.stringify(inputParams, null, 2));

    // Use FLUX Kontext Pro via Replicate (direct fetch to avoid CSP issues)
    console.log('⏳ [DEBUG] Calling FLUX Kontext Pro API...');
    
    // Get the latest FLUX Kontext Pro model
    const modelRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro', {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
    
    if (!modelRes.ok) {
      console.error('Failed to get model info:', await modelRes.text());
      return NextResponse.json({ error: 'Failed to get model info' }, { status: 500 });
    }
    
    const modelData = await modelRes.json();
    const latestVersion = modelData.latest_version.id;
    console.log('Using FLUX Kontext Pro version:', latestVersion);
    
    // Create prediction using direct Replicate API
    const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: latestVersion,
        input: inputParams,
      }),
    });

    if (!replicateRes.ok) {
      const replicateError = await replicateRes.text();
      console.error('Replicate API error:', replicateError);
      return NextResponse.json({ error: 'Replicate API error: ' + replicateError }, { status: 500 });
    }

    const prediction = await replicateRes.json();
    console.log('Prediction created:', prediction.id);

    // Poll for completion
    let result = prediction;
    const maxAttempts = 60; // 3 minutes max
    let attempts = 0;

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds
      attempts++;

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });

      if (pollRes.ok) {
        result = await pollRes.json();
        console.log(`Poll attempt ${attempts}: ${result.status}`);
      } else {
        console.error('Poll failed:', await pollRes.text());
        break;
      }
    }

    if (result.status !== 'succeeded') {
      const errorMsg = result.error || 'Generation timed out';
      console.error('FLUX generation failed:', errorMsg);
      return NextResponse.json({ error: 'FLUX generation failed: ' + errorMsg }, { status: 500 });
    }

    const output = result.output;

    console.log('\n📥 [DEBUG] FLUX Kontext Pro Response:');
    console.log('✅ [DEBUG] FLUX Kontext Pro Output:', output);
    console.log('✅ [DEBUG] Output Type:', typeof output);
    console.log('✅ [DEBUG] Output Constructor:', output?.constructor?.name);

    // Handle output from direct Replicate API (usually string or array)
    let generatedImageUrl: string;
    
    if (typeof output === 'string') {
      // Direct URL string
      generatedImageUrl = output;
      console.log('✅ Using direct URL string:', generatedImageUrl);
    } else if (Array.isArray(output) && output.length > 0) {
      // Array of URLs, take the first one
      generatedImageUrl = String(output[0]);
      console.log('✅ Using first URL from array:', generatedImageUrl);
    } else {
      console.error('❌ Unexpected output format:', typeof output);
      console.error('❌ Full output:', JSON.stringify(output, null, 2));
      return NextResponse.json({ error: 'Unexpected output format from FLUX Kontext Pro' }, { status: 500 });
    }

    console.log('\n🎉 [DEBUG] Successfully processed FLUX Kontext Pro response:');
    console.log('🖼️ Generated Image URL:', generatedImageUrl);
    console.log('✅ [DEBUG] Returning success response to frontend');

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      prompt: prompt,
    });

  } catch (error: unknown) {
    console.error('Apply changes error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to apply changes';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
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
    let analysisResult: any;
    let customPrompt: string;
    let isCustomImage = false;

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData for custom image upload
      const formData = await request.formData();
      const customImage = formData.get('customImage') as File;
      customPrompt = formData.get('customPrompt') as string;
      const useCustomImage = formData.get('useCustomImage') as string;

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
    } else if (analysisResult && analysisResult.textBlocks) {
      prompt = "Update this Instagram story image by replacing the text content as follows:\n\n";
      
      const changesFound = analysisResult.textBlocks.some((block: any) => block.newContent);
      
      if (!changesFound) {
        return NextResponse.json(
          { error: 'No changes detected in the analysis' },
          { status: 400 }
        );
      }

      analysisResult.textBlocks.forEach((block: any, index: number) => {
        if (block.newContent) {
          prompt += `${block.type}: Replace "${block.originalContent}" with "${block.newContent}"\n`;
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

    // Use FLUX Kontext Pro via Replicate
    console.log('⏳ [DEBUG] Calling FLUX Kontext Pro API...');
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: inputParams
      }
    );

    console.log('\n📥 [DEBUG] FLUX Kontext Pro Response:');
    console.log('✅ [DEBUG] FLUX Kontext Pro Output:', output);
    console.log('✅ [DEBUG] Output Type:', typeof output);
    console.log('✅ [DEBUG] Output Constructor:', output?.constructor?.name);

    // Handle different output formats from FLUX Kontext Pro
    let generatedImageUrl: string;
    
    if (typeof output === 'string') {
      // Direct URL string
      generatedImageUrl = output;
      console.log('✅ [DEBUG] Using direct URL string:', generatedImageUrl);
    } else if (Array.isArray(output) && output.length > 0) {
      // Array of URLs, take the first one
      if (typeof output[0] === 'string') {
        generatedImageUrl = output[0];
        console.log('✅ [DEBUG] Using first URL from array:', generatedImageUrl);
      } else {
        // Handle array of FileOutput objects
        const fileOutput = output[0] as any;
        if (fileOutput && typeof fileOutput.url === 'string') {
          generatedImageUrl = fileOutput.url;
          console.log('✅ [DEBUG] Using URL from FileOutput in array:', generatedImageUrl);
        } else {
          throw new Error('Could not extract URL from array of FileOutput objects');
        }
      }
    } else if (output && typeof output === 'object') {
      // Handle FileOutput object from Replicate
      console.log('✅ [DEBUG] Object keys:', Object.keys(output));
      console.log('✅ [DEBUG] Object prototype:', Object.getPrototypeOf(output));
      console.log('✅ [DEBUG] Object toString:', output.toString());
      
      const outputObj = output as any;
      
      // Try to access the url property directly
      try {
        const urlValue = outputObj.url;
        console.log('✅ [DEBUG] Direct url access:', urlValue, typeof urlValue);
        
        if (urlValue && typeof urlValue === 'string') {
          generatedImageUrl = urlValue;
          console.log('✅ [DEBUG] Using URL from FileOutput object:', generatedImageUrl);
        } else if (outputObj.constructor?.name === 'FileOutput') {
          // For FileOutput objects, try to convert to string or access hidden properties
          console.log('✅ [DEBUG] Attempting to extract URL from FileOutput...');
          
          // Try different approaches to get the URL
          const stringified = String(output);
          console.log('✅ [DEBUG] FileOutput stringified:', stringified);
          
          // Check if it's a URL-like string
          if (stringified.startsWith('http')) {
            generatedImageUrl = stringified;
            console.log('✅ [DEBUG] Using stringified FileOutput as URL:', generatedImageUrl);
          } else {
            // Try to find URL in object descriptor properties
            const descriptors = Object.getOwnPropertyDescriptors(output);
            console.log('✅ [DEBUG] Property descriptors:', Object.keys(descriptors));
            
            if (descriptors.url && descriptors.url.value) {
              generatedImageUrl = descriptors.url.value;
              console.log('✅ [DEBUG] Using URL from property descriptor:', generatedImageUrl);
            } else {
              throw new Error('FLUX Kontext Pro returned a FileOutput object but could not extract the URL. This might require using replicate.files.download() method.');
            }
          }
        } else {
          // Check for other common URL fields
          const possibleUrlFields = ['image_url', 'output_url', 'result', 'data'];
          let foundUrl: string | null = null;
          
          for (const field of possibleUrlFields) {
            if (outputObj[field] && typeof outputObj[field] === 'string') {
              foundUrl = outputObj[field];
              break;
            }
          }
          
          if (foundUrl) {
            generatedImageUrl = foundUrl;
            console.log('✅ [DEBUG] Using URL from field:', foundUrl);
          } else {
            console.error('✅ [DEBUG] Could not find URL in object:', JSON.stringify(output, null, 2));
            throw new Error('Could not extract image URL from FLUX Kontext Pro response');
          }
        }
      } catch (error) {
        console.error('✅ [DEBUG] Error accessing FileOutput properties:', error);
        throw new Error('Failed to access FileOutput URL property');
      }
    } else {
      console.error('✅ [DEBUG] Unexpected output format:', output);
      throw new Error('Unexpected output format from FLUX Kontext Pro');
    }

    console.log('\n🎉 [DEBUG] Successfully processed FLUX Kontext Pro response:');
    console.log('🖼️ Generated Image URL:', generatedImageUrl);
    console.log('✅ [DEBUG] Returning success response to frontend');

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      prompt: prompt,
    });

  } catch (error: any) {
    console.error('Apply changes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply changes' },
      { status: 500 }
    );
  }
} 
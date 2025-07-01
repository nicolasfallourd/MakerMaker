// @Doc
// API route for GENERATING Instagram Story images using Replicate's openai/gpt-image-1 model.
// Accepts an image upload and a custom prompt, returns the generated image URL.
// This route creates new Instagram stories based on input images and prompts.

import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REPLICATE_MODEL_VERSION = '919e1bf061bd37ecb46e7d467ac952029cb5a5a9d195823832f5a17ec69e57d4';

export async function POST(req: NextRequest) {
  try {
    console.log('API Keys check:', {
      hasReplicateToken: !!REPLICATE_API_TOKEN,
      hasOpenAIKey: !!OPENAI_API_KEY,
    });

    if (!REPLICATE_API_TOKEN || !OPENAI_API_KEY) {
      console.error('Missing API keys:', {
        REPLICATE_API_TOKEN: !!REPLICATE_API_TOKEN,
        OPENAI_API_KEY: !!OPENAI_API_KEY,
      });
      return NextResponse.json({ error: 'Missing API keys' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('image');
    const prompt = formData.get('prompt') as string;
    
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    console.log('File received:', file.name, file.type, file.size);
    console.log('Prompt received:', prompt);

    // Upload image to Replicate's blob storage
    const uploadFormData = new FormData();
    uploadFormData.append('content', file);

    const uploadRes = await fetch('https://api.replicate.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const uploadError = await uploadRes.text();
      console.error('Upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    const imageUrl = uploadData.urls?.get;
    console.log('Image uploaded:', imageUrl);

    // Call Replicate API to create prediction
    const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: {
          prompt: prompt,
          openai_api_key: OPENAI_API_KEY,
          input_images: [imageUrl],
          quality: 'auto',
          background: 'auto',
          moderation: 'auto',
          aspect_ratio: '2:3',
        },
      }),
    });

    if (!replicateRes.ok) {
      const replicateError = await replicateRes.text();
      console.error('Replicate API error:', replicateError);
      return NextResponse.json({ error: 'Replicate API error' }, { status: 500 });
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
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
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

    if (result.status === 'succeeded') {
      return NextResponse.json({ 
        success: true, 
        output: result.output,
        imageUrl: result.output?.[0] // Replicate usually returns an array of URLs
      });
    } else if (result.status === 'failed') {
      console.error('Generation failed:', result.error);
      return NextResponse.json({ error: 'Generation failed: ' + result.error }, { status: 500 });
    } else {
      console.error('Generation timed out');
      return NextResponse.json({ error: 'Generation timed out' }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error: ' + errorMessage }, { status: 500 });
  }
} 
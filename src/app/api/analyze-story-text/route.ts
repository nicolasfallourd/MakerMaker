// @Doc
// API route for analyzing Instagram stories using OpenAI GPT-4 Vision via Replicate API
// Takes an image and returns structured JSON analysis of text blocks, typefaces, and colors

import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Missing REPLICATE_API_TOKEN' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    const prompt = `Generate a JSON file to describe the instagram story and the text blocks.
I want to know the type of the text block and what it contains. I also want the typeface and the color of the font.

Example:

{
  "textBlocks": [
    {
      "type": "Title",
      "content": "New Car!",
      "typeface": "Arial",
      "color": "Black"
    },
    {
      "type": "CTA",
      "content": "buy now",
      "typeface": "Arial", 
      "color": "Black"
    },
    {
      "type": "Price",
      "content": "$26888",
      "typeface": "Arial",
      "color": "White"
    }
  ]
}

Please analyze the image and return ONLY the JSON structure with all the text blocks you can identify.`;

    // Debug logging
    console.log('🔍 [DEBUG] Analyzing Instagram Story:');
    console.log('📸 Image URL:', imageUrl);
    console.log('📝 Prompt:', prompt);
    console.log('⚙️  Model: openai/gpt-4o');
    console.log('🔑 OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('🔑 Replicate Token present:', !!process.env.REPLICATE_API_TOKEN);

    // Prepare input parameters
    const inputParams = {
      prompt: prompt,
      image_input: [imageUrl],
      temperature: 0.1,
      system_prompt: "You are a helpful assistant that analyzes images and returns structured JSON data.",
      max_completion_tokens: 1024,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      openai_api_key: process.env.OPENAI_API_KEY,
    };

    console.log('📤 [DEBUG] Sending to Replicate:');
    console.log('🔧 Input Parameters:', JSON.stringify(inputParams, null, 2));

    // Use OpenAI GPT-4o Vision via Replicate with correct input format
    const output = await replicate.run(
      "openai/gpt-4o",
      {
        input: inputParams
      }
    );

    // Process the output from OpenAI GPT-4o
    console.log('Raw output from OpenAI:', output);
    
    let analysisResult;
    let outputString = '';
    
    // Handle different output formats
    if (Array.isArray(output)) {
      // If output is an array of events, join them
      outputString = output.join('');
    } else if (typeof output === 'string') {
      outputString = output;
    } else if (output && typeof output === 'object') {
      // OpenAI might return an object with choices or content
      const outputObj = output as any;
      if (outputObj.choices && outputObj.choices[0] && outputObj.choices[0].message) {
        outputString = outputObj.choices[0].message.content;
      } else if (outputObj.content) {
        outputString = outputObj.content;
      } else {
        outputString = JSON.stringify(output);
      }
    } else {
      outputString = String(output);
    }
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = outputString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, return the raw text
        analysisResult = { rawResponse: outputString };
      }
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      analysisResult = { rawResponse: outputString };
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze story' },
      { status: 500 }
    );
  }
} 
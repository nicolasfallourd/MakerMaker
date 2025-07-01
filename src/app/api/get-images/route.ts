// @Doc
// API route to dynamically scan for available images in public/img folder
// Returns story models and products with their captions

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { STORY_MODEL_CAPTIONS, PRODUCT_CAPTIONS, getCaptionByFilename } from '@/config/image-captions';

export async function GET() {
  try {
    const imgDir = path.join(process.cwd(), 'public', 'img');
    
    // Read all files in the img directory
    const files = fs.readdirSync(imgDir);
    
    // Filter and sort story models
    const storyModels = files
      .filter(file => file.startsWith('story_model_') && file.match(/\.(png|jpg|jpeg)$/i))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
      })
      .map(filename => ({
        path: `/img/${filename}`,
        filename,
        caption: getCaptionByFilename(filename, STORY_MODEL_CAPTIONS)
      }));

    // Filter and sort products
    const products = files
      .filter(file => file.startsWith('product_') && file.match(/\.(png|jpg|jpeg)$/i))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
      })
      .map(filename => ({
        path: `/img/${filename}`,
        filename,
        caption: getCaptionByFilename(filename, PRODUCT_CAPTIONS)
      }));

    return NextResponse.json({
      storyModels,
      products
    });

  } catch (error) {
    console.error('Error scanning images:', error);
    return NextResponse.json({ error: 'Failed to scan images' }, { status: 500 });
  }
} 
// @Doc
// Configuration file for image captions
// Add descriptions for story models and products here

export interface ImageCaption {
  filename: string;
  caption: string;
}

export const STORY_MODEL_CAPTIONS: ImageCaption[] = [
  { filename: 'story_model_1.png', caption: 'Story model 1' },
  { filename: 'story_model_2.png', caption: 'Story model 2' },
  { filename: 'story_model_3.png', caption: 'Story model 3' },
  { filename: 'story_model_4.png', caption: 'Story model 4' },
  { filename: 'story_model_5.png', caption: 'Story model 5' },
  { filename: 'story_model_6.png', caption: 'Story model 6' },
  { filename: 'story_model_7.png', caption: 'Story model 7' },
  { filename: 'story_model_8.png', caption: 'Story model 8' },
];

export const PRODUCT_CAPTIONS: ImageCaption[] = [
  { filename: 'product_1.png', caption: 'A lama plush' },
  { filename: 'product_2.png', caption: 'A woman wearing a black and white dress with geometric patterns, a leather bag and a panama hat' },
  { filename: 'product_3.png', caption: 'a blue velvet armchair' },
  { filename: 'product_4.png', caption: 'Yellow sneakers Adidas' },
  { filename: 'product_5.png', caption: 'A blue backpack with leather details' },
  { filename: 'product_6.png', caption: 'A grey leather handback' },
  { filename: 'product_7.png', caption: 'A webber bbq with accessories' },
  { filename: 'product_8.png', caption: 'A moisturizing lotion' },
];

// Helper function to get caption by filename
export function getCaptionByFilename(filename: string, captions: ImageCaption[]): string {
  const found = captions.find(item => item.filename === filename);
  return found ? found.caption : filename.replace(/\.(png|jpg|jpeg)$/i, '');
} 
// @Doc
// Main page for Instagram Story Generator. Lets user upload two images (story model and product), stitch them together, and generate story using the Replicate API.

'use client';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';

const DEFAULT_PROMPT_TEMPLATE =
  'Create an Instagram Story from this image. Highlight the product (on the right) using the style of the Story (on the left). Do not alter the product, strictly preserve it. Replace the main subject of the left story by the product (on the right). The story should be 9:16 even if the generated image is 2:3 Add white borders on the sides so the image respect the 9:16 format';

interface ImageItem {
  path: string;
  filename: string;
  caption: string;
}

export default function Home() {
  const [storyModels, setStoryModels] = useState<ImageItem[]>([]);
  const [products, setProducts] = useState<ImageItem[]>([]);
  const [storyImage, setStoryImage] = useState<File | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [selectedStoryModel, setSelectedStoryModel] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedProductCaption, setSelectedProductCaption] = useState<string | null>(null);
  const [stitchedImage, setStitchedImage] = useState<string | null>(null);
  const [stitchedBlob, setStitchedBlob] = useState<Blob | null>(null);
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT_TEMPLATE);
  const [result, setResult] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [storyVersions, setStoryVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const [kontextPrompt, setKontextPrompt] = useState('');
  const [customKontextImage, setCustomKontextImage] = useState<File | null>(null);
  const [customKontextPreview, setCustomKontextPreview] = useState<string | null>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const customKontextInputRef = useRef<HTMLInputElement>(null);

  // Update prompt when product selection changes
  useEffect(() => {
    if (selectedProductCaption) {
      const updatedPrompt = DEFAULT_PROMPT_TEMPLATE.replace('[PRODUCT_DESCRIPTION]', selectedProductCaption);
      setPrompt(updatedPrompt);
    } else {
      setPrompt(DEFAULT_PROMPT_TEMPLATE);
    }
  }, [selectedProductCaption]);

  // Fetch available images on component mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/get-images');
        const data = await res.json();
        if (res.ok) {
          setStoryModels(data.storyModels || []);
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error('Failed to fetch images:', err);
      }
    };

    fetchImages();
  }, []);

  // Progress animation effect - adjusted for 75 seconds
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 20) return prev + 0.8; // Slower at beginning
        if (prev < 40) return prev + 0.6; // Medium speed
        if (prev < 70) return prev + 0.4; // Slower
        if (prev < 90) return prev + 0.2; // Very slow
        if (prev < 99) return prev + 0.05; // Extremely slow near end
        return 99; // Stick at 99% until success
      });
    }, 300); // 300ms intervals for smoother animation

    return () => clearInterval(interval);
  }, [loading]);

  // Analysis progress animation effect - adjusted for 4 seconds
  useEffect(() => {
    if (!analyzing) {
      setAnalysisProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev < 30) return prev + 2.5; // Fast at beginning
        if (prev < 60) return prev + 1.5; // Medium speed
        if (prev < 85) return prev + 0.8; // Slower
        if (prev < 95) return prev + 0.3; // Very slow
        if (prev < 99) return prev + 0.1; // Extremely slow near end
        return 99; // Stick at 99% until success
      });
    }, 100); // 100ms intervals for smoother animation

    return () => clearInterval(interval);
  }, [analyzing]);

  // Update Kontext prompt when analysis result changes
  useEffect(() => {
    if (analysisResult && !analysisResult.loading) {
      const newPrompt = generateKontextPrompt(analysisResult);
      setKontextPrompt(newPrompt);
    }
  }, [analysisResult]);

  const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setStoryImage(file);
    setSelectedStoryModel(null); // Clear suggested selection
    if (file) {
      setStoryPreview(URL.createObjectURL(file));
    } else {
      setStoryPreview(null);
    }
    resetResults();
  };

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProductImage(file);
    setSelectedProduct(null); // Clear suggested selection
    setSelectedProductCaption(null); // Clear product caption
    if (file) {
      setProductPreview(URL.createObjectURL(file));
      // For uploaded files, we don't have a caption, so use a generic description
      setSelectedProductCaption('the product');
    } else {
      setProductPreview(null);
      setSelectedProductCaption(null);
    }
    resetResults();
  };

  const selectStoryModel = (imagePath: string) => {
    setSelectedStoryModel(imagePath);
    setStoryImage(null); // Clear uploaded file
    setStoryPreview(imagePath);
    resetResults();
  };

  const selectProduct = (imagePath: string) => {
    const selectedProductItem = products.find(p => p.path === imagePath);
    setSelectedProduct(imagePath);
    setProductImage(null); // Clear uploaded file
    setProductPreview(imagePath);
    setSelectedProductCaption(selectedProductItem?.caption || 'the product');
    resetResults();
  };

  const clearStorySelection = () => {
    setSelectedStoryModel(null);
    setStoryImage(null);
    setStoryPreview(null);
    if (storyInputRef.current) {
      storyInputRef.current.value = '';
    }
    resetResults();
  };

  const clearProductSelection = () => {
    setSelectedProduct(null);
    setProductImage(null);
    setProductPreview(null);
    setSelectedProductCaption(null);
    if (productInputRef.current) {
      productInputRef.current.value = '';
    }
    resetResults();
  };

  const resetResults = () => {
    setStitchedImage(null);
    setStitchedBlob(null);
    setResult(null);
    setGeneratedImageUrl(null);
    setError(null);
    setAnalysisResult(null);
    setSaved(false);
    setAnalysisProgress(0);
    setEditingBlock(null);
    setEditText('');
    setApplyingChanges(false);
    setStoryVersions([]);
    setCurrentVersion(0);
    setKontextPrompt('');
    setCustomKontextImage(null);
    setCustomKontextPreview(null);
  };

  const stitchImages = async () => {
    if (!storyPreview || !productPreview) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // Set canvas size - combined width, same height
      canvas.width = 2160; // 1080 * 2
      canvas.height = 1920;

      const storyImg = new Image();
      const productImg = new Image();

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          storyImg.onload = () => resolve();
          storyImg.onerror = reject;
          storyImg.src = storyPreview;
        }),
        new Promise<void>((resolve, reject) => {
          productImg.onload = () => resolve();
          productImg.onerror = reject;
          productImg.src = productPreview;
        })
      ]);

      // Draw story image on the left
      ctx.drawImage(storyImg, 0, 0, 1080, 1920);
      
      // Draw product image on the right
      ctx.drawImage(productImg, 1080, 0, 1080, 1920);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const stitchedUrl = URL.createObjectURL(blob);
          setStitchedImage(stitchedUrl);
          setStitchedBlob(blob);
        }
      }, 'image/jpeg', 0.9);

    } catch (err: any) {
      setError('Failed to stitch images: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stitchedBlob) return;
    
    setLoading(true);
    setProgress(0);
    setResult(null);
    setGeneratedImageUrl(null);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('image', stitchedBlob, 'stitched-image.jpg');
      formData.append('prompt', prompt);
      
      const res = await fetch('/api/generate-story', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Unknown error');
      }
      
      // Complete the progress bar
      setProgress(100);
      
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setStoryVersions([data.imageUrl]); // Initialize with first version
        setCurrentVersion(0);
        setResult('Image generated successfully!');
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeStory = async () => {
    if (!generatedImageUrl) return;
    
    setAnalyzing(true);
    setAnalysisProgress(0);
    setError(null);
    // Show the analysis block immediately with loader
    setAnalysisResult({ loading: true });
    
    try {
      const res = await fetch('/api/analyze-story-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: generatedImageUrl
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze story');
      }
      
      // Complete the progress bar
      setAnalysisProgress(100);
      
      // Set the actual result after a brief delay
      setTimeout(() => {
        setAnalysisResult(data.analysis);
      }, 200);
      
    } catch (err: any) {
      setError('Failed to analyze story: ' + err.message);
      setAnalysisResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveStory = async () => {
    if (!generatedImageUrl) return;
    
    try {
      // Fetch the image and convert to blob
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'instagram-story.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      // Show "Saved!" for 2 seconds
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to download image:', err);
      setError('Failed to download image');
    }
  };

  const handleEditBlock = (index: number, currentContent: string) => {
    setEditingBlock(index);
    setEditText(currentContent);
  };

  const handleSaveEdit = () => {
    if (editingBlock !== null && analysisResult?.textBlocks) {
      const updatedBlocks = [...analysisResult.textBlocks];
      updatedBlocks[editingBlock] = {
        ...updatedBlocks[editingBlock],
        newContent: editText,
        originalContent: updatedBlocks[editingBlock].originalContent || updatedBlocks[editingBlock].content
      };
      setAnalysisResult({
        ...analysisResult,
        textBlocks: updatedBlocks
      });
    }
    setEditingBlock(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingBlock(null);
    setEditText('');
  };

  const handleCustomKontextImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCustomKontextImage(file);
    if (file) {
      setCustomKontextPreview(URL.createObjectURL(file));
    } else {
      setCustomKontextPreview(null);
    }
  };

  const clearCustomKontextImage = () => {
    setCustomKontextImage(null);
    setCustomKontextPreview(null);
    if (customKontextInputRef.current) {
      customKontextInputRef.current.value = '';
    }
  };

  const generateKontextPrompt = (analysisResult: any) => {
    if (!analysisResult?.textBlocks) return '';
    
    let prompt = "Update this Instagram story image by replacing the text content as follows:\n\n";
    
    const hasChanges = analysisResult.textBlocks.some((block: any) => block.newContent);
    
    if (!hasChanges) {
      return "No changes detected. Please edit some text blocks first.";
    }

    analysisResult.textBlocks.forEach((block: any) => {
      if (block.newContent) {
        prompt += `${block.type}: Replace "${block.originalContent}" with "${block.newContent}"\n`;
      }
    });

    prompt += "\nMaintain the same visual style, layout, colors, and typography. Only change the text content as specified. Keep the same aspect ratio and overall design aesthetic.";
    
    return prompt;
  };

  const handleApplyChanges = async () => {
    if ((!generatedImageUrl && !customKontextImage) || !kontextPrompt.trim()) return;
    
    setApplyingChanges(true);
    setError(null);
    
    try {
      let requestBody;
      
      if (customKontextImage) {
        // If custom image is uploaded, use FormData
        const formData = new FormData();
        formData.append('customImage', customKontextImage);
        formData.append('customPrompt', kontextPrompt);
        formData.append('useCustomImage', 'true');
        
        const res = await fetch('/api/apply-changes', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to apply changes');
        }
        
        if (data.success && data.imageUrl) {
          // Add new version to the array
          const newVersions = [...storyVersions, data.imageUrl];
          setStoryVersions(newVersions);
          setCurrentVersion(newVersions.length - 1);
          setGeneratedImageUrl(data.imageUrl);
          
          // Clear the analysis result to force re-analysis if needed
          setAnalysisResult(null);
        }
      } else {
        // Use original generated image URL
        const res = await fetch('/api/apply-changes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: generatedImageUrl,
            analysisResult: analysisResult,
            customPrompt: kontextPrompt
          }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to apply changes');
        }
        
        if (data.success && data.imageUrl) {
          // Add new version to the array
          const newVersions = [...storyVersions, data.imageUrl];
          setStoryVersions(newVersions);
          setCurrentVersion(newVersions.length - 1);
          setGeneratedImageUrl(data.imageUrl);
          
          // Clear the analysis result to force re-analysis if needed
          setAnalysisResult(null);
        }
      }
      
    } catch (err: any) {
      setError('Failed to apply changes: ' + err.message);
    } finally {
      setApplyingChanges(false);
    }
  };

  const canStitch = (storyImage || selectedStoryModel) && (productImage || selectedProduct);
  const canGenerate = stitchedBlob && !loading;
  const canAnalyze = generatedImageUrl && !analyzing;

  return (
    <div className="min-h-screen p-4">
      <form
        className="w-full max-w-7xl mx-auto flex flex-col gap-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-2xl font-bold text-center mb-2">Instagram Story Generator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Story Model Section */}
          <div>
            <label className="block text-lg font-medium mb-4">Story Model Image (1080x1920)</label>
            
            <Input
              ref={storyInputRef}
              type="file"
              accept="image/*"
              onChange={handleStoryImageChange}
              className="mb-4"
            />
            
            {storyPreview && (
              <Card className="mb-4 relative">
                <CardContent className="p-4">
                  <div className="relative">
                    <img
                      src={storyPreview}
                      alt="Story Preview"
                      className="w-full rounded-lg object-contain max-h-32 border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearStorySelection}
                      className="absolute top-2 right-2 h-6 w-6 p-0 bg-white/80 hover:bg-white"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-zinc-600">
                      {selectedStoryModel ? 'Selected from suggestions' : 'Uploaded image'}
                    </p>
                    {selectedStoryModel && (
                      <button
                        type="button"
                        onClick={clearStorySelection}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        remove
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div>
              <p className="text-sm font-medium mb-2">Or choose from suggestions:</p>
              <div className="grid grid-cols-4 gap-2">
                {storyModels.map((image, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      selectedStoryModel === image.path ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => selectStoryModel(image.path)}
                  >
                    <CardContent className="p-1">
                      <img
                        src={image.path}
                        alt={image.caption}
                        className="w-full rounded object-cover aspect-[9/16]"
                      />
                      <p className="text-xs text-center mt-1 text-zinc-600 truncate">
                        {image.caption}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          
          {/* Product Section */}
          <div>
            <label className="block text-lg font-medium mb-4">Product Image (1080x1920)</label>
            
            <Input
              ref={productInputRef}
              type="file"
              accept="image/*"
              onChange={handleProductImageChange}
              className="mb-4"
            />
            
            {productPreview && (
              <Card className="mb-4 relative">
                <CardContent className="p-4">
                  <div className="relative">
                    <img
                      src={productPreview}
                      alt="Product Preview"
                      className="w-full rounded-lg object-contain max-h-32 border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearProductSelection}
                      className="absolute top-2 right-2 h-6 w-6 p-0 bg-white/80 hover:bg-white"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-zinc-600">
                      {selectedProduct ? 'Selected from suggestions' : 'Uploaded image'}
                    </p>
                    {selectedProduct && (
                      <button
                        type="button"
                        onClick={clearProductSelection}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        remove
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div>
              <p className="text-sm font-medium mb-2">Or choose from suggestions:</p>
              <div className="grid grid-cols-4 gap-2">
                {products.map((image, index) => (
                  <Card 
                    key={index}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      selectedProduct === image.path ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => selectProduct(image.path)}
                  >
                    <CardContent className="p-1">
                      <img
                        src={image.path}
                        alt={image.caption}
                        className="w-full rounded object-cover aspect-[9/16]"
                      />
                      <p className="text-xs text-center mt-1 text-zinc-600 truncate">
                        {image.caption}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button 
          type="button" 
          onClick={stitchImages} 
          disabled={!canStitch}
          className="w-full"
        >
          Stitch Images Together
        </Button>

        {stitchedImage && (
          <div>
            <label className="block text-sm font-medium mb-2">Stitched Image</label>
            <img
              src={stitchedImage}
              alt="Stitched Preview"
              className="w-full rounded-lg border max-h-96 object-contain mx-auto"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">Prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="resize-none"
            rows={6}
            placeholder="Enter your prompt here..."
          />
          {selectedProductCaption && (
            <p className="text-xs text-zinc-500 mt-1">
              Product description: "{selectedProductCaption}" will be inserted into [PRODUCT_DESCRIPTION]
            </p>
          )}
        </div>
        
        <Button type="submit" disabled={!canGenerate} className="w-full">
          {loading ? 'Generating...' : 'Create Instagram Story'}
        </Button>
        
        {loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Generating Instagram Story</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
        
        {generatedImageUrl && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Generated Story Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Generated Instagram Story</label>
                {storyVersions.length > 1 && (
                  <span className="text-xs text-gray-500">
                    Version {currentVersion + 1} of {storyVersions.length}
                  </span>
                )}
              </div>
              
              {applyingChanges && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                    <span>Applying changes with FLUX Kontext Pro...</span>
                  </div>
                </div>
              )}
              
              <img
                src={generatedImageUrl}
                alt="Generated Story"
                className="w-full rounded-lg border max-h-96 object-contain mx-auto"
              />
              <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                <a
                  href={generatedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Open full size
                </a>
                {storyVersions.length > 0 && (
                  <div className="flex items-center gap-2">
                    {storyVersions.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setGeneratedImageUrl(storyVersions[index]);
                          setCurrentVersion(index);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          currentVersion === index
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Version {index + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button 
                  onClick={handleAnalyzeStory} 
                  disabled={!canAnalyze}
                  className="flex-1"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze the Story'}
                </Button>
                <Button 
                  type="button"
                  onClick={handleSaveStory} 
                  disabled={!generatedImageUrl}
                  variant="outline"
                  className="flex-1"
                >
                  {saved ? 'Saved!' : 'Save the Story'}
                </Button>
              </div>
            </div>
            
            {/* Analysis Results Section */}
            {analysisResult && (
              <div>
                <label className="block text-sm font-medium mb-1">Story Analysis</label>
                <Card>
                  <CardContent className="p-4">
                    {analysisResult.loading ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span>Analyzing Story</span>
                          <span>{Math.round(analysisProgress)}%</span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${analysisProgress}%` }}
                          />
                        </div>
                        <div className="text-center text-sm text-gray-600">
                          Extracting text blocks from your Instagram story...
                        </div>
                      </div>
                    ) : analysisResult.textBlocks ? (
                      <div className="space-y-3">
                        {analysisResult.textBlocks.map((block: any, index: number) => (
                          <div key={index} className="border-b pb-2 last:border-b-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {block.newContent ? (
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-2 text-sm">
                                      <span className="font-medium text-green-600">New {block.type}:</span>
                                      <span className="text-gray-800">"{block.newContent}"</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                      <span className="font-medium text-blue-600">Current {block.type}:</span>
                                      <span className="text-gray-600">"{block.originalContent}"</span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-1">
                                      <span>Typeface: {block.typeface}</span>
                                      <span>Color: {block.color}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                      <span className="font-medium text-blue-600">{block.type}:</span>
                                      <span className="text-gray-800">"{block.content}"</span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-1">
                                      <span>Typeface: {block.typeface}</span>
                                      <span>Color: {block.color}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditBlock(index, block.newContent || block.content)}
                                className="h-6 px-2 text-xs"
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium mb-2">Raw Analysis:</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(analysisResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Kontext Pro Prompt Box */}
                {analysisResult.textBlocks && !analysisResult.loading && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      FLUX Kontext Pro Prompt (Editable)
                    </label>
                    <Textarea
                      value={kontextPrompt}
                      onChange={(e) => setKontextPrompt(e.target.value)}
                      className="resize-none bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      rows={8}
                      placeholder="The prompt that will be sent to FLUX Kontext Pro..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Edit this prompt to customize how FLUX Kontext Pro will modify your image
                    </p>
                  </div>
                )}

                {/* Custom Image Upload for Kontext */}
                {analysisResult.textBlocks && !analysisResult.loading && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      Custom Image (Optional)
                    </label>
                    <div className="space-y-3">
                      <Input
                        ref={customKontextInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCustomKontextImageChange}
                        className="w-full"
                      />
                      {customKontextPreview && (
                        <Card className="relative">
                          <CardContent className="p-4">
                            <div className="relative">
                              <img
                                src={customKontextPreview}
                                alt="Custom Kontext Preview"
                                className="w-full rounded-lg object-contain max-h-32 border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearCustomKontextImage}
                                className="absolute top-2 right-2 h-6 w-6 p-0 bg-white/80 hover:bg-white"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm text-zinc-600">
                                Custom image for FLUX Kontext Pro
                              </p>
                              <button
                                type="button"
                                onClick={clearCustomKontextImage}
                                className="text-sm text-red-600 hover:text-red-800 underline"
                              >
                                remove
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <p className="text-xs text-gray-500">
                        {customKontextImage 
                          ? "Using custom uploaded image instead of generated story" 
                          : "If no custom image is uploaded, the generated Instagram story will be used"
                        }
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Apply Changes Button */}
                {analysisResult.textBlocks && !analysisResult.loading && (
                  <Button 
                    type="button"
                    onClick={handleApplyChanges}
                    disabled={applyingChanges || !kontextPrompt.trim() || (!generatedImageUrl && !customKontextImage)}
                    className="w-full mt-3"
                    variant="outline"
                  >
                    {applyingChanges ? 'Applying Changes...' : 'Apply Changes'}
                  </Button>
                )}
                
                {/* Show which image will be used */}
                {analysisResult.textBlocks && !analysisResult.loading && (
                  <p className="text-xs text-center text-gray-500 mt-2">
                    {customKontextImage 
                      ? "Will use your custom uploaded image" 
                      : "Will use the generated Instagram story"
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        {result && !generatedImageUrl && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Result</label>
            <Textarea
              value={result}
              readOnly
              className="resize-none bg-zinc-100 dark:bg-zinc-800"
              rows={6}
            />
          </div>
        )}
      </form>
      
      {/* Edit Dialog */}
      {editingBlock !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4">Edit Text Block</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Content:</label>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="resize-none"
                  rows={3}
                  placeholder="Enter new text content..."
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleSaveEdit}
                  className="flex-1"
                >
                  Save
                </Button>
                <Button 
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

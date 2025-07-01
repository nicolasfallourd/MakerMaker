# 📱 MakerMaker - Instagram Story Generator

An AI-powered Instagram Story Generator that combines story templates with product images using advanced AI models. Generate, analyze, and edit Instagram stories with intelligent text recognition and modification capabilities.

![Instagram Story Generator](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Replicate](https://img.shields.io/badge/Replicate-FF6B6B?style=for-the-badge&logo=ai&logoColor=white)

## ✨ Features

### 🎨 Story Generation
- **AI-Powered Creation**: Uses OpenAI's GPT-Image-1 model via Replicate API
- **Template System**: 8 story model templates + 8 product images
- **Custom Prompts**: Add your own creative prompts for unique stories
- **9:16 Aspect Ratio**: Perfect Instagram story dimensions

### 🧠 AI Analysis & Editing
- **Story Analysis**: GPT-4o analyzes generated stories and extracts text content
- **Interactive Editing**: Click to edit any detected text block
- **Version Management**: Track multiple versions of your stories
- **Smart Prompts**: Auto-generated prompts for text modifications

### 🔧 Advanced Capabilities
- **FLUX Kontext Pro**: Apply text changes using state-of-the-art image editing
- **Custom Image Upload**: Use your own images with AI editing
- **Download & Save**: One-click download of generated stories
- **Real-time Processing**: Live progress indicators and status updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Replicate API account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/nicolasfallourd/MakerMaker.git
   cd MakerMaker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   # Required API Keys
   REPLICATE_API_TOKEN=your_replicate_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional (for future features)
   ANTHROPIC_API_KEY=your_anthropic_key_here
   KONTEXT_API_KEY=your_kontext_key_here
   BFL_API_KEY=your_bfl_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **AI Models**: 
  - OpenAI GPT-Image-1 (Story Generation)
  - OpenAI GPT-4o (Image Analysis)
  - FLUX Kontext Pro (Image Editing)
- **API**: Replicate Platform
- **Deployment**: Vercel

## 📖 How It Works

### 1. Story Generation
```typescript
// Upload product image → AI combines with story template → Generate Instagram story
const story = await generateStory(productImage, prompt);
```

### 2. Story Analysis
```typescript
// Analyze generated story → Extract text blocks → Enable editing
const analysis = await analyzeStory(storyImageUrl);
```

### 3. Apply Changes
```typescript
// Edit text → Generate FLUX prompt → Create new version
const updatedStory = await applyChanges(imageUrl, changes, prompt);
```

## 🎯 Use Cases

- **E-commerce**: Create product stories for Instagram marketing
- **Content Creation**: Generate branded story content at scale
- **Social Media Management**: Streamline story creation workflow
- **Design Iteration**: Quickly test different text variations
- **Brand Consistency**: Maintain visual style while updating content

## 🔑 API Endpoints

- `POST /api/generate-story` - Generate new Instagram story
- `POST /api/analyze-story-text` - Analyze story text content
- `POST /api/apply-changes` - Apply text modifications
- `GET /api/get-images` - Fetch available templates

## 📁 Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main application
├── components/
│   └── ui/            # Shadcn UI components
├── config/
│   └── image-captions.ts  # Template configurations
└── lib/
    └── utils.ts       # Utility functions
```

## 🚀 Deployment

### Deploy to Vercel

1. **Connect to Vercel**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all API keys from `.env.local`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Environment Variables for Production
```env
REPLICATE_API_TOKEN=r8_your_token_here
OPENAI_API_KEY=sk-your_key_here
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Replicate](https://replicate.com/) for AI model hosting
- [OpenAI](https://openai.com/) for GPT models
- [Black Forest Labs](https://blackforestlabs.ai/) for FLUX Kontext Pro
- [Shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Vercel](https://vercel.com/) for seamless deployment

## 📧 Contact

Nicolas Fallourd - [@nicolasfallourd](https://github.com/nicolasfallourd)

Project Link: [https://github.com/nicolasfallourd/MakerMaker](https://github.com/nicolasfallourd/MakerMaker)

---

**Built with ❤️ for the creator economy**

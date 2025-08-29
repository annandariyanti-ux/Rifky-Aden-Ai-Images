import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

// Initialize the Google AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type AspectRatio = '1:1' | '16:9' | '9:16';

// --- Image Editor Component ---
interface ImageEditorProps {
  imageUrl: string;
  onSave: (newImageUrl: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onSave, onCancel }) => {
    const [rotation, setRotation] = useState(0);
    const [filter, setFilter] = useState('none');
    const imageRef = useRef<HTMLImageElement>(null);

    const handleSaveChanges = () => {
        const img = imageRef.current;
        if (!img) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = imageUrl;
        image.onload = () => {
            const originalWidth = image.width;
            const originalHeight = image.height;

            // Adjust canvas size for rotation
            if (rotation === 90 || rotation === 270) {
                canvas.width = originalHeight;
                canvas.height = originalWidth;
            } else {
                canvas.width = originalWidth;
                canvas.height = originalHeight;
            }

            // Apply filter
            ctx.filter = filter;

            // Translate and rotate context
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rotation * Math.PI / 180);

            // Draw image
            ctx.drawImage(image, -originalWidth / 2, -originalHeight / 2);

            onSave(canvas.toDataURL('image/jpeg'));
        };
    };

    const handleRotate = (degrees: number) => {
        setRotation((prev) => (prev + degrees + 360) % 360);
    };

    const filters = [
        { name: 'Reset', value: 'none' },
        { name: 'Grayscale', value: 'grayscale(100%)' },
        { name: 'Sepia', value: 'sepia(100%)' },
        { name: 'Invert', value: 'invert(100%)' },
    ];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
                <div className="p-6">
                    <h2 id="editor-title" className="text-2xl font-bold text-white mb-4">Image Editor</h2>
                    <div className="flex justify-center items-center bg-slate-950/50 rounded-xl p-4 mb-6 overflow-hidden">
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="Editing preview"
                            className="max-w-full max-h-[50vh] transition-transform duration-300 rounded-lg"
                            style={{ transform: `rotate(${rotation}deg)`, filter: filter }}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">Rotate</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleRotate(-90)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Left 90°</button>
                                <button onClick={() => handleRotate(90)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Right 90°</button>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">Filters</h3>
                             <div className="grid grid-cols-2 gap-2">
                                {filters.map(f => (
                                    <button
                                        key={f.name}
                                        onClick={() => setFilter(f.value)}
                                        className={`font-bold py-2 px-4 rounded-lg transition-colors ${filter === f.value ? 'bg-purple-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 flex justify-end gap-4">
                    <button onClick={onCancel} className="bg-slate-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 transition-colors">Cancel</button>
                    <button onClick={handleSaveChanges} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors">Save Changes</button>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [shareStatus, setShareStatus] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);


  const handleGenerateImage = async () => {
    if (isLoading || !prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setImageUrl('');
    setShareStatus('');

    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
      });

      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      const dataUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
      setImageUrl(dataUrl);

    } catch (e) {
      console.error(e);
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `rifky-aden-ai-${Date.now()}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareImage = async () => {
      if (!imageUrl) return;
      setShareStatus(''); 

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `rifky-aden-ai-${Date.now()}.jpeg`, { type: blob.type });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'AI Generated Image',
            text: `Check out this image I generated with Rifky Aden AI. Prompt: "${prompt}"`,
            files: [file],
          });
        } else if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
          setShareStatus('Image copied to clipboard!');
          setTimeout(() => setShareStatus(''), 3000);
        } else {
          setShareStatus('Sharing is not supported on your browser.');
           setTimeout(() => setShareStatus(''), 3000);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
            setShareStatus('Could not share image.');
            setTimeout(() => setShareStatus(''), 3000);
        }
      }
    };
    
    const handleSaveEdits = (newImageUrl: string) => {
        setImageUrl(newImageUrl);
        setIsEditing(false);
    };


  const AspectRatioButton: React.FC<{ value: AspectRatio; label: string }> = ({ value, label }) => (
    <button
      onClick={() => setAspectRatio(value)}
      disabled={isLoading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
        aspectRatio === value
          ? 'bg-purple-600 text-white'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
      aria-pressed={aspectRatio === value}
    >
      {label}
    </button>
  );

  const LoadingIndicator: React.FC<{ aspectRatio: AspectRatio }> = ({ aspectRatio }) => (
    <div
        className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 p-4 relative overflow-hidden"
        style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
    >
        <div className="absolute inset-0 bg-slate-800 animate-pulse rounded-2xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
            <svg
                className="h-16 w-16 mb-4 text-purple-400 animate-spin"
                style={{ animationDuration: '2s' }}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                ></circle>
                <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>
            <p className="font-semibold text-slate-400">Innallaha ma'ashobirin</p>
            <p className="text-sm text-slate-500 mt-1">Allah bersama orang-orang sabar</p>
        </div>
    </div>
  );

  const InitialPlaceholder: React.FC<{ aspectRatio: AspectRatio }> = ({ aspectRatio }) => (
      <div
          className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl flex items-center justify-center text-slate-500"
          style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
      >
          <p>Your generated image will appear here.</p>
      </div>
  );


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-2xl text-center mb-8 flex flex-col items-center gap-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#A78BFA'}} />
                    <stop offset="100%" style={{stopColor: '#F472B6'}} />
                </linearGradient>
            </defs>
            <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="url(#iconGradient)" fillOpacity="0.2"/>
            <path d="M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17" stroke="url(#iconGradient)" strokeWidth="1.5" strokeLinecap="round" transform="rotate(45 12 12)"/>
            <path d="M16 12C16 9.79086 14.2091 8 12 8" stroke="url(#iconGradient)" strokeWidth="1.5" strokeLinecap="round" transform="rotate(45 12 12)"/>
        </svg>
        <div>
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Rifky Aden AI
            </h1>
            <p className="text-slate-400 mt-2">
            Wujudkan ide liar elu namun jangan yang melanggar agama, Allah maha melihat
            </p>
        </div>
      </header>

      <main className="w-full max-w-2xl">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl shadow-purple-500/10">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A futuristic cityscape at sunset, with flying cars"
            className="w-full h-24 p-4 bg-slate-800/80 rounded-xl border-2 border-slate-700/50 focus:border-purple-500 focus:ring-0 focus:outline-none resize-none transition-all duration-300 placeholder-slate-500 text-slate-200"
            disabled={isLoading}
            aria-label="Image generation prompt"
          />
          <div className="mt-4 flex justify-center space-x-2" role="group" aria-label="Aspect Ratio">
            <AspectRatioButton value="1:1" label="Square (1:1)" />
            <AspectRatioButton value="16:9" label="Landscape (16:9)" />
            <AspectRatioButton value="9:16" label="Portrait (9:16)" />
          </div>
          <button
            onClick={handleGenerateImage}
            disabled={isLoading || !prompt.trim()}
            className="mt-6 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-pink-500/30"
          >
            {isLoading ? 'Generating...' : 'Generate Image'}
          </button>
        </div>

        {error && (
          <div className="mt-6 bg-red-900/50 text-red-300 p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="mt-8 w-full flex flex-col items-center gap-4">
          {isLoading ? (
            <LoadingIndicator aspectRatio={aspectRatio} />
          ) : imageUrl ? (
            <>
              {isEditing && (
                  <ImageEditor 
                    imageUrl={imageUrl} 
                    onSave={handleSaveEdits} 
                    onCancel={() => setIsEditing(false)} 
                  />
              )}
              <div 
                className="w-full rounded-2xl shadow-2xl shadow-pink-500/20 overflow-hidden bg-slate-900/50 animate-fade-in-scale-up"
                style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
              >
                <img
                  src={imageUrl}
                  alt="Generated by AI"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-4 mt-2">
                 <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 text-slate-300 font-semibold py-2 px-5 rounded-lg hover:bg-slate-700/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-yellow-500 transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L13.196 7.196z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 text-slate-300 font-semibold py-2 px-5 rounded-lg hover:bg-slate-700/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-all duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  Save
                </button>
                 <button
                  onClick={handleShareImage}
                  className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 text-slate-300 font-semibold py-2 px-5 rounded-lg hover:bg-slate-700/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4m0 0l-4 4m4-4v12" />
                  </svg>
                  Share
                </button>
              </div>
              {shareStatus && (
                <p className="text-sm text-slate-400 mt-2 h-5">{shareStatus}</p>
              )}
            </>
          ) : (
            <InitialPlaceholder aspectRatio={aspectRatio} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

import React, { useState, useRef } from 'react';
import { FileText, Wand2, Sparkles, ArrowRight, X, Upload } from 'lucide-react';

interface NewsInputProps {
  value: string;
  onChange: (val: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled: boolean;
  precisionMode: boolean;
  onTogglePrecisionMode: () => void;
  onGenerateExample: (topic: string) => Promise<void>;
  onParseFile: (mimeType: string, base64Data: string) => Promise<void>;
}

export const NewsInput: React.FC<NewsInputProps> = ({ 
  value, 
  onChange, 
  onGenerate, 
  isGenerating,
  disabled,
  precisionMode,
  onTogglePrecisionMode,
  onGenerateExample,
  onParseFile
}) => {
  const [showExampleInput, setShowExampleInput] = useState(false);
  const [exampleTopic, setExampleTopic] = useState('');
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExampleSubmit = async () => {
    if (!exampleTopic.trim()) return;
    
    setIsGeneratingExample(true);
    try {
      await onGenerateExample(exampleTopic);
      setShowExampleInput(false);
      setExampleTopic('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingExample(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleExampleSubmit();
    } else if (e.key === 'Escape') {
      setShowExampleInput(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Check for text types we can read directly
      const textTypes = ['text/plain', 'text/markdown', 'application/json', 'text/csv', 'text/html'];
      if (textTypes.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        onChange(text);
      } else {
        // Handle binary files (PDF, Images) via Gemini
        const reader = new FileReader();
        reader.onload = async () => {
          const base64String = (reader.result as string).split(',')[1];
          await onParseFile(file.type || 'application/pdf', base64String);
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
        return; // Return here to avoid setting isUploading false too early
      }
    } catch (error) {
      console.error("Error reading file:", error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".txt,.md,.json,.csv,.pdf,.png,.jpg,.jpeg"
      />
      
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <FileText className="w-4 h-4" />
          News Articles / Source Text
        </label>
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
           {/* Upload Button */}
           <button
             onClick={triggerFileUpload}
             disabled={disabled || isUploading}
             className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium transition-colors disabled:opacity-50"
           >
             {isUploading ? (
               <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
             ) : (
               <Upload className="w-3.5 h-3.5" />
             )}
             Upload File
           </button>

           <div className="w-px h-4 bg-slate-700 hidden sm:block"></div>

           {/* Example Input Logic */}
           {showExampleInput ? (
             <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
               <input
                 type="text"
                 value={exampleTopic}
                 onChange={(e) => setExampleTopic(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder="Enter topic (e.g. AI, Space)"
                 className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-40"
                 autoFocus
                 disabled={isGeneratingExample}
               />
               <button
                 onClick={handleExampleSubmit}
                 disabled={isGeneratingExample || !exampleTopic.trim()}
                 className="p-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
               >
                 {isGeneratingExample ? (
                   <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 ) : (
                   <ArrowRight className="w-3 h-3" />
                 )}
               </button>
               <button
                 onClick={() => setShowExampleInput(false)}
                 disabled={isGeneratingExample}
                 className="p-1 text-slate-400 hover:text-white"
               >
                 <X className="w-3 h-3" />
               </button>
             </div>
           ) : (
             <button
              onClick={() => setShowExampleInput(true)}
              disabled={disabled || isUploading}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50 hover:underline"
            >
              Try Example
            </button>
           )}
          
          <div className="w-px h-4 bg-slate-700 hidden sm:block"></div>

           <button
            onClick={onTogglePrecisionMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              precisionMode 
                ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {precisionMode ? "Precision Mode: On" : "Precision Mode: Off"}
          </button>
          <span className="text-xs text-slate-500 hidden sm:inline">
            {value.length} chars
          </span>
        </div>
      </div>
      
      <div className="relative group">
        <textarea
          className="w-full h-64 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none font-serif leading-relaxed"
          placeholder={isUploading ? "Reading file content..." : "Paste your news articles, blog posts, or daily briefing text here..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isUploading}
        />
        <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
        
        {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-blue-400">Extracting content...</p>
                </div>
            </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onGenerate}
          disabled={disabled || !value.trim() || isUploading}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg
            ${disabled || !value.trim() || isUploading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-900/50 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Producing Broadcast...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>
                {precisionMode ? 'Draft Script' : 'Generate Broadcast'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
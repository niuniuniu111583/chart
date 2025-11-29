import React, { useState } from 'react';
import { Header } from './components/Header';
import { NewsInput } from './components/NewsInput';
import { AudioPlayer } from './components/AudioPlayer';
import { generateNewsScript, generateSpeechFromScript, generateExampleNews, extractTextFromFile } from './services/gemini';
import { VoiceName } from './types';

export const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false); // Specific for audio gen
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [error, setError] = useState<string | null>(null);
  
  // Precision Mode State
  const [precisionMode, setPrecisionMode] = useState<boolean>(false);

  // Helper to generate audio from script
  const synthesizeAudio = async (scriptToRead: string, voice: VoiceName) => {
    setIsSynthesizing(true);
    setError(null);
    try {
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await generateSpeechFromScript(scriptToRead, voice, tempCtx);
      setAudioBuffer(buffer);
      await tempCtx.close();
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate audio. " + (err.message || ""));
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setError(null);
    setAudioBuffer(null);
    setGeneratedScript('');

    try {
      // Step 1: Generate Script
      const script = await generateNewsScript(inputText);
      setGeneratedScript(script);

      // Step 2: Generate Speech
      // If Precision Mode is ON, we stop here and wait for user confirmation.
      // If OFF, we proceed immediately.
      if (!precisionMode) {
        await synthesizeAudio(script, selectedVoice);
      }

    } catch (err: any) {
      console.error(err);
      setError("Failed to generate broadcast. Please try again. " + (err.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmScript = async () => {
    if (generatedScript) {
        await synthesizeAudio(generatedScript, selectedVoice);
    }
  };
  
  const handleGenerateExample = async (topic: string) => {
    setIsProcessing(true);
    setError(null);
    try {
        const exampleText = await generateExampleNews(topic);
        setInputText(exampleText);
    } catch (err: any) {
        console.error(err);
        setError("Failed to generate example content. " + (err.message || ""));
    } finally {
        setIsProcessing(false);
    }
  };

  const handleParseFile = async (mimeType: string, base64Data: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const text = await extractTextFromFile(mimeType, base64Data);
      // Append or replace? Let's replace to keep it clean, user can copy-paste if they want to merge.
      // Or maybe check if empty?
      // Simple UX: Replace value.
      setInputText(text);
    } catch (err: any) {
      console.error(err);
      setError("Failed to extract text from file. " + (err.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  // If the user changes voice AFTER generating text
  const handleVoiceChange = async (newVoice: VoiceName) => {
    setSelectedVoice(newVoice);
    // Only auto-regenerate if we have a buffer (meaning we've already done the initial generation)
    // If we are in precision mode and just staring at the script, changing voice shouldn't trigger gen until confirmed.
    if (generatedScript && audioBuffer && !isSynthesizing) {
       await synthesizeAudio(generatedScript, newVoice);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <Header />
        
        <main className="space-y-12">
          {/* Input Section */}
          <section>
            <NewsInput 
              value={inputText}
              onChange={setInputText}
              onGenerate={handleGenerate}
              isGenerating={isProcessing}
              disabled={isProcessing || isSynthesizing}
              precisionMode={precisionMode}
              onTogglePrecisionMode={() => setPrecisionMode(!precisionMode)}
              onGenerateExample={handleGenerateExample}
              onParseFile={handleParseFile}
            />
          </section>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm animate-in fade-in">
              {error}
            </div>
          )}

          {/* Output Section */}
          {(generatedScript || isProcessing) && (
            <section className="border-t border-slate-800 pt-12">
               <AudioPlayer 
                 script={generatedScript || "Generating script..."}
                 audioBuffer={audioBuffer}
                 selectedVoice={selectedVoice}
                 onVoiceChange={handleVoiceChange}
                 onScriptChange={setGeneratedScript}
                 onConfirmScript={handleConfirmScript}
                 isGeneratingAudio={isSynthesizing}
                 allowScriptEdit={true}
               />
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
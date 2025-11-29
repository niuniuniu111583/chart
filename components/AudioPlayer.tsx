import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, Mic2, Edit3, CheckCircle2 } from 'lucide-react';
import { VoiceName } from '../types';

interface AudioPlayerProps {
  script: string;
  audioBuffer: AudioBuffer | null;
  selectedVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  onScriptChange: (script: string) => void;
  onConfirmScript: () => void;
  isGeneratingAudio: boolean;
  allowScriptEdit: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  script, 
  audioBuffer,
  selectedVoice,
  onVoiceChange,
  onScriptChange,
  onConfirmScript,
  isGeneratingAudio,
  allowScriptEdit
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isEditing, setIsEditing] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000
    });
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Enter edit mode automatically if no audio buffer is present but we have a script (Precision Mode flow)
  useEffect(() => {
    if (!audioBuffer && script && allowScriptEdit) {
      setIsEditing(true);
    } else if (audioBuffer) {
      setIsEditing(false);
    }
  }, [audioBuffer, script, allowScriptEdit]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
  }, []);

  const updateProgress = () => {
    if (!audioContextRef.current || !sourceNodeRef.current || !audioBuffer) return;

    const elapsedTime = audioContextRef.current.currentTime - startTimeRef.current;
    const duration = audioBuffer.duration;
    const currentProgress = (elapsedTime / duration) * 100;

    if (currentProgress >= 100) {
      setProgress(100);
      stopAudio();
      pauseTimeRef.current = 0; // Reset
    } else {
      setProgress(currentProgress);
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const playAudio = async () => {
    if (!audioBuffer || !audioContextRef.current) return;

    // Resume context if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Stop any existing playback
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    // Calculate offset based on paused progress
    const offset = pauseTimeRef.current;
    
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    source.start(0, offset);
    sourceNodeRef.current = source;
    
    setIsPlaying(true);
    updateProgress();
  };

  const pauseAudio = () => {
    if (!audioContextRef.current) return;
    
    // Calculate where we paused
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    pauseTimeRef.current = elapsed;
    
    stopAudio();
    // But keep progress visible
    if (audioBuffer) {
        setProgress((elapsed / audioBuffer.duration) * 100);
    }
  };

  const resetAudio = () => {
    stopAudio();
    pauseTimeRef.current = 0;
    setProgress(0);
  };

  // Reset state when audio buffer changes (new generation)
  useEffect(() => {
    resetAudio();
  }, [audioBuffer]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
      {/* Script Section */}
      <div className={`bg-slate-800/50 rounded-xl border ${isEditing ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-700'} p-6 flex flex-col h-[500px] transition-all`}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider">
            <Mic2 className="w-4 h-4 text-blue-500" />
            {isEditing ? 'Review Script' : 'Generated Script'}
            </h3>
            {audioBuffer && !isEditing && (
                <button 
                    onClick={() => {
                        setIsEditing(true);
                        stopAudio();
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                    <Edit3 className="w-3 h-3" /> Edit
                </button>
            )}
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative">
          {isEditing ? (
             <textarea 
                className="w-full h-full bg-transparent resize-none focus:outline-none text-lg leading-loose font-serif text-slate-300"
                value={script}
                onChange={(e) => onScriptChange(e.target.value)}
                placeholder="Script content..."
             />
          ) : (
             <p className="text-lg leading-loose font-serif text-slate-300 whitespace-pre-wrap">
                {script}
             </p>
          )}
        </div>
        
        {isEditing && (
            <div className="mt-4 flex justify-end">
                <button
                    onClick={() => {
                        setIsEditing(false);
                        onConfirmScript();
                    }}
                    disabled={isGeneratingAudio || !script.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg hover:shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGeneratingAudio ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Synthesizing...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Confirm & Generate Audio
                        </>
                    )}
                </button>
            </div>
        )}
      </div>

      {/* Controls Section */}
      <div className="flex flex-col gap-6">
        {/* Voice Selection */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
           <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Select Anchor</h3>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
             {(Object.keys(VoiceName) as Array<keyof typeof VoiceName>).map((key) => (
               <button
                 key={key}
                 onClick={() => onVoiceChange(VoiceName[key])}
                 disabled={isGeneratingAudio}
                 className={`
                   px-4 py-3 rounded-lg text-sm font-medium transition-all
                   ${selectedVoice === VoiceName[key]
                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 ring-1 ring-blue-400'
                     : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                   }
                   ${isGeneratingAudio ? 'opacity-50 cursor-not-allowed' : ''}
                 `}
               >
                 {VoiceName[key]}
               </button>
             ))}
           </div>
        </div>

        {/* Player */}
        <div className={`flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-8 flex flex-col items-center justify-center relative overflow-hidden transition-all ${isEditing ? 'opacity-50 grayscale' : ''}`}>
            {/* Visualizer Background Effect */}
            {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div 
                            key={i} 
                            className="w-2 bg-blue-500 rounded-full animate-pulse"
                            style={{ 
                                height: `${Math.random() * 60 + 20}%`,
                                animationDuration: `${Math.random() * 0.5 + 0.5}s` 
                            }} 
                        />
                    ))}
                </div>
            )}

            {/* Time / Progress */}
            <div className="w-full mb-8 relative z-10">
                 <div className="flex justify-between text-xs text-slate-400 font-mono mb-2">
                     <span>{formatTime(pauseTimeRef.current)}</span>
                     <span>{audioBuffer ? formatTime(audioBuffer.duration) : "00:00"}</span>
                 </div>
                 <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                     />
                 </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-6 relative z-10">
                <button 
                  onClick={resetAudio}
                  disabled={!audioBuffer || isEditing}
                  className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors disabled:opacity-30"
                >
                    <RotateCcw className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={isPlaying ? pauseAudio : playAudio}
                  disabled={!audioBuffer || isEditing}
                  className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl
                    ${!audioBuffer || isEditing
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                        : 'bg-white text-slate-900 hover:scale-105 hover:bg-blue-50 active:scale-95'
                    }
                  `}
                >
                    {isPlaying ? (
                        <Pause className="w-8 h-8 fill-current" />
                    ) : (
                        <Play className="w-8 h-8 fill-current ml-1" />
                    )}
                </button>

                 <div className="p-3 text-slate-400">
                    <Volume2 className="w-6 h-6" />
                </div>
            </div>
            
            {!audioBuffer && (
                <p className="mt-6 text-slate-500 text-sm font-medium">
                    {isEditing ? "Review and confirm script above" : "Generate audio to start listening"}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

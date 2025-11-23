import React, { useState, useRef, useEffect } from 'react';
import { identifyLandmark, getLandmarkDetails, generateNarration } from './services/geminiService';
import { decodeBase64, decodeAudioData } from './utils/audioUtils';
import { AppStatus, AppError, LandmarkAnalysisResult, LandmarkFullDetails } from './types';
import ResultOverlay from './components/ResultOverlay';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  
  // Data State
  const [landmark, setLandmark] = useState<LandmarkAnalysisResult | null>(null);
  const [details, setDetails] = useState<LandmarkFullDetails | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Extract base64 data part (remove "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      setImage(result); // Keep full string for display
      startAnalysis(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // Main Logic Flow
  const startAnalysis = async (imageBase64: string) => {
    try {
      setError(null);
      setLandmark(null);
      setDetails(null);
      setAudioBuffer(null);

      // 1. Identify
      setStatus(AppStatus.ANALYZING_IMAGE);
      const idResult = await identifyLandmark(imageBase64);
      setLandmark(idResult);

      // 2. Search Details
      setStatus(AppStatus.SEARCHING_INFO);
      const detailResult = await getLandmarkDetails(idResult.name, idResult.visualDescription);
      setDetails(detailResult);

      // 3. Generate Audio
      setStatus(AppStatus.GENERATING_AUDIO);
      // Use the first 400 chars for TTS to save latency/tokens, or the full description if short
      const ttsText = detailResult.description.length > 500 
        ? detailResult.description.substring(0, 500) + "..." 
        : detailResult.description;
        
      const audioBase64 = await generateNarration(ttsText);
      
      // Decode Audio
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const rawBytes = decodeBase64(audioBase64);
      const buffer = await decodeAudioData(rawBytes, audioContextRef.current, 24000, 1);
      setAudioBuffer(buffer);

      setStatus(AppStatus.COMPLETE);
    } catch (e: any) {
      console.error(e);
      setError({ message: e.message || "Something went wrong during analysis." });
      setStatus(AppStatus.ERROR);
    }
  };

  // Audio Control
  const toggleAudio = () => {
    if (!audioContextRef.current || !audioBuffer) return;

    if (isPlaying) {
      sourceNodeRef.current?.stop();
      setIsPlaying(false);
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      sourceNodeRef.current = source;
      setIsPlaying(true);
    }
  };

  const resetApp = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
    }
    setIsPlaying(false);
    setStatus(AppStatus.IDLE);
    setImage(null);
    setLandmark(null);
    setDetails(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col">
      {/* --- IDLE STATE --- */}
      {status === AppStatus.IDLE && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
           {/* Decorative Background Elements */}
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center opacity-20 blur-sm"></div>
           <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950"></div>

          <div className="relative z-10 text-center space-y-6 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-black mb-4 shadow-xl shadow-amber-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            
            <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              LensLore
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Your AI travel companion. Snap any landmark to unlock its history, secrets, and stories.
            </p>

            <div className="pt-8 flex flex-col gap-4 w-full">
              <label className="w-full relative group cursor-pointer">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                <div className="relative w-full bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl p-4 flex items-center justify-center gap-3 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span className="font-bold text-lg">Take Photo</span>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={handleFileSelect}
                />
              </label>
              
              <label className="w-full cursor-pointer">
                <div className="w-full bg-transparent hover:bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center gap-3 transition-all">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                   <span className="font-semibold text-slate-300">Upload from Gallery</span>
                </div>
                 <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </div>
          
          <div className="absolute bottom-6 text-center w-full">
             <p className="text-xs text-slate-600 font-mono uppercase tracking-widest">Powered by Gemini 2.5 & 3.0</p>
          </div>
        </div>
      )}

      {/* --- LOADING STATE --- */}
      {(status === AppStatus.ANALYZING_IMAGE || status === AppStatus.SEARCHING_INFO || status === AppStatus.GENERATING_AUDIO) && (
        <div className="flex-1 flex flex-col items-center justify-center relative">
           <div className="absolute inset-0 z-0">
             {image && <img src={image} className="w-full h-full object-cover opacity-30 blur-xl" alt="processing" />}
             <div className="absolute inset-0 bg-black/70" />
           </div>

           <div className="relative z-10 flex flex-col items-center p-8 text-center max-w-xs">
              <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-6"></div>
              <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">
                {status === AppStatus.ANALYZING_IMAGE && "Analyzing Scene..."}
                {status === AppStatus.SEARCHING_INFO && "Consulting History..."}
                {status === AppStatus.GENERATING_AUDIO && "Creating Audio Guide..."}
              </h2>
              <p className="text-slate-400 text-sm">
                 {status === AppStatus.ANALYZING_IMAGE && "Identifying landmarks using Vision AI"}
                 {status === AppStatus.SEARCHING_INFO && "Fetching real-time data & facts"}
                 {status === AppStatus.GENERATING_AUDIO && "Synthesizing narration"}
              </p>
           </div>
        </div>
      )}

      {/* --- ERROR STATE --- */}
      {status === AppStatus.ERROR && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-red-950/20">
           <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
           <p className="text-red-200 mb-6">{error?.message}</p>
           <button onClick={resetApp} className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-slate-200 transition">
             Try Again
           </button>
        </div>
      )}

      {/* --- COMPLETE STATE --- */}
      {status === AppStatus.COMPLETE && landmark && details && image && (
        <ResultOverlay 
          landmark={landmark} 
          details={details} 
          imageSrc={image}
          isPlaying={isPlaying}
          onToggleAudio={toggleAudio}
          onReset={resetApp}
        />
      )}
    </div>
  );
};

export default App;

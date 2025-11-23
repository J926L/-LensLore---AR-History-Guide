import React, { useEffect, useState } from 'react';
import { LandmarkFullDetails, LandmarkAnalysisResult } from '../types';

interface ResultOverlayProps {
  landmark: LandmarkAnalysisResult;
  details: LandmarkFullDetails;
  imageSrc: string;
  isPlaying: boolean;
  onToggleAudio: () => void;
  onReset: () => void;
}

const ResultOverlay: React.FC<ResultOverlayProps> = ({
  landmark,
  details,
  imageSrc,
  isPlaying,
  onToggleAudio,
  onReset
}) => {
  const [expanded, setExpanded] = useState(false);

  // Markdown-like simplistic parsing for bolding
  const renderDescription = (text: string) => {
    // Simple replace for **text** to <b>text</b>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <b key={i} className="text-amber-400 font-bold">{part.slice(2, -2)}</b>;
        }
        return part;
    });
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-black">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={imageSrc} 
          alt="Analyzed Landmark" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />
      </div>

      {/* Header Actions */}
      <div className="relative z-10 p-4 flex justify-between items-start">
        <button 
          onClick={onReset}
          className="bg-black/40 backdrop-blur-md rounded-full p-2 text-white hover:bg-white/20 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end p-6 pb-24 overflow-y-auto no-scrollbar">
        <div className="mb-2">
             <span className="inline-block px-2 py-1 text-xs font-bold tracking-widest text-amber-400 uppercase border border-amber-400/50 rounded bg-amber-950/30 backdrop-blur-sm mb-2">
              Identified
            </span>
            <h1 className="text-4xl font-extrabold text-white drop-shadow-lg leading-tight">
            {landmark.name}
            </h1>
        </div>
        
        <div className={`bg-black/40 backdrop-blur-xl rounded-2xl p-5 border border-white/10 transition-all duration-500 ${expanded ? 'max-h-96 overflow-y-auto' : 'max-h-64 overflow-hidden'}`}>
            <div className="text-slate-200 leading-relaxed text-sm md:text-base">
                {renderDescription(details.description)}
            </div>
            
            {/* Sources */}
            {details.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Information Sources</p>
                    <div className="flex flex-wrap gap-2">
                        {details.sources.map((source, idx) => (
                             <a 
                                key={idx} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-900/30 px-2 py-1 rounded transition"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                                </svg>
                                {source.title.length > 20 ? source.title.substring(0, 20) + '...' : source.title}
                             </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Sticky Bottom Audio Player */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black via-black to-transparent pt-12">
        <button 
            onClick={onToggleAudio}
            className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl transition shadow-lg shadow-amber-900/50"
        >
            {isPlaying ? (
                 <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                    </svg>
                    Pause Guide
                 </>
            ) : (
                <>
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                    Play Audio Guide
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default ResultOverlay;

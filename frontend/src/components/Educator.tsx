import { useState, useRef } from 'react';
import { MediaPipeCanvas } from './MediaPipeCanvas';
import type { MediaPipeCanvasRef } from './MediaPipeCanvas';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { Play, RotateCcw, Award, Loader2, Square, AlertCircle, Search, Youtube, ExternalLink } from 'lucide-react';

interface Props {
  onViewIndex: () => void;
  initialPhrase?: string;
  vocabulary?: string[];
  youtubeMapping?: Record<string, string>;
}

export function Educator({ onViewIndex, initialPhrase, vocabulary = [], youtubeMapping = {} }: Props) {
  const { getToken } = useAuth();
  const canvasRef = useRef<MediaPipeCanvasRef>(null);
  
  const [targetPhrase, setTargetPhrase] = useState<string>(initialPhrase || 'book');
  const [appState, setAppState] = useState<'idle' | 'preparing' | 'recording' | 'scoring' | 'result'>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [networkError, setNetworkError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const filteredWords = vocabulary.filter(word => 
    word.toLowerCase().includes(searchQuery.toLowerCase()) && word !== targetPhrase
  ).slice(0, 15); // Limit suggestions

  const handleStartPractice = () => {
    setAppState('preparing');
    setScore(null);
    setNetworkError('');
  };

  const handleFinishSign = () => {
    canvasRef.current?.stopAndEmit();
  };

  const handleSignComplete = async (landmarksTimeline: any[]) => {
    setAppState('scoring');
    
    if (landmarksTimeline.length <= 5) {
        setScore(0);
        setFeedback("The recording was too short. Try pressing start, executing the full sign, and then pressing finish.");
        setAppState('result');
        return;
    }

    try {
      const token = await getToken();
      
      const payload = {
        target_phrase: targetPhrase,
        landmarks: landmarksTimeline
      };
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log(`Sending payload to ${apiUrl}/api/score_sign`);
      console.log(`Payload frames size: ${landmarksTimeline.length}`);

      const res = await axios.post(
        `${apiUrl}/api/score_sign`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setScore(res.data.similarity_score);
      setFeedback(res.data.feedback || "Great attempt!");
      setAppState('result');
      
    } catch (err: any) {
      console.error("Scoring failed:", err);
      
      let errorMsg = err.message || 'Unknown Network Error';
      if (err.response && err.response.data && err.response.data.error) {
          errorMsg = err.response.data.error;
      }
      
      setNetworkError(`Backend Routing Error: ${errorMsg}`);
      setFeedback('The browser failed to communicate with the Rust backend on port 3000. Check Developer Console for strictly printed axios crash logs.');
      setAppState('result');
    }
  };

  // Get YouTube links for the current phrase
  const targetWords = targetPhrase.toLowerCase().split(/\s+/);
  const links = targetWords.map(word => ({
    word,
    url: youtubeMapping[word]
  })).filter(l => l.url);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-12 mt-4 px-4 pb-12 max-w-7xl mx-auto">
      <div className="flex-1 flex flex-col gap-6 lg:max-w-lg">
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 lg:p-12 backdrop-blur-md relative overflow-hidden flex-1 shadow-2xl flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none transition-all"></div>
          
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Current Challenge</h2>
          <div className="text-6xl md:text-7xl font-black tracking-tight mb-10 drop-shadow-2xl capitalize text-white">
            {targetPhrase}
          </div>

          {links.length > 0 && (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Reference Videos</p>
               <div className="flex flex-wrap gap-2">
                 {links.map((link, idx) => (
                   <a 
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 px-3 py-2 rounded-xl text-xs font-bold text-red-400 transition-all hover:scale-105 active:scale-95 group"
                   >
                     <Youtube className="w-4 h-4" />
                     <span className="capitalize">{link.word}</span>
                     <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </a>
                 ))}
               </div>
            </div>
          )}
          
          {(appState === 'idle' || appState === 'result') && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-500">
              <button 
                onClick={handleStartPractice}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-3 text-xl cursor-pointer"
              >
                {appState === 'result' ? <><RotateCcw className="w-6 h-6" /> Try Again</> : <><Play className="w-6 h-6" /> Start Practice</>}
              </button>
              
              <div className="mt-8 border-t border-white/10 pt-8">
                {appState === 'result' && score !== null && (
                  <div className="mb-10 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 text-emerald-400 uppercase tracking-widest text-sm font-bold mb-4">
                      <Award className="w-5 h-5" />
                      Assessment Score
                    </div>
                    <div className="flex items-end gap-3">
                      <span className={`text-7xl font-black tracking-tighter ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {Math.round(score)}%
                      </span>
                      <span className="text-xl text-gray-500 mb-3 font-semibold">Similarity</span>
                    </div>
                    <p className="text-gray-300 text-md leading-relaxed mt-4 bg-white/5 p-4 rounded-xl border border-white/5">
                      {feedback}
                    </p>
                  </div>
                )}

                {appState === 'result' && networkError && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-red-300 text-sm font-medium">{networkError}</p>
                    </div>
                )}

                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Master another sign:</p>
                  <button 
                    onClick={onViewIndex}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest cursor-pointer"
                  >
                    View Complete List →
                  </button>
                </div>
                <div className="relative group mt-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Type a word or sentence (e.g. 'hello computer')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        setTargetPhrase(searchQuery.trim());
                        setAppState('idle');
                        setScore(null);
                        setNetworkError('');
                        setSearchQuery('');
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                      ENTER TO SET
                    </div>
                  )}
                </div>
                
                {searchQuery && (
                  <div className="mt-4 flex flex-wrap gap-2.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
                    {filteredWords.map(word => (
                      <button 
                        key={word}
                        onClick={() => { setTargetPhrase(word); setAppState('idle'); setScore(null); setNetworkError(''); setSearchQuery(''); }}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-sm font-semibold text-gray-300 transition-colors capitalize cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                      >
                        {word}
                      </button>
                    ))}
                    {filteredWords.length === 0 && <p className="text-gray-500 text-sm py-2">No signs found for "{searchQuery}"</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {appState === 'scoring' && (
            <div className="flex flex-col items-center justify-center py-16 gap-6 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
              </div>
              <p className="text-xl text-gray-300 font-medium text-center leading-relaxed">
                Analyzing trajectory via <br/><span className="text-white font-bold">Dynamic Time Warping...</span>
              </p>
            </div>
          )}

          {(appState === 'preparing' || appState === 'recording') && (
               <div className="flex flex-col items-center justify-center py-14 animate-in fade-in duration-300 bg-blue-500/5 rounded-3xl border border-blue-500/20 shadow-inner">
                 {appState === 'recording' ? (
                     <>
                        <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse mb-6 shadow-[0_0_20px_rgba(59,130,246,1)]"></div>
                        <p className="text-3xl text-blue-200 font-black mb-2 tracking-tight">Camera Active</p>
                     </>
                 ) : (
                     <>
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-6" />
                        <p className="text-xl text-gray-300 font-medium mb-2">Booting AI Engine...</p>
                     </>
                 )}
                 <p className="text-gray-400 text-center px-6 leading-relaxed mt-4">
                    Step back so your upper body is visible. Perform the sign entirely, then directly press the Finish button.
                 </p>
               </div>
          )}
        </div>
      </div>

      <div className="flex-[1.5] w-full flex flex-col gap-6">
         <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl shadow-black/80 aspect-[4/3] lg:aspect-auto flex-1 flex">
             {appState === 'idle' || appState === 'result' ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-gray-950/80 backdrop-blur-md z-10 transition-opacity duration-500">
                   <p className="text-3xl text-white font-bold mb-4">Ready when you are</p>
                   <p className="text-gray-400 text-lg max-w-sm">Press Start to practice. Your camera feed and AI skeletal tracking will appear here.</p>
                 </div>
             ) : null}
             
             {(appState === 'preparing' || appState === 'recording' || appState === 'scoring') && (
                <MediaPipeCanvas
                  ref={canvasRef}
                  onReady={() => setAppState('recording')}
                  onSignComplete={handleSignComplete}
                  isActive={appState === 'preparing' || appState === 'recording'}
                />
             )}
         </div>

         {appState === 'recording' && (
             <div className="animate-in slide-in-from-top-4 duration-500">
                 <button 
                     onClick={handleFinishSign}
                     className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black py-6 px-8 rounded-[2rem] flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:shadow-[0_0_60px_rgba(225,29,72,0.6)] transition-all active:scale-95 cursor-pointer w-full text-2xl border border-red-400/50 uppercase tracking-wider"
                 >
                     <Square className="w-8 h-8 fill-current" />
                     Finish Sign
                 </button>
             </div>
         )}
      </div>
    </div>
  );
}

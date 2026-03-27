import { useState, useRef } from 'react';
import { MediaPipeCanvas } from './MediaPipeCanvas';
import type { MediaPipeCanvasRef } from './MediaPipeCanvas';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { Play, RotateCcw, Award, Loader2, Square, AlertCircle } from 'lucide-react';

export function Educator() {
  const { getToken } = useAuth();
  const canvasRef = useRef<MediaPipeCanvasRef>(null);
  
  const [targetWord, setTargetWord] = useState<string>('book');
  const [appState, setAppState] = useState<'idle' | 'preparing' | 'recording' | 'scoring' | 'result'>('idle');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [networkError, setNetworkError] = useState<string>('');
  
  const availableWords = ['book', 'drink', 'computer', 'chair', 'help', 'mother', 'father', 'coffee', 'water', 'hello', 'accident'];
  
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
        target_word: targetWord,
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

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-12 mt-4 px-4 pb-12 max-w-7xl mx-auto">
      <div className="flex-1 flex flex-col gap-6 lg:max-w-lg">
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 lg:p-12 backdrop-blur-md relative overflow-hidden flex-1 shadow-2xl flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none transition-all"></div>
          
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Current Challenge</h2>
          <div className="text-6xl md:text-7xl font-black tracking-tight mb-10 drop-shadow-2xl capitalize text-white">
            {targetWord}
          </div>
          
          {(appState === 'idle' || appState === 'result') && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-500">
              <button 
                onClick={handleStartPractice}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-3 text-xl cursor-pointer"
              >
                {appState === 'result' ? <><RotateCcw className="w-6 h-6" /> Try Again</> : <><Play className="w-6 h-6" /> Start Practice</>}
              </button>
              
              <div className="mt-10 border-t border-white/10 pt-8">
                <p className="text-sm font-semibold text-gray-500 mb-5 uppercase tracking-widest">Or master another word:</p>
                <div className="flex flex-wrap gap-2.5">
                  {availableWords.filter(w => w !== targetWord).map(word => (
                    <button 
                      key={word}
                      onClick={() => { setTargetWord(word); setAppState('idle'); setScore(null); setNetworkError(''); }}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-sm font-semibold text-gray-300 transition-colors capitalize cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                    >
                      {word}
                    </button>
                  ))}
                </div>
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

        {appState === 'result' && (
          <div className="bg-gradient-to-br from-indigo-900/60 to-emerald-900/40 border border-emerald-500/30 rounded-3xl p-8 backdrop-blur-xl animate-in slide-in-from-bottom-12 duration-700 shadow-2xl shadow-emerald-900/30">
            <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award className="w-6 h-6" />
              Assessment Result
            </h3>
            
            <div className="flex items-end gap-3 mb-6">
              <span className={`text-8xl font-black tracking-tighter drop-shadow-2xl ${score !== null && score >= 80 ? 'text-emerald-400' : score !== null && score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score !== null ? Math.round(score) : '0'}%
              </span>
              <span className="text-2xl text-gray-400 mb-4 font-semibold">Similarity</span>
            </div>
            
            <p className="text-gray-200 text-lg leading-relaxed mt-6 border-t border-white/10 pt-6">{feedback}</p>

            {networkError && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/40 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm font-medium">{networkError}</p>
                </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-[1.5] w-full flex flex-col gap-6">
         <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-black shadow-2xl shadow-black/80 aspect-[4/3] lg:aspect-auto flex-1 flex">
             {appState === 'idle' || appState === 'result' ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-gray-950/80 backdrop-blur-md z-10 transition-opacity duration-500">
                   <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
                     <Play className="w-10 h-10 text-blue-400 ml-1 opacity-80" />
                   </div>
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

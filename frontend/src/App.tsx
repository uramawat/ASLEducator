import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { Educator } from './components/Educator';
import { VocabularyIndex } from './components/VocabularyIndex';
import { StatsView } from './components/StatsView';
import { Loader2, BookOpen, GraduationCap, BarChart3 } from 'lucide-react';
import './App.css';

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [view, setView] = useState<'practice' | 'index' | 'stats'>('practice');
  const [selectedPhrase, setSelectedPhrase] = useState<string | undefined>(undefined);
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [youtubeMapping, setYoutubeMapping] = useState<Record<string, string>>({});
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      const fetchVocab = async (retries = 3) => {
        const wakeupTimer = setTimeout(() => {
          setIsWakingUp(true);
        }, 3000);

        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'https://asl-backend-gateway.onrender.com';
          const res = await axios.get(`${apiUrl}/api/vocabulary`);
          setVocabulary(res.data.available_words || []);
          setYoutubeMapping(res.data.youtube_mapping || {});
          setIsWakingUp(false);
          setIsInitialLoading(false);
        } catch (err) {
          console.error(`Failed to fetch vocabulary, ${retries} retries left`, err);
          if (retries > 0) {
            // Wait 5 seconds before retrying to give Render time to wake up
            setTimeout(() => fetchVocab(retries - 1), 5000);
          } else {
            setIsWakingUp(false);
            setIsInitialLoading(false);
          }
        } finally {
          clearTimeout(wakeupTimer);
        }
      };
      fetchVocab();
    }
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Loading ASL Educator...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen relative bg-gray-950 overflow-hidden flex flex-col items-center justify-center text-white p-6">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/30 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/30 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="z-10 text-center max-w-xl">
          <h1 className="text-6xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
            ASL Educator
          </h1>
          <p className="text-xl text-gray-400 mb-12 font-light leading-relaxed">
            Master American Sign Language with real-time AI feedback and dynamic motion tracking. 
          </p>
          <SignInButton mode="modal">
            <button className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md transition-all text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 text-lg cursor-pointer">
              Start Learning Now
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col relative">
      {/* Cold Start Overlay */}
      {isInitialLoading && (
        <div className="absolute inset-0 z-[100] bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
          <h2 className="text-2xl font-bold mb-2">Connecting to AI Services...</h2>
          {isWakingUp && (
            <p className="text-blue-400 font-medium animate-pulse max-w-md">
              Render Free Tier is waking up the backend containers. This can take up to 60 seconds...
            </p>
          )}
          {!isWakingUp && (
            <p className="text-gray-400">Loading your vocabulary bank...</p>
          )}
        </div>
      )}

      <header className="px-8 py-4 flex justify-between items-center border-b border-white/5 bg-gray-900/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-bold text-white text-sm">ASL</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Educator</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setView('practice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${view === 'practice' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <GraduationCap className="w-4 h-4" /> Practice
            </button>
            <button 
              onClick={() => setView('index')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${view === 'index' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <BookOpen className="w-4 h-4" /> Vocabulary
            </button>
            <button 
              onClick={() => setView('stats')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${view === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <BarChart3 className="w-4 h-4" /> Stats
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-sm font-medium text-gray-400">
            Welcome back, <span className="text-white font-semibold">{user?.firstName || 'Student'}</span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center">
        {view === 'practice' && (
          <Educator 
            onViewIndex={() => setView('index')} 
            initialPhrase={selectedPhrase}
            vocabulary={vocabulary}
            youtubeMapping={youtubeMapping}
          />
        )}
        {view === 'index' && (
          <VocabularyIndex 
            onBack={() => setView('practice')}
            onSelect={(phrase) => {
              setSelectedPhrase(phrase);
              setView('practice');
            }}
            initialVocabulary={vocabulary}
          />
        )}
        {view === 'stats' && (
          <StatsView onBack={() => setView('practice')} />
        )}
      </main>
    </div>
  );
}

export default App;

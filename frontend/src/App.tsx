import { useAuth, useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { Educator } from './components/Educator';
import { Loader2 } from 'lucide-react';
import './App.css';

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-gray-900/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-bold text-white text-sm">ASL</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Educator</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium text-gray-400">
            Welcome back, <span className="text-white font-semibold">{user?.firstName || 'Student'}</span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center">
        <Educator />
      </main>
    </div>
  );
}

export default App;

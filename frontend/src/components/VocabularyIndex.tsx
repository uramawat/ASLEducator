import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
import posthog from 'posthog-js';

interface Props {
  onSelect: (phrase: string) => void;
  onBack: () => void;
  initialVocabulary?: string[];
  onRefresh?: () => void;
}

export function VocabularyIndex({ onSelect, onBack, initialVocabulary = [], onRefresh }: Props) {
  const words = initialVocabulary;
  const [search, setSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (search.trim().length > 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      
      searchTimeoutRef.current = setTimeout(() => {
        const filtered = words.filter(w => w.toLowerCase().includes(search.toLowerCase()));
        posthog.capture("vocabulary_search", { 
          query: search, 
          results_count: filtered.length,
          has_results: filtered.length > 0 
        });
      }, 1000);
    }
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, words]);

  const filtered = words.filter(w => w.toLowerCase().includes(search.toLowerCase()));

  // Group by first letter
  const grouped = filtered.reduce((acc, word) => {
    const letter = word[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(word);
    return acc;
  }, {} as Record<string, string[]>);

  const letters = Object.keys(grouped).sort();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-black text-white">Available Signs</h1>
        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/30">
          {words.length} TOTAL
        </span>
        <button 
          onClick={onRefresh}
          className="ml-auto text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest cursor-pointer"
        >
          Force Reload
        </button>
      </div>

      <div className="relative group mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
        <input 
          type="text"
          placeholder="Filter signs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner text-lg"
        />
      </div>

      <div className="space-y-12 pb-20">
        {letters.map(letter => (
          <div key={letter} className="space-y-4">
            <h2 className="text-xl font-bold text-blue-400 border-b border-white/5 pb-2">{letter}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {grouped[letter].map(word => (
                <button
                  key={word}
                  onClick={() => onSelect(word)}
                  className="text-left px-4 py-3 bg-white/5 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer capitalize text-sm font-medium"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        ))}
        {letters.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
            <p className="text-gray-500 italic">No signs found matching "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

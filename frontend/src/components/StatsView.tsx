import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Trophy, Target, Award, Zap, Loader2 } from 'lucide-react';

interface StatItem {
    label: string;
    count: number;
}

interface StatsResponse {
    total_attempts: number;
    avg_accuracy: number;
    mastered_count: number;
    global_percentile: number;
    distribution: StatItem[];
}

interface Props {
    onBack: () => void;
}

export function StatsView({ onBack }: Props) {
    const { getToken } = useAuth();
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = await getToken();
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await axios.get<StatsResponse>(`${apiUrl}/api/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (e) {
            console.error("Failed to fetch stats", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-gray-400 font-medium">Calculating your progress...</p>
            </div>
        );
    }
    
    if (!stats) return <div className="text-red-400 p-8 text-center">Failed to load your personal data</div>;

    const top5 = stats.distribution.slice(0, 5);

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-10">
                <button 
                onClick={onBack}
                className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-3xl font-black text-white">Your Progress</h1>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden group shadow-xl hover:bg-white/[0.05] transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex items-center gap-2 text-blue-400 mb-4">
                        <Target className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Total Attempts</span>
                    </div>
                    <p className="text-5xl font-black text-white tracking-tighter">{stats.total_attempts}</p>
                </div>

                <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden group shadow-xl hover:bg-white/[0.05] transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex items-center gap-2 text-emerald-400 mb-4">
                        <Zap className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Avg Accuracy</span>
                    </div>
                    <p className="text-5xl font-black text-white tracking-tighter">{Math.round(stats.avg_accuracy)}%</p>
                </div>

                <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden group shadow-xl hover:bg-white/[0.05] transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full group-hover:bg-purple-500/20 transition-all"></div>
                    <div className="flex items-center gap-2 text-purple-400 mb-4">
                        <Award className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Signs Mastered</span>
                    </div>
                    <p className="text-5xl font-black text-white tracking-tighter">{stats.mastered_count}</p>
                </div>

                <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden group shadow-xl hover:bg-white/[0.05] transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[60px] rounded-full group-hover:bg-yellow-500/20 transition-all"></div>
                    <div className="flex items-center gap-2 text-yellow-400 mb-4">
                        <Trophy className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Global Rank</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-white tracking-tighter">Top {Math.round(100 - stats.global_percentile)}%</span>
                    </div>
                </div>
            </div>

            {/* Charts & Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Top Signs Chart */}
                <div className="bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl backdrop-blur-md">
                    <h3 className="text-xl font-black mb-8 text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-blue-400" />
                        </div>
                        Most Practiced Signs
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="label" stroke="#9CA3AF" width={80} fontSize={12} fontWeight="700" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="count" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Detailed List */}
                <div className="bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl backdrop-blur-md flex flex-col h-[400px]">
                    <h3 className="text-xl font-black mb-8 text-white">Full Breakdown</h3>
                    <div className="overflow-y-auto flex-1 pr-4 custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-500 border-b border-white/10 text-[10px] font-black uppercase tracking-widest">
                                    <th className="pb-4">Sign / Phrase</th>
                                    <th className="pb-4 text-right">Attempts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats.distribution.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 font-bold text-gray-300 capitalize">{item.label}</td>
                                        <td className="py-4 text-right font-black text-blue-400">{item.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {stats.distribution.length === 0 && (
                             <p className="text-center text-gray-500 py-10 italic">No attempts recorded yet. Start practicing!</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

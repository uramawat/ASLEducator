import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StatItem {
    label: string;
    count: number;
}

interface StatsResponse {
    total_samples: number;
    distribution: StatItem[];
}

export function StatsView() {
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get<StatsResponse>('http://localhost:3000/api/stats');
            setStats(res.data);
        } catch (e) {
            console.error("Failed to fetch stats", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-gray-400 p-8">Loading stats...</div>;
    if (!stats) return <div className="text-red-400 p-8">Failed to load data</div>;

    const top5 = stats.distribution.slice(0, 5);

    return (
        <div className="w-full max-w-4xl p-6 animate-fade-in">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider">Total Samples</h3>
                    <p className="text-4xl font-extrabold text-blue-400 mt-2">{stats.total_samples}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider">Unique Signs</h3>
                    <p className="text-4xl font-extrabold text-purple-400 mt-2">{stats.distribution.length}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    {/* Placeholder for future metric */}
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider">Top Sign</h3>
                    <p className="text-3xl font-extrabold text-green-400 mt-2 truncate">
                        {stats.distribution[0]?.label || "N/A"}
                    </p>
                </div>
            </div>

            {/* Charts & Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Leaderboard Chart */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        🏆 Top 5 Signs
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={top5} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="label" stroke="#9CA3AF" width={80} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Detailed List */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col h-96">
                    <h3 className="text-xl font-bold mb-4">Detailed Breakdown</h3>
                    <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700 text-sm">
                                    <th className="pb-2">Sign</th>
                                    <th className="pb-2 text-right">Count</th>
                                    <th className="pb-2 text-right">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {stats.distribution.map((item, idx) => {
                                    const percentage = Math.min(100, Math.round((item.count / 50) * 100)); // Target 50
                                    return (
                                        <tr key={idx} className="group hover:bg-gray-700/50 transition-colors">
                                            <td className="py-3 font-medium text-gray-200">{item.label}</td>
                                            <td className="py-3 text-right font-mono text-blue-300">{item.count}</td>
                                            <td className="py-3 pl-4">
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-4">Target: 50 samples per sign</p>
                </div>
            </div>
        </div>
    );
}

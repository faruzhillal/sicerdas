import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { Trophy, Medal, Search, Filter, ArrowUpRight, User, BarChart as ChartIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Ranking {
  id: string;
  studentName: string;
  class: string;
  score: number;
  rank: number;
}

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

const CLASSES = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'];

export default function RankingPage() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [selectedClass, setSelectedClass] = useState('1A');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch criteria
        const criteriaSnapshot = await getDocs(collection(db, 'criteria'));
        const criteriaData = criteriaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Criterion));
        setCriteria(criteriaData);

        const q = query(
          collection(db, 'rankings'),
          where('class', '==', selectedClass),
          orderBy('score', 'desc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ranking));
        
        // If empty, provide some funny mock data for demo
        if (data.length === 0) {
          const mockData: Ranking[] = [
            { id: '1', studentName: 'Ahmad Fauzi', class: selectedClass, score: 985, rank: 1 },
            { id: '2', studentName: 'Siti Aminah', class: selectedClass, score: 962, rank: 2 },
            { id: '3', studentName: 'Budi Santoso', class: selectedClass, score: 940, rank: 3 },
            { id: '4', studentName: 'Laila Husna', class: selectedClass, score: 915, rank: 4 },
            { id: '5', studentName: 'Diki Pratama', class: selectedClass, score: 890, rank: 5 },
          ];
          setRankings(mockData);
        } else {
          setRankings(data);
        }
      } catch (error) {
        console.error("Error fetching rankings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClass]);

  const top10 = rankings.slice(0, 10).map(r => ({
    name: r.studentName.split(' ')[0],
    score: r.score
  }));

  return (
    <div className="py-20 px-4 max-w-7xl mx-auto">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">Papan Peringkat Siswa</h1>
        <p className="text-lg text-slate-600">
          Daftar 50 siswa terbaik berdasarkan akumulasi nilai akademik, keaktifan, dan prestasi ekstrakurikuler.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-8 sticky top-24">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Filter size={14} />
              Filter Kelas
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {CLASSES.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={cn(
                    "py-1.5 rounded-xl text-xs font-bold transition-all border",
                    selectedClass === cls
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400"
                  )}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">Kriteria Penilaian SPK</h3>
            <ul className="space-y-3">
              {criteria.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2 text-xs text-slate-500">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    i % 3 === 0 ? "bg-emerald-500" : i % 3 === 1 ? "bg-emerald-400" : "bg-emerald-300"
                  )} />
                  {c.name} ({(c.weight * 100).toFixed(0)}%)
                </li>
              ))}
              {criteria.length === 0 && (
                <li className="text-xs text-slate-400 italic">Belum ada kriteria diatur</li>
              )}
            </ul>
          </div>
        </div>

        {/* Main Ranking List */}
        <div className="lg:col-span-3 space-y-8">
          {!loading && rankings.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-6">
                <ChartIcon size={16} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Distribusi Skor Top 10</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top10}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis hide domain={[0, 'dataMax + 100']} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xl">
                              <p>{payload[0].payload.name}</p>
                              <p className="text-emerald-400">{payload[0].value} Poin</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={40}>
                      {top10.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index < 3 ? '#34d399' : '#e2e8f0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {rankings.map((student, idx) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "flex items-center gap-4 bg-white p-4 sm:p-5 rounded-[2rem] border border-slate-100 transition-all group hover:border-emerald-400 hover:shadow-md",
                    idx === 0 && "ring-2 ring-yellow-400 border-yellow-200 bg-yellow-50/20"
                  )}
                >
                  <div className="w-12 sm:w-16 flex flex-col items-center justify-center">
                    {idx === 0 ? (
                      <Trophy className="text-yellow-500 mb-1" size={24} />
                    ) : idx < 3 ? (
                      <Medal className={cn(idx === 1 ? "text-slate-400" : "text-amber-600")} size={24} />
                    ) : (
                      <span className="text-xl font-bold text-slate-400">#{idx + 1}</span>
                    )}
                  </div>

                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.5rem] bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                    <User size={32} />
                  </div>

                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {student.studentName}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                      Kelas {student.class} • ID: {student.id.slice(0, 6)}
                    </p>
                  </div>

                  <div className="text-right pr-2">
                    <p className="text-2xl font-black text-slate-900 leading-none mb-1">{student.score}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Poin Total</p>
                  </div>

                  <div className="hidden sm:block">
                    <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">
                      <ArrowUpRight size={18} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

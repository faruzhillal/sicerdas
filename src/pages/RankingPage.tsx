import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Medal, 
  Search, 
  Filter, 
  ArrowLeft, 
  User, 
  BarChart as ChartIcon, 
  School, 
  Sparkles, 
  GraduationCap, 
  Calendar, 
  Users, 
  ArrowUpRight 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Ranking {
  id: string;
  studentName: string;
  class: string;
  score: number;
  rank: number;
  updatedAt?: string;
}

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

interface SchoolClass {
  id: string;
  name: string;
  description: string;
}

export default function RankingPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [allRankings, setAllRankings] = useState<Ranking[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch criteria
        const criteriaSnapshot = await getDocs(collection(db, 'criteria'));
        const criteriaData = criteriaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Criterion));
        setCriteria(criteriaData);

        // 2. Fetch classes from DB
        const classesSnapshot = await getDocs(query(collection(db, 'classes'), orderBy('name', 'asc')));
        let classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        
        if (classesData.length === 0) {
          // Provide mock classes if none in DB
          classesData = [
            { id: '1a', name: '1A', description: 'Generasi Pertama - Unggulan A' },
            { id: '1b', name: '1B', description: 'Generasi Pertama - Unggulan B' },
            { id: '2a', name: '2A', description: 'Generasi Kedua - Unggulan A' },
            { id: '2b', name: '2B', description: 'Generasi Kedua - Unggulan B' },
            { id: '3a', name: '3A', description: 'Generasi Ketiga - Al-Hafidz A' },
            { id: '3b', name: '3B', description: 'Generasi Ketiga - Al-Hafidz B' },
          ];
        }
        setClasses(classesData);

        // 3. Fetch all current students from users collection to have real-time profile mapping
        const studentsSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        const studentsMapped = new Map<string, { fullName: string; class: string }>();
        studentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          studentsMapped.set(doc.id, {
            fullName: data.fullName || 'Siswa',
            class: data.class || ''
          });
        });

        // 4. Fetch all rankings from DB
        const rankingsSnapshot = await getDocs(collection(db, 'rankings'));
        let rankingsData: Ranking[] = rankingsSnapshot.docs.map(doc => {
          const docData = doc.data();
          // Fallback between score and totalScore
          const rawScore = docData.score !== undefined ? docData.score : (docData.totalScore !== undefined ? docData.totalScore : 0);
          
          // Cross-reference with current student data to fetch real-time edits (class, name, etc.)
          const studentInfo = studentsMapped.get(doc.id);
          const studentName = studentInfo ? studentInfo.fullName : (docData.studentName || 'Siswa');
          const studentClass = studentInfo ? studentInfo.class : (docData.class || '');

          return {
            id: doc.id,
            studentName: studentName,
            class: studentClass,
            score: typeof rawScore === 'number' ? rawScore : parseFloat(rawScore) || 0,
            rank: docData.rank || 0,
            updatedAt: docData.updatedAt || ''
          };
        });

        // If there's no rankings at all, let's try to generate rankings from active student data first!
        if (rankingsData.length === 0) {
          try {
            const generatedFromDB: Ranking[] = [];
            
            // Fetch criteria scores (this will fail gracefully for student roles)
            const scoresSnapshot = await getDocs(collection(db, 'criteria_scores'));
            const scoresMap = new Map<string, any>();
            scoresSnapshot.docs.forEach(doc => {
              scoresMap.set(doc.id, doc.data());
            });
            
            const activeCriteria = criteriaData.length > 0 ? criteriaData : [
              { id: 'academic', name: 'Akademik', weight: 0.4 },
              { id: 'tahfidz', name: 'Tahfidz', weight: 0.3 },
              { id: 'behavior', name: 'Perilaku', weight: 0.2 },
              { id: 'attendance', name: 'Presensi', weight: 0.1 },
            ];

            if (studentsSnapshot.docs.length > 0) {
              studentsSnapshot.docs.forEach((studentDoc) => {
                const uData = studentDoc.data();
                const studentId = studentDoc.id;
                const sScores = scoresMap.get(studentId) || {};
                
                // Calculate weighted score
                let totalScore = 0;
                activeCriteria.forEach(c => {
                  totalScore += (Number(sScores[c.id]) || 0) * c.weight;
                });

                generatedFromDB.push({
                  id: studentId,
                  studentName: uData.fullName || 'Siswa',
                  class: uData.class || '',
                  score: Math.round(totalScore * 10) / 10,
                  rank: 0, // Will be computed per-class
                  updatedAt: sScores.updatedAt || ''
                });
              });
              rankingsData = generatedFromDB;
            }
          } catch (scoresError) {
            console.warn("Could not calculate dynamic ranks on the fly (probably a student):", scoresError);
          }
        }

        // If still empty (no students in DB at all), provide completely mock rankings
        if (rankingsData.length === 0) {
          const generatedMock: Ranking[] = [];
          classesData.forEach((cls) => {
            const studentsInClass = [
              { name: 'Ahmad Fauzi', score: 98.5 },
              { name: 'Siti Aminah', score: 96.2 },
              { name: 'Budi Santoso', score: 94.0 },
              { name: 'Laila Husna', score: 91.5 },
              { name: 'Diki Pratama', score: 89.0 },
              { name: 'Sarah Salsabila', score: 87.2 },
              { name: 'Rian Hidayat', score: 85.0 }
            ];
            studentsInClass.forEach((stud, idx) => {
              generatedMock.push({
                id: `${cls.id}-${idx}`,
                studentName: stud.name,
                class: cls.name,
                score: stud.score,
                rank: idx + 1
              });
            });
          });
          rankingsData = generatedMock;
        }

        setAllRankings(rankingsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper to obtain the top-ranked student in a specific class
  const getTopStudentForClass = (className: string) => {
    const classRankings = allRankings.filter(r => r.class.toLowerCase() === className.toLowerCase() || r.class === className);
    if (classRankings.length === 0) return null;
    
    // Sort descending by score
    const sorted = [...classRankings].sort((a, b) => b.score - a.score);
    return sorted[0];
  };

  // Helper to gather student count in a class
  const getStudentCountForClass = (className: string) => {
    return allRankings.filter(r => r.class.toLowerCase() === className.toLowerCase() || r.class === className).length;
  };

  const selectedClassObj = classes.find(c => c.id === selectedClassId);

  // Group and sort rankings for selected class
  const currentClassRankings = selectedClassObj 
    ? allRankings.filter(r => r.class.toLowerCase() === selectedClassObj.name.toLowerCase() || r.class === selectedClassObj.name)
    : [];

  const sortedClassRankings = [...currentClassRankings]
    .sort((a, b) => b.score - a.score)
    .map((r, index) => ({
      ...r,
      rank: index + 1
    }));

  const filteredRankings = sortedClassRankings.filter(r =>
    r.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate top 10 for charts representation
  const top10 = sortedClassRankings.slice(0, 10).map(r => ({
    name: r.studentName.split(' ')[0],
    score: r.score
  }));

  // Calculations for current selected class statistics
  const scoresArray = sortedClassRankings.map(r => r.score);
  const highestScore = scoresArray.length > 0 ? Math.max(...scoresArray) : 0;
  const lowestScore = scoresArray.length > 0 ? Math.min(...scoresArray) : 0;
  const averageScore = scoresArray.length > 0 ? (scoresArray.reduce((acc, curr) => acc + curr, 0) / scoresArray.length) : 0;

  return (
    <div className="py-20 px-4 max-w-7xl mx-auto min-h-screen bg-slate-50/30">
      {/* Header Section */}
      <div className="max-w-3xl mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-black uppercase tracking-wider mb-4">
          <Trophy size={14} />
          Sistem Pendukung Keputusan (SPK)
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-6">
          Papan <span className="text-emerald-600">Peringkat Siswa</span>
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed font-medium">
          Daftar siswa terbaik berdasarkan akumulasi penilaian akademik, akhlak, keaktifan, dan prestasi di SD SDQ Al Mahmudah menggunakan metode Simple Additive Weighting (SAW).
        </p>
      </div>

      <AnimatePresence mode="wait">
        {selectedClassId === null ? (
          /* STATE A: CLASS CARDS OVERVIEW CONTAINER */
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Daftar Kelas Tersedia</h2>
                <p className="text-sm text-slate-500 font-medium">Pilih kelas untuk melihat peringkat lengkap dari masing-masing kelas</p>
              </div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200">
                Total: {classes.length} Kelas
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[2.5rem]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {classes.map((cls, idx) => {
                  const topStudent = getTopStudentForClass(cls.name);
                  const totalStudents = getStudentCountForClass(cls.name);

                  return (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedClassId(cls.id)}
                      className="group bg-white rounded-[2/5rem] border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
                    >
                      <div className="p-8">
                        {/* Upper Card Grid */}
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                            <School size={28} />
                          </div>
                          <span className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                            {totalStudents} Siswa
                          </span>
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                          Kelas {cls.name}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">
                          {cls.description || `Kelompok belajar terpadu untuk tingkat kelas ${cls.name} SD SDQ Al Mahmudah.`}
                        </p>
                      </div>

                      {/* Display Highest Scoring Student (Bintang Kelas) */}
                      <div className="mx-6 mb-6 p-5 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-[1.8rem] flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">
                          <Sparkles size={12} className="animate-pulse" />
                          Siswa Terbaik (Rata-rata Tertinggi)
                        </div>

                        {topStudent ? (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                <Trophy size={16} />
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-bold text-slate-900 text-sm truncate">{topStudent.studentName}</p>
                                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Bintang Kelas {cls.name}</p>
                              </div>
                            </div>
                            <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-white rounded-full text-xs font-black tracking-tight shrink-0">
                              {topStudent.score.toFixed(1)} Poin
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic font-medium">Belum ada data nilai kalkulasi.</p>
                        )}
                      </div>

                      {/* Accent color footer interaction handle */}
                      <div className="bg-slate-50 px-8 py-4 flex justify-between items-center border-t border-slate-50 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all duration-300">
                        <span className="text-xs font-bold uppercase tracking-wider">Lihat Selengkapnya</span>
                        <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* STATE B: DETAILED RANKING DETAIL VIEW CONTAINER */
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Navigation and Title Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedClassId(null)}
                  className="p-3 bg-white hover:bg-slate-100 rounded-2xl border border-slate-200 text-slate-700 transition-all shadow-sm"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <span>Pemeringkatan Kelas</span>
                    <span>•</span>
                    <span className="text-emerald-600">Aktif</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
                    Papan Peringkat - Kelas {selectedClassObj?.name}
                  </h2>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedClassId(null)}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all self-start md:self-auto"
              >
                Kembali Ke Semua Kelas
              </button>
            </div>

            {/* Dynamic Class switcher filters at the top */}
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 ml-1">
                <Filter size={13} />
                Ganti Filter Kelas (Menggunakan Data Database)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "py-3 px-5 rounded-2xl text-sm font-bold transition-all border shrink-0 shadow-sm flex items-center gap-2",
                      selectedClassId === cls.id
                        ? "bg-slate-900 border-slate-900 text-white font-black"
                        : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400"
                    )}
                  >
                    <School size={15} className={cn(selectedClassId === cls.id ? "text-emerald-400" : "text-slate-400")} />
                    Kelas {cls.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Statistics Row Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                  <Trophy size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nilai Tertinggi</p>
                  <p className="text-2xl font-black text-slate-900">{highestScore > 0 ? highestScore.toFixed(1) : '-'}</p>
                </div>
              </div>

              <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                  <Sparkles size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nilai Rata-rata Kelas</p>
                  <p className="text-2xl font-black text-slate-900">{averageScore > 0 ? averageScore.toFixed(1) : '-'}</p>
                </div>
              </div>

              <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Jumlah Siswa Berperingkat</p>
                  <p className="text-2xl font-black text-slate-900">{sortedClassRankings.length} Orang</p>
                </div>
              </div>
            </div>

            {/* Main Ranking Grid Layout */}
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Leaderboard Table List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Search Bar */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                  <div className="pl-2 text-slate-400">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama siswa di kelas ini..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full focus:outline-none text-slate-800 text-sm font-medium"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="p-1 px-2.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-400"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Student Ranks List */}
                <div className="space-y-4">
                  {filteredRankings.length === 0 ? (
                    <div className="bg-white border rounded-3xl p-12 text-center border-slate-200 text-slate-500">
                      <Trophy size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="font-bold text-slate-700">Tidak ada data siswa ditemukan</p>
                      <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
                    </div>
                  ) : (
                    filteredRankings.map((student, idx) => {
                      const isTopThree = student.rank <= 3;
                      return (
                        <motion.div
                          key={student.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={cn(
                            "flex items-center gap-4 bg-white p-4 sm:p-5 rounded-[2.2rem] border border-slate-150 transition-all duration-300 group hover:border-emerald-500 hover:shadow-md",
                            student.rank === 1 && "ring-2 ring-amber-400 border-amber-200 bg-amber-50/10",
                            student.rank === 2 && "ring-2 ring-slate-300 border-slate-200 bg-slate-50/10",
                            student.rank === 3 && "ring-2 ring-amber-600/30 border-amber-600/20 bg-amber-600/5"
                          )}
                        >
                          {/* Rank Icon Indicator */}
                          <div className="w-12 sm:w-16 flex flex-col items-center justify-center shrink-0">
                            {student.rank === 1 ? (
                              <div className="p-2 bg-amber-100 rounded-xl text-amber-500">
                                <Trophy size={20} />
                              </div>
                            ) : student.rank === 2 ? (
                              <div className="p-2 bg-slate-100 rounded-xl text-slate-400">
                                <Medal size={20} />
                              </div>
                            ) : student.rank === 3 ? (
                              <div className="p-2 bg-amber-700/10 rounded-xl text-amber-700">
                                <Medal size={20} />
                              </div>
                            ) : (
                              <span className="text-base font-extrabold text-slate-400">#{student.rank}</span>
                            )}
                          </div>

                          {/* Avatar representation */}
                          <div className={cn(
                            "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden shrink-0 transition-all duration-300",
                            isTopThree ? "bg-amber-100 text-amber-600" : "bg-slate-100"
                          )}>
                            <User size={24} />
                          </div>

                          {/* Student Details */}
                          <div className="flex-grow min-w-0">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                              {student.studentName}
                            </h3>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                              Peringkat {student.rank} • ID: {student.id.split('-')[1] || student.id.slice(0, 5)}
                            </p>
                          </div>

                          {/* Score Display */}
                          <div className="text-right shrink-0 pr-1">
                            <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none mb-1">
                              {student.score.toFixed(1)}
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Skor Akhir</p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sidebar stats/charts and criteria information */}
              <div className="space-y-6">
                {/* Distribution chart */}
                {top10.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <ChartIcon size={16} className="text-emerald-600" />
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Distribusi Skor Top 10
                      </h3>
                    </div>

                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={top10}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                            dy={10}
                          />
                          <YAxis hide domain={[0, 'dataMax + 20']} />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-black shadow-xl">
                                    <p className="mb-0.5">{payload[0].payload.name}</p>
                                    <p className="text-emerald-400">{payload[0].value} Poin</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={28}>
                            {top10.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 ? '#10b981' : index === 1 ? '#34d399' : index === 2 ? '#6ee7b7' : '#e2e8f0'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}

                {/* Score weights list info */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 mb-4 tracking-tight flex items-center gap-1.5 uppercase">
                    <GraduationCap size={16} className="text-emerald-600" />
                    Kriteria SPK
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mb-4 leading-relaxed">
                    Perhitungan peringkat otomatis dilakukan menggunakan bobot berikut yang telah disinkronisasikan oleh sistem:
                  </p>
                  <ul className="space-y-3">
                    {criteria.map((c, i) => (
                      <li key={c.id} className="flex justify-between items-center text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            i % 3 === 0 ? "bg-emerald-500" : i % 3 === 1 ? "bg-emerald-400" : "bg-emerald-300"
                          )} />
                          <span>{c.name}</span>
                        </div>
                        <span className="font-bold text-emerald-600 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">
                          {(c.weight * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                    {criteria.length === 0 && (
                      <li className="text-xs text-slate-400 italic">Belum ada Kriteria yang diatur.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

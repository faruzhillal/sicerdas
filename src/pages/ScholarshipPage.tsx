import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { GraduationCap, Calendar, CheckCircle2, ArrowRight, Info, Award, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface Scholarship {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'open' | 'closed' | 'announced';
  deadline: string;
  benefits: string[];
}

export default function ScholarshipPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const { isStudent } = useAuth();

  useEffect(() => {
    const fetchScholarships = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'scholarships'));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scholarship));
        
        if (data.length === 0) {
          const mockData: Scholarship[] = [
            {
              id: '1',
              name: 'Beasiswa Tahfidz Quran',
              description: 'Diberikan kepada siswa dengan hafalan minimal 2 juz dengan tajwid yang baik.',
              type: 'Prestasi Keagamaan',
              status: 'open',
              deadline: '2024-06-30',
              benefits: ['Bebas SPP 6 Bulan', 'Peralatan Sekolah Baru', 'Sertifikat Penghargaan']
            },
            {
              id: '2',
              name: 'Beasiswa Akademik Unggul',
              description: 'Penghargaan bagi juara umum kelas dengan nilai rata-rata di atas 90.',
              type: 'Prestasi Akademik',
              status: 'announced',
              deadline: '2024-05-15',
              benefits: ['Potongan Biaya Pendidikan 50%', 'Tabungan Pendidikan']
            },
            {
              id: '3',
              name: 'Beasiswa Bantuan Sosial',
              description: 'Bantuan bagi siswa yatim/piatu atau kurang mampu secara ekonomi.',
              type: 'Bantuan Sosial',
              status: 'open',
              deadline: '2024-07-10',
              benefits: ['Bebas Biaya Seragam', 'Bantuan Buku & Alat Tulis']
            }
          ];
          setScholarships(mockData);
        } else {
          setScholarships(data);
        }
      } catch (error) {
        console.error("Error fetching scholarships:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScholarships();
  }, []);

  return (
    <div className="py-20 px-4 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
        <motion.div
           initial={{ opacity: 0, x: -30 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold mb-6">
            <Award size={16} />
            Program Apresiasi Siswa 2024
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-8">Program Beasiswa Unggulan</h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Mendukung setiap langkah perjuangan siswa mengejar mimpi. Jelajahi berbagai program beasiswa kami yang dirancang untuk mengapresiasi kerja keras dan bakat.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-600 rounded-xl p-10 text-white relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <Star className="text-yellow-400 mb-6" size={48} fill="currentColor" />
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Punya Pertanyaan?</h2>
          <p className="text-indigo-100 mb-8 leading-relaxed font-medium">
            Jika Anda memiliki pertanyaan mengenai kriteria seleksi atau proses administrasi, tim kurasi kami siap membantu menjawab.
          </p>
          <Link to="/complaints" className="inline-flex items-center gap-2 font-bold text-white hover:gap-3 transition-all">
            Hubungi Tim Beasiswa <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scholarships.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:border-indigo-400 transition-all hover:shadow-md"
            >
              <div className="p-8 pb-0">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
                    <GraduationCap size={28} />
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                    s.status === 'open' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                    s.status === 'announced' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                    "bg-slate-50 text-slate-500 border-slate-200"
                  )}>
                    {s.status === 'open' ? 'Dibuka' : s.status === 'announced' ? 'Diumumkan' : 'Ditutup'}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{s.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-3 mb-6 font-medium">
                  {s.description}
                </p>
              </div>

              <div className="px-8 flex-grow">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Benefit Program</p>
                <div className="space-y-2">
                  {s.benefits.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 pb-6 border-b border-slate-100">
                  <Calendar size={14} />
                  DEADLINE: {new Date(s.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {s.status === 'open' ? (
                  <Link
                    to={isStudent ? `/dashboard/apply/${s.id}` : "/login"}
                    className="w-full py-4 bg-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-sm"
                  >
                    Ajukan Pendaftaran
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-lg font-bold border border-slate-200 cursor-not-allowed"
                  >
                    {s.status === 'announced' ? 'Hasil Telah Keluar' : 'Ditutup'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

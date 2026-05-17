import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { GraduationCap, Calendar, CheckCircle2, ArrowRight, Info, Award, Star, Users, Trophy } from 'lucide-react';
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

interface Recipient {
  id: string;
  studentName: string;
  studentClass: string;
  scholarshipName: string;
  awardedAt?: string;
}

export default function ScholarshipPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
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

    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      try {
        const q = query(
          collection(db, 'scholarship_applications'),
          where('status', '==', 'approved'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          studentName: doc.data().studentName,
          studentClass: doc.data().studentClass,
          scholarshipName: doc.data().scholarshipName,
          awardedAt: doc.data().awardedAt || doc.data().submittedAt
        } as Recipient));
        setRecipients(data);
      } catch (error) {
        console.error("Error fetching recipients:", error);
      } finally {
        setLoadingRecipients(false);
      }
    };

    fetchScholarships();
    fetchRecipients();
  }, []);

  return (
    <div className="py-20 px-4 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
        <motion.div
           initial={{ opacity: 0, x: -30 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
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
          className="bg-emerald-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <Star className="text-yellow-400 mb-6" size={48} fill="currentColor" />
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Punya Pertanyaan?</h2>
          <p className="text-emerald-100 mb-8 leading-relaxed font-medium">
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
              className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:border-emerald-400 transition-all hover:shadow-md"
            >
              <div className="p-8 pb-0">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
                    <GraduationCap size={28} />
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                    s.status === 'open' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                    s.status === 'announced' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    "bg-slate-50 text-slate-500 border-slate-200"
                  )}>
                    {s.status === 'open' ? 'Dibuka' : s.status === 'announced' ? 'Diumumkan' : 'Ditutup'}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{s.name}</h3>
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
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100"
                  >
                    Ajukan Pendaftaran
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-bold border border-slate-200 cursor-not-allowed"
                  >
                    {s.status === 'announced' ? 'Hasil Telah Keluar' : 'Ditutup'}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Scholarship Recipients Section */}
      <div className="mt-32 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-sm font-bold mb-4">
              <Trophy size={16} />
              Hall of Fame
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Penerima <span className="text-emerald-600">Beasiswa</span></h2>
            <p className="text-slate-500 font-medium mt-2 max-w-xl">Inilah siswa-siswi berprestasi yang telah berhasil mendapatkan beasiswa melalui proses seleksi objektif.</p>
          </div>
        </div>

        {loadingRecipients ? (
           <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
           </div>
        ) : recipients.length === 0 ? (
          <div className="bg-slate-50 rounded-[3rem] p-20 text-center border border-dashed border-slate-200">
             <Trophy className="mx-auto text-slate-200 mb-6" size={64} />
             <p className="text-lg font-bold text-slate-400">Belum ada pengumuman penerima beasiswa terbaru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recipients.map((recipient, idx) => (
              <motion.div
                key={recipient.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
                
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100 group-hover:rotate-12 transition-transform">
                    <Users size={20} />
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 line-clamp-1">{recipient.studentName}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Kelas {recipient.studentClass}</p>
                  
                  <div className="p-3 bg-slate-50 rounded-xl mb-4">
                    <div className="flex items-center gap-2">
                       <Award size={14} className="text-amber-500" />
                       <span className="text-[10px] font-bold text-slate-700 leading-tight">{recipient.scholarshipName}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Awarded Student</span>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

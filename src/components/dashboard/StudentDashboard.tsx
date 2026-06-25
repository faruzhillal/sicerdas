import { 
  Trophy, 
  GraduationCap, 
  MessageSquare, 
  Clock, 
  ArrowRight, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Award, 
  Edit, 
  Save, 
  X, 
  BookOpen, 
  AlertCircle,
  HelpCircle,
  Briefcase,
  DollarSign
} from 'lucide-react';
import StatCard from './StatCard';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function StudentDashboard() {
  const { currentUser, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'scores' | 'scholarships'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [stats, setStats] = useState({
    rank: '-',
    avgScore: '0',
    scholarshipStatus: 'Belum Ada'
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [userScores, setUserScores] = useState<any>({
    nilaiAkademik: 0,
    nilaiHafalan: 0,
    nilaiPerilaku: 0,
    nilaiPresensi: 0,
    nilaiPenghasilan: 50,
    nilaiTanggungan: 50
  });

  // State for complete student profile loaded from DB
  const [fullProfile, setFullProfile] = useState<any>({
    fullName: '',
    studentId: '',
    nisn: '',
    class: '',
    gender: 'Laki-laki',
    religion: 'Islam',
    birthPlace: '',
    birthDate: '',
    phone: '',
    address: '',
    parentName: '',
    parentJob: '',
    parentIncome: '',
    dependents: '1',
    email: ''
  });

  // Form edit fields
  const [editForm, setEditForm] = useState<any>({ ...fullProfile });
  const [appliedScholarships, setAppliedScholarships] = useState<any[]>([]);
  const [dbClasses, setDbClasses] = useState<string[]>([]);

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      // Fetch dynamic classes first
      let fetchedClasses: string[] = [];
      try {
        const classesSnapshot = await getDocs(query(collection(db, 'classes'), orderBy('name', 'asc')));
        fetchedClasses = classesSnapshot.docs.map(d => d.data().name as string);
      } catch (err) {
        console.warn("Could not fetch classes count in StudentDashboard:", err);
      }
      setDbClasses(fetchedClasses);

      // 1. Fetch full user profile document
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let userData: any = {};
      
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        setFullProfile(userData);
        setEditForm(userData);
      } else {
        const fallback = {
          fullName: profile?.fullName || '',
          studentId: profile?.studentId || '',
          class: profile?.class || 'N/A',
          email: currentUser.email || ''
        };
        setFullProfile(fallback);
        setEditForm(fallback);
      }

      // 2. Fetch evaluation criteria scores (0-100 scale) with self-healing fallback
      const sId = userData.studentId || profile?.studentId || '';
      const scoresDocRef = doc(db, 'criteria_scores', currentUser.uid);
      let scoresDocSnap = await getDoc(scoresDocRef);
      
      if (!scoresDocSnap.exists() && sId) {
        const fallbackRef = doc(db, 'criteria_scores', `student_${sId}`);
        const fallbackSnap = await getDoc(fallbackRef);
        if (fallbackSnap.exists()) {
          const fallbackData = fallbackSnap.data();
          await setDoc(scoresDocRef, fallbackData, { merge: true });
          scoresDocSnap = await getDoc(scoresDocRef);
          try {
            await deleteDoc(fallbackRef);
          } catch (e) {
            console.error("Failed to delete fallback criteria score document:", e);
          }
        }
      }

      let mappedIncomeValue = 50;
      const profileIncome = userData.parentIncome || (profile as any)?.parentIncome || '';
      if (profileIncome) {
        const ranges = [
          '< Rp 1.500.000',
          'Rp 1.500.000 - Rp 3.000.000',
          'Rp 3.000.000 - Rp 5.000.000',
          'Rp 5.000.000 - Rp 7.500.000',
          '> Rp 7.500.000'
        ];
        if (profileIncome === ranges[0]) mappedIncomeValue = 100;
        else if (profileIncome === ranges[1]) mappedIncomeValue = 80;
        else if (profileIncome === ranges[2]) mappedIncomeValue = 60;
        else if (profileIncome === ranges[3]) mappedIncomeValue = 40;
        else if (profileIncome === ranges[4]) mappedIncomeValue = 20;
      }

      const dependentsCount = Number(userData.dependents || (profile as any)?.dependents || '1') || 1;
      const mappedTanggungan = Math.min(100, Math.max(0, dependentsCount * 20 || 50));

      const scoresData = scoresDocSnap.exists() ? scoresDocSnap.data() : {};
      
      const parsedScores = {
        nilaiAkademik: Math.round(Number(scoresData.nilaiAkademik ?? scoresData.academic ?? scoresData.nilai_akademik ?? (scoresData.gpa ? scoresData.gpa * 10 : 80)) || 0),
        nilaiHafalan: Math.round(Number(scoresData.nilaiHafalan ?? scoresData.tahfidz ?? scoresData.nilai_hafalan ?? scoresData.al_quran ?? 80) || 0),
        nilaiPerilaku: Math.round(Number(scoresData.nilaiPerilaku ?? scoresData.behavior ?? scoresData.nilai_perilaku ?? scoresData.akhlak ?? 80) || 0),
        nilaiPresensi: Math.round(Number(scoresData.nilaiPresensi ?? scoresData.attendance ?? scoresData.nilai_presensi ?? scoresData.kehadiran ?? 80) || 0),
        nilaiPenghasilan: Math.round(Number(scoresData.nilaiPenghasilan ?? scoresData.penghasilan_orang_tua ?? mappedIncomeValue) || 50),
        nilaiTanggungan: Math.round(Number(scoresData.nilaiTanggungan ?? scoresData.jumlah_tanggungan ?? mappedTanggungan) || 50)
      };

      setUserScores(parsedScores);

      // Proactively heal ranking document if it's stuck under temporary ID
      if (sId) {
        try {
          const newRankingRef = doc(db, 'rankings', currentUser.uid);
          const newRankingSnap = await getDoc(newRankingRef);
          if (!newRankingSnap.exists()) {
            const oldRankingRef = doc(db, 'rankings', `student_${sId}`);
            const oldRankingSnap = await getDoc(oldRankingRef);
            if (oldRankingSnap.exists()) {
              const oldRankData = oldRankingSnap.data();
              await setDoc(newRankingRef, {
                ...oldRankData,
                studentId: currentUser.uid
              }, { merge: true });
              try {
                await deleteDoc(oldRankingRef);
              } catch (e) {
                console.error("Failed to delete fallback ranking document:", e);
              }
            }
          }
        } catch (e) {
          console.error("Failed to auto-heal ranking document:", e);
        }
      }

      // 3. Average score calculation from evaluation scores
      const evalKeys = ['nilaiAkademik', 'nilaiHafalan', 'nilaiPerilaku', 'nilaiPresensi', 'nilaiPenghasilan', 'nilaiTanggungan'];
      let scoreSum = 0;
      let scoreCount = 0;
      evalKeys.forEach(k => {
        const val = parsedScores[k as keyof typeof parsedScores];
        if (val !== undefined && val !== null) {
          scoreSum += Number(val);
          scoreCount++;
        }
      });
      const averageVal = scoreCount > 0 ? Math.round(scoreSum / scoreCount).toString() : '0';

      // 4. Class Rank Calculation based on published rankings group
      const activeClass = userData.class || profile?.class || '';
      let rankStr = '-';
      if (activeClass) {
        try {
          const rankingsSnap = await getDocs(collection(db, 'rankings'));
          const targetNorm = activeClass.toLowerCase().replace('kelas ', '').trim();
          
          const classRankings = rankingsSnap.docs
            .map(d => {
              const rData = d.data();
              return {
                studentId: rData.studentId || d.id,
                class: rData.class || '',
                score: Number(rData.score) || Number(rData.totalScore) || 0
              };
            })
            .filter(r => {
              if (!r.class) return false;
              const normalizedClass = r.class.toLowerCase().replace('kelas ', '').trim();
              return normalizedClass === targetNorm;
            });

          if (classRankings.length > 0) {
            classRankings.sort((a, b) => b.score - a.score);
            const myIdx = classRankings.findIndex(r => r.studentId === currentUser.uid);
            if (myIdx !== -1) {
              rankStr = `#${myIdx + 1} dari ${classRankings.length}`;
            }
          }
        } catch (err) {
          console.error("Error calculating class rankings gracefully:", err);
        }
      }

      if (rankStr === '-') {
        try {
          const rankingDoc = await getDoc(doc(db, 'rankings', currentUser.uid));
          if (rankingDoc.exists()) {
            const rankData = rankingDoc.data();
            if (rankData && rankData.rank) {
              rankStr = `#${rankData.rank}`;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 5. Fetch scholarship applications
      const appQuery = query(
        collection(db, 'scholarship_applications'),
        where('studentId', '==', currentUser.uid),
        orderBy('submittedAt', 'desc')
      );
      const appSnap = await getDocs(appQuery);
      const scholarshipAppsList = appSnap.docs.map(d => {
        const appD = d.data();
        return {
          id: d.id,
          scholarshipName: appD.scholarshipName || 'Beasiswa',
          status: appD.status || 'pending',
          submittedAt: appD.submittedAt || '',
          sawScore: appD.sawScore !== undefined ? appD.sawScore : null,
          criteriaValues: appD.criteriaValues || {}
        };
      });
      setAppliedScholarships(scholarshipAppsList);

      let scholarshipStatusText = 'Belum Ada';
      const approvedApp = scholarshipAppsList.find(app => app.status === 'approved');
      const pendingApp = scholarshipAppsList.find(app => app.status === 'pending');
      const rejectedApp = scholarshipAppsList.find(app => app.status === 'rejected');

      if (approvedApp) {
        scholarshipStatusText = approvedApp.scholarshipName;
      } else if (pendingApp) {
        scholarshipStatusText = `Pending: ${pendingApp.scholarshipName}`;
      } else if (rejectedApp) {
        scholarshipStatusText = `Belum Lolos: ${rejectedApp.scholarshipName}`;
      }

      setStats({
        rank: rankStr,
        avgScore: averageVal,
        scholarshipStatus: scholarshipStatusText
      });

      // Map up to recent 3 items for overview activities list
      const appActivities = scholarshipAppsList.slice(0, 2).map(app => ({
        id: app.id,
        title: `Pendaftaran ${app.scholarshipName}`,
        type: 'Beasiswa',
        date: app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('id-ID') : 'N/A',
        status: app.status === 'pending' ? 'Menunggu' : app.status === 'approved' ? 'Disetujui' : 'Ditolak'
      }));

      // Combined and fallback activities
      const allAct = [...appActivities];
      if (allAct.length === 0) {
        allAct.push({
          id: 'welcome',
          title: 'Selamat datang di Portal ScholarSPK!',
          type: 'Akademik',
          date: 'Hari ini',
          status: 'Baru'
        });
      }
      setActivities(allAct);

    } catch (e) {
      console.error("Error fetching student dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      setSavingProfile(true);
      
      const updatedData = {
        ...editForm,
        role: 'student', // safety lock
        updatedAt: new Date().toISOString()
      };

      // Ensure no undefined properties are written to Firestore as it throws exceptions
      const cleanData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, v]) => v !== undefined)
      );

      await setDoc(doc(db, 'users', currentUser.uid), cleanData, { merge: true });
      alert("Biodata dan data orang tua berhasil diperbarui!");
      setFullProfile(cleanData);
      setShowEditModal(false);
      fetchDashboardData();
    } catch (e) {
      console.error("Error saving profile details:", e);
      alert("Gagal memperbarui profil: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Dynamic Navigation Tabs */}
      <div className="flex bg-white rounded-3xl border border-slate-100 p-1.5 w-fit shadow-md overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2.5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-2.5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Profil Lengkap
        </button>
        <button
          onClick={() => setActiveTab('scores')}
          className={`px-6 py-2.5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all ${activeTab === 'scores' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Nilai SPK Saya
        </button>
        <button
          onClick={() => setActiveTab('scholarships')}
          className={`px-6 py-2.5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all ${activeTab === 'scholarships' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Riwayat Beasiswa
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-10">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                  label="Peringkat Kelas" 
                  value={stats.rank} 
                  icon={Trophy} 
                  trend="Published SPK" 
                  color="amber"
                />
                <StatCard 
                  label="Rata-rata Kriteria" 
                  value={stats.avgScore} 
                  icon={Clock} 
                  color="emerald"
                />
                <StatCard 
                  label="Program Beasiswa Aktif" 
                  value={stats.scholarshipStatus} 
                  icon={GraduationCap} 
                  color="emerald"
                />
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <section>
                    <h2 className="text-lg font-black text-slate-950 mb-4 tracking-tight uppercase italic">Perkembangan Terakhir</h2>
                    <div className="bg-white rounded-[2rem] border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm">
                      {activities.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                              {item.type === 'Akademik' ? <Trophy size={18} /> : <GraduationCap size={18} />}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{item.date}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="relative rounded-[2.5rem] bg-slate-950 p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                     <div className="relative z-10">
                       <h3 className="text-2xl font-black mb-4 tracking-tight uppercase italic">Ayo Raih Prestasi Gemilang!</h3>
                       <p className="text-slate-400 mb-8 max-w-md leading-relaxed font-medium">
                         Ubah biodata profil Anda agar admin dapat melakukan validasi secara instan untuk kuota seleksi kriteria SAW.
                       </p>
                       <button 
                        onClick={() => {
                          setEditForm({ ...fullProfile });
                          setShowEditModal(true);
                        }}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black flex items-center gap-2 hover:bg-white hover:text-slate-900 transition-all shadow-xl"
                       >
                         Lengkapi Profil Sekarang <ArrowRight size={18} />
                       </button>
                     </div>
                  </section>
                </div>

                <div className="space-y-8">
                  <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Ringkasan Ringkas</h3>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</p>
                          <p className="font-bold text-slate-900 text-sm">{fullProfile.fullName || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NIS / NISN</p>
                          <p className="font-bold text-slate-900 text-sm">
                            {fullProfile.studentId || '-'} / {fullProfile.nisn || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kelas Aktif</p>
                          <p className="font-bold text-slate-900 text-sm">Kelas {fullProfile.class || 'Belum Diatur'}</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="w-full mt-8 py-3 rounded-xl border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-wider"
                    >
                      Detail Informasi Siswa
                    </button>
                  </section>

                  <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                     <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2 text-sm uppercase font-black">
                       <GraduationCap size={18} />
                       Tips Beasiswa
                     </h4>
                     <p className="text-xs text-emerald-700 leading-relaxed font-semibold">
                       Pastikan nilai kriteria Anda diisi dengan benar. Segera hubungi wali kelas atau admin jika terdapat kesalahan input data nilai.
                     </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL PROFILE */}
          {activeTab === 'profile' && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Form Info Grid */}
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden divide-y divide-slate-100">
                <div className="p-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950 tracking-tight mb-1 uppercase">Biodata Siswa Lengkap</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Informasi lengkap diri & data orang tua siswa</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditForm({ ...fullProfile });
                      setShowEditModal(true);
                    }}
                    className="px-5 py-2 rounded-xl border border-emerald-600 text-emerald-600 font-extrabold flex items-center gap-2 hover:bg-emerald-50 transition-all text-xs"
                  >
                    <Edit size={14} />
                    Ubah Data Profil
                  </button>
                </div>

                {/* Section A: Siswa Details */}
                <div className="p-8 space-y-6">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Identitas Utama Siswa</p>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.fullName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">E-mail Terdaftar</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.email || currentUser?.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Nomor Induk Siswa (NIS)</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.studentId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">NISN</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.nisn || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Tempat, Tanggal Lahir</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {fullProfile.birthPlace || '-'}, {fullProfile.birthDate ? new Date(fullProfile.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Kelas Aktif</p>
                      <p className="font-bold text-slate-900 text-sm">Kelas {fullProfile.class || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Jenis Kelamin</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.gender || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Agama</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.religion || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Nomor Telepon</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Alamat Domisili</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.address || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section B: Orang Tua Details */}
                <div className="p-8 space-y-6 bg-slate-50/[0.3]">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Data Orang Tua / Wali</p>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Nama Orang Tua / Wali</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.parentName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Pekerjaan Orang Tua</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.parentJob || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Jumlah Tanggungan Orang Tua</p>
                      <p className="font-bold text-slate-900 text-sm">{fullProfile.dependents || '1'} Orang Anak / Jiwa</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Estimasi Pendapatan Gaji Per Bulan</p>
                      <p className="font-black text-emerald-700 text-sm flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl w-fit">
                        <DollarSign size={14} />
                        {fullProfile.parentIncome || 'Belum Diisi'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Quick Cards */}
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl">
                  <User className="text-emerald-400 mb-6" size={32} />
                  <h3 className="text-lg font-black tracking-tight mb-2 uppercase">Validasi Akun</h3>
                  <p className="text-slate-400 text-xs leading-relaxed font-semibold">
                    Data siswa digunakan admin sebagai parameter filtering beasiswa akademik dan tahfidz secara otomatis demi memastikan transparansi dan integritas program.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SPK CRITERIA SCORES */}
          {activeTab === 'scores' && (
            <div className="space-y-10">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <h2 className="text-xl font-black text-slate-950 tracking-tight mb-1 uppercase">Matriks Penilaian SPK Anda</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Diinput langsung oleh tim administrasi (Skala 0 - 100)</p>
                  </div>
                  <div className="px-5 py-2 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg">
                    Skor Rata-rata: {stats.avgScore}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Score Card 1: Akademik */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between h-40">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kriteria Benefit</span>
                        <Award size={18} className="text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Nilai Akademik</h4>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs text-slate-400 font-bold">Skor</span>
                        <span className="text-lg font-black text-slate-900">{userScores.nilaiAkademik || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all" style={{ width: `${userScores.nilaiAkademik || 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Score Card 2: Tahfidz */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between h-40">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kriteria Benefit</span>
                        <BookOpen size={18} className="text-emerald-500" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Nilai Hafalan / Tahfidz</h4>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs text-slate-400 font-bold">Skor</span>
                        <span className="text-lg font-black text-slate-900">{userScores.nilaiHafalan || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${userScores.nilaiHafalan || 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Score Card 3: Perilaku */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between h-40">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kriteria Benefit</span>
                        <User size={18} className="text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Nilai Perilaku / Akhlak</h4>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs text-slate-400 font-bold">Skor</span>
                        <span className="text-lg font-black text-slate-900">{userScores.nilaiPerilaku || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all" style={{ width: `${userScores.nilaiPerilaku || 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Score Card 4: Presensi */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between h-40">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kriteria Benefit</span>
                        <Clock size={18} className="text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Nilai Presensi / Kehadiran</h4>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs text-slate-400 font-bold">Skor</span>
                        <span className="text-lg font-black text-slate-900">{userScores.nilaiPresensi || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all" style={{ width: `${userScores.nilaiPresensi || 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Score Card 5: Penghasilan */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between h-40">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Kriteria Prioritas</span>
                        <DollarSign size={18} className="text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Penghasilan Orang Tua</h4>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs text-slate-400 font-bold">Skor Kebutuhan (Semakin tinggi semakin diutamakan)</span>
                        <span className="text-lg font-black text-slate-900">{userScores.nilaiPenghasilan || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full transition-all" style={{ width: `${userScores.nilaiPenghasilan || 0}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Score Card 6: Tanggungan */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between h-40">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kriteria Benefit</span>
                        <Briefcase size={18} className="text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Jumlah Tanggungan</h4>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-xs text-slate-400 font-bold">Skor</span>
                        <span className="text-lg font-black text-slate-900">{userScores.nilaiTanggungan || 0}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all" style={{ width: `${userScores.nilaiTanggungan || 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SCHOLARSHIPS HISTORY */}
          {activeTab === 'scholarships' && (
            <div className="space-y-10">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase">Riwayat Pengajuan Beasiswa</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status hasil perhitungan & rekap SAW</p>
                  </div>
                  <div className="px-4 py-1.5 bg-slate-50 rounded-full font-black text-slate-400 text-[10px] uppercase tracking-widest">
                    Total: {appliedScholarships.length} Pengajuan
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Program Beasiswa</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Pengajuan</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Skor SAW Preferensi</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {appliedScholarships.map(app => (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <p className="text-sm font-bold text-slate-900">{app.scholarshipName}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">ID: {app.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-8 py-5 text-xs text-slate-500 font-bold">
                            {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-8 py-5 text-center">
                            {app.sawScore !== null ? (
                              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-black rounded-lg text-xs">
                                {app.sawScore} Poin
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic font-semibold">Mengambil nilai...</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                              app.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {app.status === 'approved' ? 'Diterima' : app.status === 'rejected' ? 'Belum Lolos' : 'Menunggu Seleksi'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {appliedScholarships.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-8 py-16 text-center text-slate-400">
                            <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="font-bold text-slate-600 text-sm">Belum Ada Pengajuan Beasiswa</p>
                            <p className="text-xs text-slate-400 mt-1">Anda belum melamar program beasiswa yang tersedia di platform.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* EDIT MODAL DIALOG POPUP */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-lg font-black text-slate-900 uppercase">Ubah Data Profil & Orang Tua</h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                {/* section: identitas */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-100 pb-2">Identitas Utama</p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                    <input 
                      required
                      type="text" 
                      value={editForm.fullName || ''}
                      onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nomor Induk Siswa (NIS)</label>
                      <input 
                        type="text" 
                        value={editForm.studentId || ''}
                        onChange={e => setEditForm({ ...editForm, studentId: e.target.value })}
                        placeholder="Contoh: 2024010"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">NISN</label>
                      <input 
                        type="text" 
                        value={editForm.nisn || ''}
                        onChange={e => setEditForm({ ...editForm, nisn: e.target.value })}
                        placeholder="10 digit nomor NISN"
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kelas Aktif</label>
                    <select 
                      value={editForm.class || ''}
                      onChange={e => setEditForm({ ...editForm, class: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-bold text-slate-800"
                    >
                      <option value="">Pilih Kelas</option>
                      {dbClasses.length > 0 ? (
                        dbClasses.map((cls) => (
                          <option key={cls} value={cls}>Kelas {cls}</option>
                        ))
                      ) : (
                        ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'].map((cls) => (
                          <option key={cls} value={cls}>Kelas {cls}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tempat Lahir</label>
                      <input 
                        type="text" 
                        value={editForm.birthPlace || ''}
                        onChange={e => setEditForm({ ...editForm, birthPlace: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tanggal Lahir</label>
                      <input 
                        type="date" 
                        value={editForm.birthDate || ''}
                        onChange={e => setEditForm({ ...editForm, birthDate: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jenis Kelamin</label>
                      <select 
                        value={editForm.gender || 'Laki-laki'}
                        onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-bold"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Agama</label>
                      <select 
                        value={editForm.religion || 'Islam'}
                        onChange={e => setEditForm({ ...editForm, religion: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-bold"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Khonghucu">Khonghucu</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nomor Telepon</label>
                    <input 
                      type="text" 
                      value={editForm.phone || ''}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Alamat Lengkap</label>
                    <textarea 
                      rows={2}
                      value={editForm.address || ''}
                      onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    />
                  </div>
                </div>

                {/* section: orang tua */}
                <div className="space-y-4 pt-4">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-100 pb-2">Orang Tua / Wali</p>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Orang Tua / Wali</label>
                    <input 
                      type="text" 
                      value={editForm.parentName || ''}
                      onChange={e => setEditForm({ ...editForm, parentName: e.target.value })}
                      placeholder="Nama ayah / ibu / wali..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pekerjaan Orang Tua</label>
                    <input 
                      type="text" 
                      value={editForm.parentJob || ''}
                      onChange={e => setEditForm({ ...editForm, parentJob: e.target.value })}
                      placeholder="Contoh: Pegawai Swasta, PNS, Wiraswasta"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estimasi Pendapatan Gaji Per Bulan</label>
                    <select 
                      value={editForm.parentIncome || ''}
                      onChange={e => setEditForm({ ...editForm, parentIncome: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-bold"
                    >
                      <option value="">Pilih Range Gaji</option>
                      <option value="< Rp 1.000.000">{'< Rp 1.000.000'}</option>
                      <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                      <option value="Rp 2.500.000 - Rp 5.000.000">Rp 2.500.000 - Rp 5.000.000</option>
                      <option value="Rp 5.000.000 - Rp 7.500.000">Rp 5.000.000 - Rp 7.500.000</option>
                      <option value="> Rp 7.500.000">{'> Rp 7.500.000'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jumlah Tanggungan Orang Tua / Wali</label>
                    <select 
                      value={editForm.dependents || '1'}
                      onChange={e => setEditForm({ ...editForm, dependents: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-bold text-slate-800"
                    >
                      <option value="1">1 Orang Anak / Jiwa</option>
                      <option value="2">2 Orang Anak / Jiwa</option>
                      <option value="3">3 Orang Anak / Jiwa</option>
                      <option value="4">4 Orang Anak / Jiwa</option>
                      <option value="5">5 Orang Anak / Jiwa atau lebih</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 shrink-0">
                  <button 
                    type="submit" 
                    disabled={savingProfile}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

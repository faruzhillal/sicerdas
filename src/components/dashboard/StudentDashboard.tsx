import { Trophy, GraduationCap, MessageSquare, Clock, ArrowRight, Loader2 } from 'lucide-react';
import StatCard from './StatCard';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function StudentDashboard() {
  const { profile, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    rank: '-',
    avgScore: '0',
    scholarshipStatus: 'Belum Ada'
  });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        setLoading(true);
        
        // 1. Fetch criteria and weights
        const criteriaSnapshot = await getDocs(collection(db, 'criteria'));
        const criteriaList = criteriaSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name as string,
          weight: doc.data().weight || 0
        }));

        // 2. Fetch Scores for average
        const scoresDoc = await getDoc(doc(db, 'criteria_scores', currentUser.uid));
        const scoresData = scoresDoc.data() || {};
        
        let total = 0;
        let count = 0;
        criteriaList.forEach(c => {
          if (scoresData[c.id] !== undefined) {
            total += Number(scoresData[c.id]);
            count++;
          }
        });
        const average = count > 0 ? Math.round(total / count).toString() : '0';

        // 3. Dynamic rank calculation based on the student's registered class
        let rankStr = '-';
        if (profile?.class) {
          try {
            // Fetch rankings for members of this class from published rankings
            const classRankQuery = query(
              collection(db, 'rankings'),
              where('class', '==', profile.class)
            );
            const rankSnap = await getDocs(classRankQuery);
            
            if (!rankSnap.empty) {
              const classRankings = rankSnap.docs.map(doc => {
                const data = doc.data();
                return {
                  studentId: data.studentId || doc.id,
                  score: Number(data.score) || 0
                };
              });

              // Sort them descending by score
              classRankings.sort((a, b) => b.score - a.score);

              // Find current student index in their class
              const myClassIndex = classRankings.findIndex(r => r.studentId === currentUser.uid);
              if (myClassIndex !== -1) {
                rankStr = `#${myClassIndex + 1} dari ${classRankings.length}`;
              }
            }
          } catch (rankErr) {
            console.error("Error calculating class rank from rankings collection:", rankErr);
          }
        }

        if (rankStr === '-') {
          // Fallback to absolute published rank doc
          try {
            const rankingDoc = await getDoc(doc(db, 'rankings', currentUser.uid));
            const rankData = rankingDoc.data();
            if (rankData && rankData.rank) {
              rankStr = `#${rankData.rank}`;
            }
          } catch (err) {
            console.error("Error fetching fallback absolute rank:", err);
          }
        }

        // 4. Fetch Applications to check scholarship award detail
        const appQuery = query(
          collection(db, 'scholarship_applications'),
          where('studentId', '==', currentUser.uid),
          orderBy('submittedAt', 'desc')
        );
        const appSnap = await getDocs(appQuery);
        
        let scholarshipStatusText = 'Belum Ada';
        
        const approvedApp = appSnap.docs.find(d => d.data().status === 'approved');
        const pendingApp = appSnap.docs.find(d => d.data().status === 'pending');
        const rejectedApp = appSnap.docs.find(d => d.data().status === 'rejected');

        if (approvedApp) {
          scholarshipStatusText = approvedApp.data().scholarshipName || 'Disetujui';
        } else if (pendingApp) {
          scholarshipStatusText = `Pending: ${pendingApp.data().scholarshipName || 'Seleksi'}`;
        } else if (rejectedApp) {
          scholarshipStatusText = `Belum Lolos: ${rejectedApp.data().scholarshipName || 'Seleksi'}`;
        }

        setStats({
          rank: rankStr,
          avgScore: average,
          scholarshipStatus: scholarshipStatusText
        });

        // Map recent 3 items for activities timeline
        const appList = appSnap.docs.slice(0, 3).map(d => ({ 
          id: d.id, 
          title: `Pendaftaran ${d.data().scholarshipName}`,
          type: 'Beasiswa',
          date: new Date(d.data().submittedAt).toLocaleDateString('id-ID'),
          status: d.data().status === 'pending' ? 'Menunggu' : d.data().status === 'approved' ? 'Disetujui' : 'Ditolak'
        }));

        // 5. Fetch Complaints
        const compQuery = query(
          collection(db, 'complaints'),
          where('studentId', '==', currentUser.uid),
          orderBy('submittedAt', 'desc'),
          limit(2)
        );
        const compSnap = await getDocs(compQuery);
        const compList = compSnap.docs.map(d => ({
          id: d.id,
          title: `Aduan: ${d.data().category}`,
          type: 'Aduan',
          date: new Date(d.data().submittedAt).toLocaleDateString('id-ID'),
          status: d.data().status === 'new' ? 'Baru' : d.data().status === 'in_progress' ? 'Diproses' : 'Selesai'
        }));

        const allActivities = [
          ...appList,
          ...compList,
        ];
        
        if (allActivities.length === 0) {
          allActivities.push({ id: 'welcome', title: 'Selamat Datang!', type: 'Akademik', date: 'Hari ini', status: 'Baru' });
        }

        setActivities(allActivities);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, profile]);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          label="Peringkat Kelas" 
          value={stats.rank} 
          icon={Trophy} 
          trend="SPK Score" 
          color="amber"
        />
        <StatCard 
          label="Rata-rata Nilai" 
          value={stats.avgScore} 
          icon={Clock} 
          color="emerald"
        />
        <StatCard 
          label="Status Beasiswa" 
          value={stats.scholarshipStatus} 
          icon={GraduationCap} 
          color="emerald"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activities/Notifications */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Perkembangan Terakhir</h2>
              <button className="text-sm font-bold text-emerald-600 hover:underline">Lihat Semua</button>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm">
              {activities.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      {item.type === 'Akademik' ? <Trophy size={18} /> : item.type === 'Beasiswa' ? <GraduationCap size={18} /> : <MessageSquare size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="relative rounded-[2.5rem] bg-slate-900 p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/30 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="relative z-10">
                 <h3 className="text-2xl font-extrabold mb-4 tracking-tight">Ayo Kejar Prestasimu!</h3>
                 <p className="text-slate-400 mb-8 max-w-md leading-relaxed font-medium">
                   Dapatkan poin lebih banyak dengan mengikuti kegiatan ekstrakurikuler dan lomba akademik tingkat daerah.
                 </p>
                 <button className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black flex items-center gap-2 hover:bg-emerald-50 transition-all shadow-xl">
                   Info Lomba <ArrowRight size={18} />
                 </button>
               </div>
            </div>
          </section>
        </div>

        {/* Quick Actions/Info */}
        <div className="space-y-8">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-6">Profil Saya</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</p>
                <p className="font-bold text-slate-900">{profile?.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NISN / ID Siswa</p>
                <p className="font-bold text-slate-900">20240501{profile?.uid.slice(0, 4)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kelas Aktif</p>
                <p className="font-bold text-slate-900">Kelas {profile?.class || 'Belum Diatur'}</p>
              </div>
            </div>
            <button className="w-full mt-8 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
              Ubah Data Profil
            </button>
          </section>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
             <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
               <GraduationCap size={18} />
               Tips Beasiswa
             </h4>
             <p className="text-xs text-emerald-700 leading-relaxed font-medium">
               Pastikan sertifikat prestasi sudah diunggah ke portal sebelum batas akhir pendaftaran beasiswa ditutup.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

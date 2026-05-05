import { Trophy, GraduationCap, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import StatCard from './StatCard';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-12">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          label="Peringkat Kelas" 
          value={`#${profile?.class === '1A' ? '4' : '??'}`} 
          icon={Trophy} 
          trend="Top 10%" 
          color="amber"
        />
        <StatCard 
          label="Rata-rata Nilai" 
          value="92.5" 
          icon={Clock} 
          trend="+2.4" 
          color="indigo"
        />
        <StatCard 
          label="Status Beasiswa" 
          value="Menunggu" 
          icon={GraduationCap} 
          color="green"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activities/Notifications */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Perkembangan Terakhir</h2>
              <button className="text-sm font-bold text-indigo-600 hover:underline">Lihat Rapor</button>
            </div>
            <div className="bg-white rounded-[2rem] border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm">
              {[
                { title: 'Nilai Matematika Diperbarui', type: 'Akademik', date: '2 jam yang lalu', value: '95' },
                { title: 'Pendaftaran Beasiswa Tahfidz', type: 'Beasiswa', date: 'Kemarin', status: 'Verifikasi' },
                { title: 'Aduan Fasilitas Kantin', type: 'Aduan', date: '3 hari yang lalu', status: 'Diproses' },
              ].map((item, i) => (
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
                    {item.value ? (
                      <span className="text-lg font-black text-indigo-600">{item.value}</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest">
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="relative rounded-[2.5rem] bg-slate-900 p-8 sm:p-12 text-white overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/30 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="relative z-10">
                 <h3 className="text-2xl font-extrabold mb-4">Ayo Kejar Prestasimu!</h3>
                 <p className="text-slate-400 mb-8 max-w-md leading-relaxed">
                   Dapatkan poin lebih banyak dengan mengikuti kegiatan ekstrakurikuler dan lomba akademik tingkat daerah.
                 </p>
                 <button className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all">
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

          <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
             <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
               <GraduationCap size={18} />
               Tips Beasiswa
             </h4>
             <p className="text-xs text-indigo-700 leading-relaxed">
               Pastikan sertifikat prestasi sudah diunggah ke portal sebelum batas akhir pendaftaran beasiswa ditutup.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

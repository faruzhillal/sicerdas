import { Users, FileText, CheckCircle, Clock, Plus, BarChart3, Settings } from 'lucide-react';
import StatCard from './StatCard';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ students: 0, scholarships: 0, complaints: 0, applications: 0 });
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentDocs = await getDocs(studentQuery);
        const schDocs = await getDocs(collection(db, 'scholarships'));
        const compDocs = await getDocs(collection(db, 'complaints'));
        const appDocs = await getDocs(collection(db, 'scholarship_applications'));
        
        setCounts({
          students: studentDocs.size,
          scholarships: schDocs.size,
          complaints: compDocs.size,
          applications: appDocs.size
        });

        // Mock if empty for display
        if (compDocs.empty) {
           setRecentComplaints([
             { studentName: 'Ahmad Fauzi', category: 'Teknis', status: 'new', submittedAt: new Date().toISOString() },
             { studentName: 'Siti Aminah', category: 'Akademik', status: 'new', submittedAt: new Date().toISOString() },
           ]);
        } else {
          setRecentComplaints(compDocs.docs.map(d => d.data()).slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-12">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Siswa" value={counts.students} icon={Users} color="indigo" />
        <StatCard label="Pendaftar Beasiswa" value={counts.applications} icon={CheckCircle} color="green" />
        <StatCard label="Aduan Masuk" value={counts.complaints} icon={Clock} color="red" />
        <StatCard label="Program Aktif" value={counts.scholarships} icon={BarChart3} color="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Daftar Aduan Terkini</h2>
            <Link 
              to="/dashboard/complaints"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors shadow-lg shadow-indigo-100"
            >
              Lihat Semua
            </Link>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentComplaints.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900 text-sm">{item.studentName}</p>
                      <p className="text-[10px] font-medium text-slate-400">
                        {new Date(item.submittedAt).toLocaleDateString('id-ID')}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                       <span className={cn(
                         "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                         item.status === 'new' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                       )}>
                         {item.status === 'new' ? 'Baru' : 'Selesai'}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                      <button className="text-indigo-600 hover:text-indigo-900 font-bold text-xs uppercase tracking-widest">Detail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full translate-x-1/4 -translate-y-1/4" />
               <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
               <div className="space-y-3">
                 {[
                   { label: 'Update Data Peringkat', icon: Plus, color: 'bg-indigo-600', path: '/dashboard/scores' },
                   { label: 'Tambah Beasiswa', icon: FileText, color: 'bg-green-600', path: '/dashboard/scholarships' },
                   { label: 'Laporan Bulanan', icon: BarChart3, color: 'bg-slate-700', path: '/dashboard' },
                   { label: 'Pengaturan Sistem', icon: Settings, color: 'bg-slate-700', path: '/dashboard' },
                 ].map((action, i) => (
                   <Link 
                     key={i} 
                     to={action.path}
                     className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                   >
                     <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{action.label}</span>
                     <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", action.color)}>
                       <action.icon size={16} />
                     </div>
                   </Link>
                 ))}
               </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-6">Kapasitas Penyimpanan</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-bold text-slate-400">Database Quota</span>
                  <span className="text-xs font-bold text-slate-900">42%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full w-[42%]" />
                </div>
                <p className="text-[10px] text-slate-500 italic">Sistem berjalan dengan optimal di server AI Studio.</p>
             </div>
           </div>
        </section>
      </div>
    </div>
  );
}

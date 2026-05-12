import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Trophy, 
  GraduationCap, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  ChevronRight,
  UserCircle,
  FileText,
  Calculator
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Input Nilai SPK', icon: Trophy, path: '/dashboard/scores' },
    { name: 'Perhitungan SAW', icon: Calculator, path: '/dashboard/saw' },
    { name: 'Program Beasiswa', icon: GraduationCap, path: '/dashboard/scholarships' },
    { name: 'Pengajuan Masuk', icon: FileText, path: '/dashboard/applications' },
    { name: 'Penerima Beasiswa', icon: Trophy, path: '/dashboard/awarded' },
    { name: 'Daftar Aduan', icon: MessageSquare, path: '/dashboard/complaints' },
    { name: 'Data Master Siswa', icon: Users, path: '/dashboard/students' },
    { name: 'Kriteria Penilaian', icon: Settings, path: '/dashboard/criteria' },
    { name: 'Pengelola Akun', icon: UserCircle, path: '/dashboard/accounts' },
  ];

  const adminSections = [
    {
      title: 'Utama',
      links: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Data Siswa', icon: Users, path: '/dashboard/students' },
      ]
    },
    {
      title: 'SPK SAW (Seleksi)',
      links: [
        { name: '1. Kriteria', icon: Settings, path: '/dashboard/criteria' },
        { name: '2. Input Nilai', icon: Trophy, path: '/dashboard/scores' },
        { name: '3. Proses SAW', icon: Calculator, path: '/dashboard/saw' },
      ]
    },
    {
      title: 'Beasiswa & Hasil',
      links: [
        { name: 'Kelola Beasiswa', icon: GraduationCap, path: '/dashboard/scholarships' },
        { name: 'Daftar Pengajuan', icon: FileText, path: '/dashboard/applications' },
        { name: 'Penerima Lolos', icon: GraduationCap, path: '/dashboard/awarded' },
      ]
    },
    {
      title: 'Sistem',
      links: [
        { name: 'Kelola Akun', icon: UserCircle, path: '/dashboard/accounts' },
        { name: 'Daftar Aduan', icon: MessageSquare, path: '/dashboard/complaints' },
      ]
    }
  ];

  const studentLinks = [
    { name: 'Beranda Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Pemeringkatan', icon: Trophy, path: '/ranking' },
    { name: 'Program Beasiswa', icon: GraduationCap, path: '/scholarships' },
    { name: 'Riwayat Aduan', icon: MessageSquare, path: '/dashboard/my-complaints' },
    { name: 'Pusat Aduan', icon: MessageSquare, path: '/complaints' },
  ];

  return (
    <aside className="w-80 h-full bg-white border-r border-slate-100 flex flex-col pt-12 pb-8 sticky top-0 overflow-y-auto scrollbar-hide">
      <div className="px-8 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">ScholarSPK</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Administrator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-10">
        {isAdmin ? (
          adminSections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{section.title}</p>
              <div className="space-y-1">
                {section.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                      location.pathname === link.path 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                    )}
                  >
                    <link.icon size={18} />
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1">
            {studentLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  location.pathname === link.path 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                )}
              >
                <link.icon size={18} />
                {link.name}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="px-4 pt-8 border-t border-slate-50 mt-10">
         <div className="p-6 bg-slate-50 rounded-[2rem] text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Internal System v1.0</p>
            <p className="text-[10px] text-slate-500 font-medium">SD SDQ AL MAHMUDAH</p>
         </div>
      </div>
    </aside>
  );
}

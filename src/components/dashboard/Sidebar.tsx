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
  Calculator,
  Zap,
  School,
  Newspaper,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();

  const adminSections = [
    {
      title: 'Navigasi Utama',
      links: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Kelola Berita', icon: Newspaper, path: '/dashboard/news' },
      ]
    },
    {
      title: 'Data Master Akademik',
      links: [
        { name: 'Data Siswa', icon: Users, path: '/dashboard/students' },
        { name: 'Kelola Kelas', icon: School, path: '/dashboard/classes' },
        { name: 'Kelola Akun', icon: UserCircle, path: '/dashboard/accounts' },
      ]
    },
    {
      title: 'Sistem SPK (Metode SAW)',
      links: [
        { name: 'Kriteria Penilaian', icon: Settings, path: '/dashboard/criteria' },
        { name: 'Input Nilai Evaluasi', icon: Trophy, path: '/dashboard/scores' },
        { name: 'Perhitungan SAW (Umum)', icon: Calculator, path: '/dashboard/saw' },
      ]
    },
    {
      title: 'Manajemen Beasiswa',
      links: [
        { name: 'Kelola Beasiswa', icon: GraduationCap, path: '/dashboard/scholarships' },
        { name: 'Daftar Pengajuan', icon: FileText, path: '/dashboard/applications' },
        { name: 'Seleksi Beasiswa (SAW)', icon: Zap, path: '/dashboard/scholarship-saw' },
        { name: 'Penerima Lolos Seleksi', icon: Trophy, path: '/dashboard/awarded' },
      ]
    },
    {
      title: 'Layanan & Laporan',
      links: [
        { name: 'Cetak & Unduh Laporan', icon: FileText, path: '/dashboard/reports' },
        { name: 'Daftar Keluhan / Aduan', icon: MessageSquare, path: '/dashboard/complaints' },
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
    <aside className="w-80 h-full bg-white border-r border-slate-100 flex flex-col pt-8 pb-8 sticky top-0 overflow-y-auto scrollbar-hide">
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
            <Lightbulb size={24} className="animate-pulse text-yellow-300 fill-yellow-300" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">SiCerdas</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              {isAdmin ? 'Administrator' : `Siswa ${profile?.class ? 'Kelas ' + profile.class : ''}`}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-6">
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
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-emerald-600"
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
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-emerald-600"
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

import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Trophy, 
  GraduationCap, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  ChevronRight,
  UserCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();

  const studentLinks = [
    { name: 'Beranda Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Pemeringkatan', icon: Trophy, path: '/ranking' },
    { name: 'Program Beasiswa', icon: GraduationCap, path: '/scholarships' },
    { name: 'Pusat Aduan', icon: MessageSquare, path: '/complaints' },
  ];

  const adminLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Input Nilai SPK', icon: Trophy, path: '/dashboard/scores' },
    { name: 'Kelola Beasiswa', icon: GraduationCap, path: '/dashboard/scholarships' },
    { name: 'Daftar Aduan', icon: MessageSquare, path: '/dashboard/complaints' },
    { name: 'Data Master Siswa', icon: Users, path: '/dashboard/students' },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden lg:flex">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          {profile?.fullName?.charAt(0) || 'S'}
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight tracking-tight uppercase">SICERDAS</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">SD SDQ AL MAHMUDAH</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all",
              location.pathname === link.path
                ? "bg-indigo-50 text-indigo-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
            )}
          >
            <link.icon size={18} className={cn(
              location.pathname === link.path ? "text-indigo-600" : "text-slate-400"
            )} />
            {link.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 mt-auto">
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Butuh Bantuan?</p>
          <Link 
            to="/complaints"
            className="block w-full text-[11px] font-bold text-center bg-white border border-slate-200 py-2 rounded-lg hover:border-indigo-400 transition-colors shadow-sm"
          >
            Kirim Pengaduan
          </Link>
        </div>
      </div>
    </aside>
  );
}

import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import { LogOut, Bell } from 'lucide-react';
import { auth } from '../lib/firebase';

export default function DashboardPage() {
  const { currentUser, profile, isAdmin, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Dashboard</h2>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-slate-400 hover:text-slate-600 relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none mb-1">{profile?.fullName}</p>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">
                  {isAdmin ? 'Administrator' : `Siswa ${profile?.class || ''}`}
                </p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Keluar"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {isAdmin ? <AdminDashboard /> : <StudentDashboard />}
          </div>
        </main>
      </div>
    </div>
  );
}

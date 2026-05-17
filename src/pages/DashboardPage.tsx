import { useAuth } from '../contexts/AuthContext';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import MyComplaints from '../components/dashboard/MyComplaints';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import ScholarshipApplication from '../components/dashboard/ScholarshipApplication';
import ScoreInput from '../components/dashboard/admin/ScoreInput';
import ScholarshipManager from '../components/dashboard/admin/ScholarshipManager';
import SAWExecution from '../components/dashboard/admin/SAWExecution';
import ApplicationManager from '../components/dashboard/admin/ApplicationManager';
import AwardedStudentsManager from '../components/dashboard/admin/AwardedStudentsManager';
import ComplaintManager from '../components/dashboard/admin/ComplaintManager';
import StudentManager from '../components/dashboard/admin/StudentManager';
import AccountManager from '../components/dashboard/admin/AccountManager';
import CriteriaSettings from '../components/dashboard/admin/CriteriaSettings';
import ScholarshipSAW from '../components/dashboard/admin/ScholarshipSAW';
import ClassManager from '../components/dashboard/admin/ClassManager';
import { LogOut, Bell } from 'lucide-react';
import { auth } from '../lib/firebase';

export default function DashboardPage() {
  const { currentUser, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const handleLogout = () => auth.signOut();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard/scores') return 'Input Nilai SPK';
    if (path === '/dashboard/saw') return 'SPK Monitoring Umum';
    if (path === '/dashboard/scholarship-saw') return 'Seleksi SAW Beasiswa';
    if (path === '/dashboard/scholarships') return 'Kelola Beasiswa';
    if (path === '/dashboard/applications') return 'Pengajuan Masuk';
    if (path === '/dashboard/awarded') return 'Penerima Beasiswa';
    if (path === '/dashboard/complaints') return 'Daftar Aduan';
    if (path === '/dashboard/students') return 'Data Master Siswa';
    if (path === '/dashboard/classes') return 'Kelola Kelas';
    if (path === '/dashboard/accounts') return 'Pengelola Akun';
    if (path === '/dashboard/criteria') return 'Kriteria Penilaian';
    return 'Dashboard Overview';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center shrink-0 z-20">
          <div className="w-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-1 bg-emerald-600 rounded-full mr-2"></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">ScholarSPK Menu</p>
                <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">{getPageTitle()}</h2>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center relative">
                <Bell size={18} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-600 rounded-full border-2 border-white"></span>
              </button>
              <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-slate-900 leading-none mb-1">{profile?.fullName}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                    {isAdmin ? 'Administrator' : `Siswa ${profile?.class || ''}`}
                  </p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center"
                  title="Keluar"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          <div className="p-6">
            {isAdmin ? (
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/scores" element={<ScoreInput />} />
                <Route path="/saw" element={<SAWExecution />} />
                <Route path="/scholarship-saw" element={<ScholarshipSAW />} />
                <Route path="/scholarships" element={<ScholarshipManager />} />
                <Route path="/applications" element={<ApplicationManager />} />
                <Route path="/awarded" element={<AwardedStudentsManager />} />
                <Route path="/complaints" element={<ComplaintManager />} />
                <Route path="/students" element={<StudentManager />} />
                <Route path="/classes" element={<ClassManager />} />
                <Route path="/accounts" element={<AccountManager />} />
                <Route path="/criteria" element={<CriteriaSettings />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="/" element={<StudentDashboard />} />
                <Route path="/apply/:id" element={<ScholarshipApplication />} />
                <Route path="/my-complaints" element={<MyComplaints />} />
              </Routes>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

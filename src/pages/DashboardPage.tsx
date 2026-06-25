import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Routes, Route, useLocation, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
import NewsManagement from '../components/dashboard/admin/NewsManagement';
import ReportsManager from '../components/dashboard/admin/ReportsManager';
import { LogOut, Bell, Check, Trash2, ExternalLink, X, MessageSquare, GraduationCap, AlertCircle } from 'lucide-react';
import { auth } from '../lib/firebase';

export default function DashboardPage() {
  const { currentUser, profile, isAdmin, loading } = useAuth();
  const location = useLocation();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const targetUserId = isAdmin ? 'admin' : currentUser.uid;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', targetUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as any);
      // Sort client-side safely without needing index
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setNotifications(list);
    }, (err) => {
      console.error("Error fetching notifications:", err);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      for (const n of notifications) {
        await deleteDoc(doc(db, 'notifications', n.id));
      }
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return 'Baru saja';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m lalu`;
    if (diffHours < 24) return `${diffHours}j lalu`;
    return `${diffDays}h lalu`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
    if (path === '/dashboard/news') return 'Manajemen Berita Sekolah';
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
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-200/80 z-40 p-5 overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Notifikasi</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {unreadCount} Baru
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {notifications.length > 0 && (
                            <>
                              <button 
                                onClick={handleMarkAllAsRead}
                                className="text-[9px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg transition-all"
                              >
                                Baca Semua
                              </button>
                              <button 
                                onClick={handleClearAll}
                                className="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all"
                              >
                                Bersihkan
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setShowNotifications(false)}
                            className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 italic">
                            <Bell className="mx-auto text-slate-200 mb-2 animate-bounce" size={28} />
                            <p className="text-xs font-bold">Tidak ada notifikasi</p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const IconComponent = notif.type === 'complaint' 
                              ? MessageSquare 
                              : notif.type === 'scholarship' 
                                ? GraduationCap 
                                : AlertCircle;

                            const iconColor = notif.type === 'complaint'
                              ? 'text-sky-500 bg-sky-50'
                              : notif.type === 'scholarship'
                                ? 'text-emerald-500 bg-emerald-50'
                                : 'text-amber-500 bg-amber-50';

                            return (
                              <div 
                                key={notif.id}
                                onClick={() => {
                                  handleMarkAsRead(notif.id);
                                  if (notif.link) {
                                    setShowNotifications(false);
                                  }
                                }}
                                className={`group p-3 rounded-2xl border transition-all flex gap-3 relative cursor-pointer ${
                                  notif.read 
                                    ? 'bg-white border-slate-50 text-slate-600 hover:border-slate-100' 
                                    : 'bg-emerald-50/20 border-emerald-50/50 text-slate-900 hover:border-emerald-100/50'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                                  <IconComponent size={16} />
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <p className="text-xs font-black truncate">{notif.title}</p>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">
                                      {formatTime(notif.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium line-clamp-2">
                                    {notif.message}
                                  </p>
                                  {notif.link && (
                                    <Link 
                                      to={notif.link}
                                      onClick={() => {
                                        handleMarkAsRead(notif.id);
                                        setShowNotifications(false);
                                      }}
                                      className="inline-flex items-center gap-1 mt-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                                    >
                                      Lihat Detail <ExternalLink size={10} />
                                    </Link>
                                  )}
                                </div>
                                <div className="absolute top-3 right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  {!notif.read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsRead(notif.id);
                                      }}
                                      className="p-1 bg-white border border-slate-100 text-emerald-600 hover:bg-emerald-50 rounded-lg shadow-sm"
                                      title="Tandai dibaca"
                                    >
                                      <Check size={10} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteNotification(notif.id, e)}
                                    className="p-1 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shadow-sm"
                                    title="Hapus"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                <Route path="/news" element={<NewsManagement />} />
                <Route path="/reports" element={<ReportsManager />} />
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

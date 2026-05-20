import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, GraduationCap, Trophy, LogIn, LayoutDashboard, MessageSquare, Home, Calendar, Info } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const navItems = [
  { name: 'Beranda', path: '/', icon: Home },
  { name: 'Profil Sekolah', path: '/school-detail', icon: Info },
  { name: 'Pemeringkatan', path: '/ranking', icon: Trophy },
  { name: 'Beasiswa', path: '/scholarships', icon: GraduationCap },
  { name: 'Aduan', path: '/complaints', icon: MessageSquare },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { currentUser, profile } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
                S
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-slate-900 leading-tight tracking-tight uppercase">SICERDAS</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">SD SDQ AL MAHMUDAH</p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  location.pathname === item.path
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon size={16} />
                {item.name}
              </Link>
            ))}

            <div className="h-4 w-px bg-slate-200 mx-4" />

            {currentUser ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-full bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all shadow-sm"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Dashboard</p>
                  <p className="text-xs font-bold text-slate-700 leading-none">
                    {profile?.fullName.split(' ')[0] || 'User'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-600">
                  {profile?.fullName?.charAt(0) || 'U'}
                </div>
              </Link>
            ) : (
              <Link
                to="/login"
                className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <LogIn size={16} />
                Masuk
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-slate-100">
                {currentUser ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-medium"
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white font-medium shadow-lg shadow-slate-200"
                  >
                    <LogIn size={18} />
                    Masuk Akun
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

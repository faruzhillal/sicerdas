import { useState } from 'react';
import { motion } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, LogIn, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create new profile with selected role
        // In a real app, admin role should be restricted!
        await setDoc(docRef, {
          uid: user.uid,
          fullName: user.displayName || 'New User',
          email: user.email,
          role: role,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString()
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal masuk. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100/50 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 sm:p-12 relative z-10 border border-slate-200"
      >
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white mx-auto mb-6 shadow-md shadow-indigo-100">
            <LogIn size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2 uppercase tracking-wide">Portal Masuk</h1>
          <p className="text-sm text-slate-500 font-medium">Sistem Pemeringkatan & Beasiswa Siswa</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-3">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        <div className="flex p-1 bg-slate-100 rounded-md mb-8">
          <button
            onClick={() => setRole('student')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all",
              role === 'student' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <User size={14} />
            SISWA
          </button>
          <button
            onClick={() => setRole('admin')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all",
              role === 'admin' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ShieldAlert size={14} />
            ADMIN
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-12 bg-white border-2 border-slate-200 text-slate-700 rounded-lg font-bold text-sm flex items-center justify-center gap-3 hover:border-indigo-400 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          ) : (
            <>
              <Chrome size={18} className="text-indigo-600" />
              Lanjutkan dengan Google
            </>
          )}
        </button>

        <div className="mt-8 text-center pt-8 border-t border-slate-50">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Keamanan Data Prioritas Kami
          </p>
        </div>
      </motion.div>
    </div>
  );
}

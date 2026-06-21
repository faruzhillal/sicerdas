import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, LogIn, Chrome, Mail, Lock, UserPlus, KeyRound, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [classRoom, setClassRoom] = useState('');
  const [studentId, setStudentId] = useState('');
  const [nisn, setNisn] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentJob, setParentJob] = useState('');
  const [parentIncome, setParentIncome] = useState('');
  const [regStep, setRegStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const provider = new GoogleAuthProvider();
    
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if profile exists
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          // Create new profile with selected role
          await setDoc(docRef, {
            uid: user.uid,
            fullName: user.displayName || 'New User',
            email: user.email,
            role: role,
            photoURL: user.photoURL,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        } else {
          const userData = docSnap.data();
          if (userData.status === 'inactive') {
            await auth.signOut();
            setError('Akun Anda telah dinonaktifkan. Silakan hubungi admin.');
            setLoading(false);
            return;
          }
          await updateDoc(docRef, { lastLogin: new Date().toISOString() });
        }

        navigate('/dashboard');
      } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Email pemulihan password telah dikirim. Silakan cek kotak masuk Anda.');
      setTimeout(() => setMode('login'), 5000);
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        let authResult;
        let resolvedEmail = email;
        
        try {
          // Attempt standard login first
          authResult = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          // If standard auth fails, check if there is a pre-registered student
          const usersRef = collection(db, 'users');
          // Query by email
          let userSnap = await getDocs(query(usersRef, where('email', '==', email)));
          if (userSnap.empty) {
            // Also try querying by username
            userSnap = await getDocs(query(usersRef, where('username', '==', email)));
          }

          if (!userSnap.empty) {
            const userDoc = userSnap.docs[0];
            const userData = userDoc.data();
            
            // Check password match (stored in DB)
            if (userData.password === password) {
              resolvedEmail = userData.email || `${userData.username}@gmail.com`;
              
              try {
                // Try logging in with the resolved email
                authResult = await signInWithEmailAndPassword(auth, resolvedEmail, password);
              } catch (signInErr: any) {
                // If sign in fails (likely account doesn't exist in auth yet), auto register!
                if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/wrong-password') {
                  authResult = await createUserWithEmailAndPassword(auth, resolvedEmail, password);
                } else {
                  throw signInErr;
                }
              }

              const user = authResult.user;
              
              // Move pre-created student data to their real UID doc if needed
              if (userDoc.id !== user.uid) {
                // Set the correct uid structure in users collection
                await setDoc(doc(db, 'users', user.uid), {
                  ...userData,
                  uid: user.uid,
                  status: 'active',
                  lastLogin: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }, { merge: true });

                // Clean up the temporary document
                await deleteDoc(doc(db, 'users', userDoc.id));
              }
            } else {
              throw authErr; // Incorrect password
            }
          } else {
            throw authErr; // Pre-created user not found and standard auth failed
          }
        }

        const user = authResult.user;
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.status === 'inactive') {
            await auth.signOut();
            setError('Akun Anda telah dinonaktifkan. Silakan hubungi admin.');
            setLoading(false);
            return;
          }
          await updateDoc(docRef, { lastLogin: new Date().toISOString() });
        }
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Check if admin pre-created this profile
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        let existingData = {};
        if (!querySnapshot.empty) {
          // If admin pre-created, take that data but prioritize registration fields if they are new
          existingData = querySnapshot.docs[0].data();
          // We might want to delete the old document if it had a temporary ID
          if (querySnapshot.docs[0].id !== user.uid) {
            await deleteDoc(doc(db, 'users', querySnapshot.docs[0].id));
          }
        }

        await setDoc(doc(db, 'users', user.uid), {
          ...existingData,
          uid: user.uid,
          fullName: fullName || (existingData as any).fullName,
          email: user.email,
          role: role,
          class: classRoom || (existingData as any).class,
          studentId: studentId || (existingData as any).studentId,
          nisn: nisn || (existingData as any).nisn,
          phone: phone || (existingData as any).phone,
          address: address || (existingData as any).address,
          parentName: parentName || (existingData as any).parentName,
          parentJob: parentJob || (existingData as any).parentJob,
          parentIncome: parentIncome || (existingData as any).parentIncome,
          status: 'active',
          createdAt: (existingData as any).createdAt || new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (err: any) => {
    console.error(err);
    if (err.code === 'auth/operation-not-allowed') {
      setError('⚠️ AKSI DIPERLUKAN: Admin harus mengaktifkan metode login di Firebase Console. Buka Authentication > Sign-in method > Aktifkan (Enable) Email/Password dan Google.');
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      setError('Email atau password salah.');
    } else if (err.code === 'auth/email-already-in-use') {
      setError('Email sudah terdaftar. Silakan masuk.');
    } else if (err.code === 'auth/weak-password') {
      setError('Password terlalu lemah (minimal 6 karakter).');
    } else if (err.code === 'auth/user-cancelled' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      // These are benign errors usually caused by user action or double clicking
      console.log('Auth popup cancelled or closed.');
      return; // Silent return to avoid showing scary error messages for user-initiated cancellation
    } else if (err.code === 'auth/popup-blocked') {
      setError('Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.');
    } else if (err.code === 'auth/unauthorized-domain') {
      setError('⚠️ KONFIGURASI DIBUTUHKAN: Domain ini belum diizinkan oleh Firebase. Silakan buka Firebase Console > Authentication > Settings > Authorized domains dan tambahkan domain yang Anda gunakan (misal: localhost).');
    } else {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/50 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-10 relative z-10 border border-slate-200"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-100">
            {mode === 'login' ? <LogIn size={32} /> : mode === 'register' ? <UserPlus size={32} /> : <KeyRound size={32} />}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            {mode === 'login' ? 'Selamat Datang' : mode === 'register' ? 'Buat Akun' : 'Reset Password'}
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Sistem Pemeringkatan & Beasiswa Siswa</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        {mode === 'login' && (
          <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button
              onClick={() => setRole('student')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all",
                role === 'student' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <User size={14} />
              SISWA
            </button>
            <button
              onClick={() => setRole('admin')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all",
                role === 'admin' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ShieldAlert size={14} />
              ADMIN
            </button>
          </div>
        )}

        <form onSubmit={mode === 'forgot' ? handleResetPassword : handleEmailAuth} className="space-y-4 mb-8">
          {mode === 'register' && (
            <div className="space-y-6">
              {regStep === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nama lengkap"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelas</label>
                      <input 
                        type="text" 
                        required={role === 'student'}
                        value={classRoom}
                        onChange={(e) => setClassRoom(e.target.value)}
                        placeholder="Contoh: 1A"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIS (No Induk)</label>
                      <input 
                        type="text" 
                        required={role === 'student'}
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="Nomor Induk"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NISN</label>
                    <input 
                      type="text" 
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      placeholder="Nomor Induk Siswa Nasional"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setRegStep(2)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                  >
                    Lanjut: Detail & Ortu
                  </button>
                </div>
              )}

              {regStep === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No WhatsApp</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812xxx"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Orang Tua/Wali</label>
                    <input 
                      type="text" 
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="Nama ayah/ibu"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pekerjaan Orang Tua</label>
                    <input 
                      type="text" 
                      value={parentJob}
                      onChange={(e) => setParentJob(e.target.value)}
                      placeholder="PNS, Buruh, dsb."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                    <textarea 
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Alamat domisili..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penghasilan Orang Tua</label>
                    <select 
                      value={parentIncome}
                      onChange={(e) => setParentIncome(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all bg-white"
                    >
                      <option value="">Pilih Range</option>
                      <option value="< Rp 1.000.000">{'< Rp 1.000.000'}</option>
                      <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                      <option value="Rp 2.500.000 - Rp 5.000.000">Rp 2.500.000 - Rp 5.000.000</option>
                      <option value="> Rp 5.000.000">{'> Rp 5.000.000'}</option>
                    </select>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setRegStep(3)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                  >
                    Lanjut: Akun Login
                  </button>
                  <button type="button" onClick={() => setRegStep(1)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Kembali</button>
                </div>
              )}

              {regStep === 3 && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Sekolah / Aktif</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@sekolah.sch.id"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minta password minimal 6 karakter"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-slate-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-4"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      'Selesaikan Pendaftaran'
                    )}
                  </button>
                  <button type="button" onClick={() => setRegStep(2)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Kembali</button>
                </div>
              )}
            </div>
          )}

          {mode !== 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@sekolah.sch.id"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>
              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Password</label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[9px] font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-widest"
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-slate-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  mode === 'login' ? 'Masuk ke Akun' : 'Kirim Link Reset'
                )}
              </button>
            </>
          )}
          
          {mode === 'forgot' && (
            <button 
              type="button"
              onClick={() => setMode('login')}
              className="w-full py-3 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
            >
              Kembali ke Login
            </button>
          )}
        </form>

        <div className="relative mb-8 text-center overscroll-none">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <span className="relative px-4 bg-white text-[10px] uppercase font-black text-slate-400 tracking-widest">Atau</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:border-emerald-400 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Chrome size={18} className="text-emerald-600" />
          Lanjutkan dengan Google
        </button>

        <div className="mt-10 text-center">
          <button 
            disabled={loading}
            type="button"
            onClick={() => {
              const nextMode = mode === 'login' ? 'register' : 'login';
              setMode(nextMode);
              if (nextMode === 'register') setRole('student');
              setRegStep(1);
            }}
            className="text-xs font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest"
          >
            {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </div>

        <div className="mt-8 text-center pt-8 border-t border-slate-50">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Keamanan Data Prioritas Kami
          </p>
        </div>
      </motion.div>
    </div>
  );
}

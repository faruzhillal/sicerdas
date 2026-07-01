import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, doc, updateDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { Shield, User, Search, Edit2, Trash2, ShieldAlert, Plus, X, Mail, UserCircle, Key } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  password?: string;
  role: 'student' | 'admin';
  status?: 'active' | 'inactive';
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function AccountManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'admin',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(userData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emailKey = formData.email.trim().toLowerCase();
      const p = formData.password || 'password123';

      if (editingUser) {
        // Clean up old email key if edited
        if (editingUser.email && editingUser.email.trim().toLowerCase() !== emailKey) {
          await deleteDoc(doc(db, 'users_lookup', editingUser.email.trim().toLowerCase()));
        }

        await updateDoc(doc(db, 'users', editingUser.uid), {
          ...formData,
          updatedAt: new Date().toISOString()
        });

        // Update/create users_lookup
        await setDoc(doc(db, 'users_lookup', emailKey), {
          uid: editingUser.uid,
          email: emailKey,
          username: '',
          password: p
        }, { merge: true });

      } else {
        const tempId = `user_${Date.now()}`;
        await setDoc(doc(db, 'users', tempId), {
          ...formData,
          uid: tempId,
          createdAt: new Date().toISOString(),
          lastLogin: ''
        });

        // Create users_lookup
        await setDoc(doc(db, 'users_lookup', emailKey), {
          uid: tempId,
          email: emailKey,
          username: '',
          password: p
        }, { merge: true });
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ 
        fullName: '', 
        email: '', 
        password: '',
        role: 'student', 
        status: 'active'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const openEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      password: user.password || '',
      role: user.role || 'student',
      status: user.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm("Hapus akun ini secara permanen? Data profil akan hilang.")) return;
    try {
      const userToDelete = users.find(u => u.uid === uid);
      if (userToDelete && userToDelete.email) {
        await deleteDoc(doc(db, 'users_lookup', userToDelete.email.trim().toLowerCase()));
      }
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const handleManualResetPassword = async (email: string) => {
    if (!window.confirm(`Kirim email pemulihan password ke ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email pemulihan berhasil dikirim.");
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        alert("⚠️ AKSI DIPERLUKAN: Admin harus mengaktifkan metode login di Firebase Console.\n\nCara mengaktifkan:\n1. Buka Firebase Console\n2. Menu Authentication > Sign-in method\n3. Klik 'Add new provider'\n4. Pilih 'Email/Password' dan aktifkan (Enable).");
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'firebase-auth');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Manajemen Akun</h1>
          <p className="text-slate-500 text-sm">Tambahkan, edit, dan atur hak akses pengguna sistem.</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser(null);
            setFormData({ 
              fullName: '', 
              email: '', 
              password: '',
              role: 'student', 
              status: 'active'
            });
            setIsModalOpen(true);
          }}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={20} /> Tambah Akun
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari user berdasarkan nama atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Akun</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Akun</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Terakhir Login</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-medium italic">Memuat data pengguna...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-medium italic">Tidak ada akun ditemukan.</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm uppercase shrink-0">
                        {user.fullName?.charAt(0) || '?'}
                      </div>
                      <p className="text-sm font-bold text-slate-900">{user.fullName || '-'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-8 py-5 text-xs font-mono font-bold text-slate-400">
                    {user.password || '••••••••'}
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit",
                      user.status === 'inactive' ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                    )}>
                      {user.status === 'inactive' ? 'Non-Aktif' : 'Aktif'}
                    </span>
                  </td>
                  <td className="px-8 py-5 animate-in">
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200 bg-slate-50 text-slate-700">
                      {user.role === 'admin' ? 'Admin' : 'Siswa'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-semibold text-slate-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleManualResetPassword(user.email)}
                        className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                        title="Reset Password"
                      >
                        <Key size={14} />
                      </button>
                      <button 
                        onClick={() => openEdit(user)}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        title="Edit User"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.uid)}
                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-emerald-600 p-8 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-1/3 -translate-y-1/3" />
              <div className="flex justify-between items-center mb-4 relative z-10">
                <h2 className="text-xl font-black">{editingUser ? 'Edit Akun' : 'Tambah Akun baru'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <p className="text-emerald-100/80 text-xs font-medium relative z-10 leading-relaxed">
                Silakan isi informasi profil dan kredensial akses pengguna.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    placeholder="Nama lengkap pengguna..."
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Kredensial</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    placeholder="nama@sekolah.sch.id"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    type="text" 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-mono"
                    placeholder={editingUser ? "Kosongkan jika tidak diganti" : "Password akses default..."}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipe Akun</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-white"
                    >
                      <option value="student">Siswa (Student)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Akun</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium bg-white"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Non-Aktif</option>
                    </select>
                  </div>
                </div>

                {editingUser && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Key size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Akses Login</p>
                        <p className="text-[10px] text-slate-500 font-medium">Reset password via email</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleManualResetPassword(formData.email)}
                      className="px-4 py-2 bg-white border border-amber-200 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-sm whitespace-nowrap"
                    >
                      Kirim Reset
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg"
                >
                  {editingUser ? 'Simpan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

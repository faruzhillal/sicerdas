import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Users, UserPlus, Search, MoreVertical, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';
import { cn } from '../../../lib/utils';

interface Student {
  uid: string;
  fullName: string;
  studentId: string;
  email: string;
  class: string;
  role: 'student';
}

export default function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Omit<Student, 'uid'>>({
    fullName: '',
    studentId: '',
    email: '',
    class: '',
    role: 'student'
  });

  useEffect(() => {
    // Fetch classes
    const classQuery = query(collection(db, 'classes'), orderBy('name', 'asc'));
    const unsubscribeClasses = onSnapshot(classQuery, (snapshot) => {
      const classList = snapshot.docs.map(d => d.data().name as string);
      setClasses(classList);
      if (classList.length > 0 && !formData.class) {
        setFormData(prev => ({ ...prev, class: classList[0] }));
      }
    });

    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
      setStudents(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeClasses();
      unsubscribeStudents();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Clean undefined values from formData
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== undefined)
      );

      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), cleanData);
      } else {
        const newRef = doc(collection(db, 'users'));
        await setDoc(newRef, { ...cleanData, uid: newRef.id, role: 'student' });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ fullName: '', studentId: '', email: '', class: classes[0] || '', role: 'student' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'users');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm('Hapus data siswa ini?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setStudents(prev => prev.filter(s => s.uid !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const filteredStudents = students.filter(s => 
    (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.studentId || '').includes(searchTerm) || 
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Data Master Siswa</h1>
          <p className="text-slate-500">Kelola informasi profil, kelas, dan status akademik seluruh siswa.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ fullName: '', studentId: '', email: '', class: classes[0] || '', role: 'student' });
            setShowForm(true);
          }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-lg shadow-indigo-100"
        >
          <UserPlus size={20} />
          Tambah Siswa
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                <input 
                  required
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">NIS</label>
                  <input 
                    required
                    type="text" 
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Kelas</label>
                  <select 
                    value={formData.class}
                    onChange={e => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {classes.length > 0 ? (
                      classes.map(c => <option key={c} value={c}>{c}</option>)
                    ) : (
                      <option disabled>Tambahkan kelas di menu Kelola Kelas</option>
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                type="submit" 
                disabled={saving || classes.length === 0}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {editingId ? 'Simpan Perubahan' : 'Tambah Siswa'}
              </button>
              {classes.length === 0 && <p className="text-[10px] text-rose-500 italic text-center">Silakan buat kelas terlebih dahulu di menu Kelola Kelas.</p>}
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-sm">
        <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari siswa berdasarkan nama, NIS, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profil Siswa</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Memuat data siswa...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Tidak ada data siswa.</td></tr>
              ) : filteredStudents.map((s) => (
                <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                        {s.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{s.fullName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">NIS: {s.studentId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">{s.class}</td>
                  <td className="px-6 py-4 text-slate-500">{s.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                      Aktif
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => {
                          setEditingId(s.uid);
                          setFormData({ 
                            fullName: s.fullName || '', 
                            studentId: s.studentId || '', 
                            email: s.email || '', 
                            class: s.class || '1A', 
                            role: 'student' 
                          });
                          setShowForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteStudent(s.uid)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Plus, Trash2, Edit3, X, Check, Loader2, School } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface SchoolClass {
  id: string;
  name: string;
  description: string;
}

export default function ClassManager() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'classes'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'classes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      const id = editingId || formData.name.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'classes', id), {
        name: formData.name,
        description: formData.description
      }, { merge: true });
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kelas ini?')) return;
    try {
      await deleteDoc(doc(db, 'classes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1 uppercase italic">Kelola <span className="text-indigo-600">Kelas</span></h1>
          <p className="text-slate-500 text-sm font-medium">Tambah atau perbarui daftar kelas di sekolah.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', description: '' });
            setShowForm(true);
          }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black flex items-center gap-2 hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus size={18} /> Tambah Kelas
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white animate-in slide-in-from-top duration-500 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black italic uppercase">{editingId ? 'Edit' : 'Tambah'} Kelas</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Kelas</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: XII RPL 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi (Opsional)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Rekayasa Perangkat Lunak"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-6 py-3 bg-white/5 text-white rounded-xl font-black text-sm hover:bg-white/10 transition-all"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-xl shadow-indigo-900/20"
              >
                <Check size={18} /> Simpan Kelas
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-20 text-slate-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center space-y-4">
           <School className="mx-auto text-slate-200" size={64} />
           <p className="text-slate-400 font-bold italic">Belum ada kelas yang terdaftar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => (
            <div key={c.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-slate-100 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] group-hover:bg-indigo-50 transition-colors flex items-center justify-center pl-4 pb-4">
                <School className="text-slate-200 group-hover:text-indigo-200 transition-colors" size={32} />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-slate-900 mb-2 truncate pr-16">{c.name}</h3>
                <p className="text-slate-500 text-sm font-medium mb-8 min-h-[40px]">{c.description || 'Tidak ada deskripsi'}</p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingId(c.id);
                      setFormData({ name: c.name, description: c.description || '' });
                      setShowForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

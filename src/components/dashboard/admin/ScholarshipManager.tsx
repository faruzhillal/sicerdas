import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, addDoc, doc, updateDoc, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Plus, Search, Calendar, GraduationCap, X, Loader2, Edit3, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';
import { cn } from '../../../lib/utils';

interface Scholarship {
  id: string;
  name: string;
  description: string;
  status: 'open' | 'closed' | 'announced';
  deadline: string;
  benefits: string[];
  weightAcademic?: number;
  weightHafalan?: number;
  weightPerilaku?: number;
  weightPresensi?: number;
  weightPenghasilan?: number;
  weightTanggungan?: number;
}

export default function ScholarshipManager() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Omit<Scholarship, 'id'>>({
    name: '',
    description: '',
    status: 'open',
    deadline: '',
    benefits: [],
    weightAcademic: 0.2,
    weightHafalan: 0.2,
    weightPerilaku: 0.15,
    weightPresensi: 0.15,
    weightPenghasilan: 0.15,
    weightTanggungan: 0.15
  });

  useEffect(() => {
    const q = query(collection(db, 'scholarships'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scholarship));
      setScholarships(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching scholarships:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const totalWeight = 
    (formData.weightAcademic || 0) + 
    (formData.weightHafalan || 0) + 
    (formData.weightPerilaku || 0) + 
    (formData.weightPresensi || 0) + 
    (formData.weightPenghasilan || 0) + 
    (formData.weightTanggungan || 0);

  const applyTemplate = (type: 'academic' | 'hafalan' | 'balanced') => {
    if (type === 'academic') {
      setFormData(prev => ({
        ...prev,
        name: prev.name || 'Beasiswa Akademik',
        weightAcademic: 0.5,
        weightHafalan: 0.1,
        weightPerilaku: 0.1,
        weightPresensi: 0.1,
        weightPenghasilan: 0.1,
        weightTanggungan: 0.1
      }));
    } else if (type === 'hafalan') {
      setFormData(prev => ({
        ...prev,
        name: prev.name || 'Beasiswa Hafalan',
        weightAcademic: 0.1,
        weightHafalan: 0.5,
        weightPerilaku: 0.1,
        weightPresensi: 0.1,
        weightPenghasilan: 0.1,
        weightTanggungan: 0.1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        weightAcademic: 0.2,
        weightHafalan: 0.2,
        weightPerilaku: 0.15,
        weightPresensi: 0.15,
        weightPenghasilan: 0.15,
        weightTanggungan: 0.15
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that the total weight sums up closely to 1.0 (allow small floating point deviation)
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      alert(`Peringatan: Total bobot kriteria harus 100% (1.0). Total saat ini adalah ${(totalWeight * 100).toFixed(0)}%. Silakan sesuaikan kembali bobot kriteria.`);
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateDoc(doc(db, 'scholarships', editingId), formData as any);
      } else {
        await addDoc(collection(db, 'scholarships'), formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ 
        name: '', 
        description: '', 
        status: 'open', 
        deadline: '', 
        benefits: [],
        weightAcademic: 0.2,
        weightHafalan: 0.2,
        weightPerilaku: 0.15,
        weightPresensi: 0.15,
        weightPenghasilan: 0.15,
        weightTanggungan: 0.15
      });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'scholarships');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: Scholarship) => {
    const newStatus = s.status === 'open' ? 'closed' : 'open';
    try {
      await updateDoc(doc(db, 'scholarships', s.id), { status: newStatus });
      setScholarships(prev => prev.map(item => item.id === s.id ? { ...item, status: newStatus } : item));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `scholarships/${s.id}`);
    }
  };

  const deleteScholarship = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus program ini?')) return;
    try {
      await deleteDoc(doc(db, 'scholarships', id));
      setScholarships(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `scholarships/${id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Manajemen Program</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Beasiswa Sekolah</h1>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', description: '', status: 'open', deadline: '', benefits: [] });
            setShowForm(true);
          }}
          className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200"
        >
          <Plus size={18} />
          Program Baru
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Program' : 'Tambah Program Beasiswa'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            {/* Quick Templates Selection */}
            <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preset Cepat Kriteria</p>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => applyTemplate('academic')}
                  className="px-3 py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-bold border border-slate-200 rounded-lg transition-colors flex-1"
                >
                  Akademik
                </button>
                <button 
                  type="button"
                  onClick={() => applyTemplate('hafalan')}
                  className="px-3 py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-bold border border-slate-200 rounded-lg transition-colors flex-1"
                >
                  Hafalan Hafalan
                </button>
                <button 
                  type="button"
                  onClick={() => applyTemplate('balanced')}
                  className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold border border-slate-200 rounded-lg transition-colors flex-1"
                >
                  Seimbang
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Program</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Deskripsi</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              {/* Dynamic Criteria Weight Inputs */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 space-y-3">
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest">Bobot Kriteria Penerima (Total 1.0)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Akademik (0-1.0)</label>
                    <input 
                      type="number" step="0.01" min="0" max="1" required
                      value={formData.weightAcademic ?? 0.2}
                      onChange={e => setFormData({ ...formData, weightAcademic: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Hafalan (0-1.0)</label>
                    <input 
                      type="number" step="0.01" min="0" max="1" required
                      value={formData.weightHafalan ?? 0.2}
                      onChange={e => setFormData({ ...formData, weightHafalan: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Perilaku (0-1.0)</label>
                    <input 
                      type="number" step="0.01" min="0" max="1" required
                      value={formData.weightPerilaku ?? 0.15}
                      onChange={e => setFormData({ ...formData, weightPerilaku: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Presensi (0-1.0)</label>
                    <input 
                      type="number" step="0.01" min="0" max="1" required
                      value={formData.weightPresensi ?? 0.15}
                      onChange={e => setFormData({ ...formData, weightPresensi: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Ekonomi (Gaji) (0-1.0)</label>
                    <input 
                      type="number" step="0.01" min="0" max="1" required
                      value={formData.weightPenghasilan ?? 0.15}
                      onChange={e => setFormData({ ...formData, weightPenghasilan: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Tanggungan (0-1.0)</label>
                    <input 
                      type="number" step="0.01" min="0" max="1" required
                      value={formData.weightTanggungan ?? 0.15}
                      onChange={e => setFormData({ ...formData, weightTanggungan: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="text-xs font-bold flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-500">TOTAL BOBOT:</span>
                  <span className={Math.abs(totalWeight - 1.0) < 0.01 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                    {(totalWeight * 100).toFixed(0)}% / 100%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="open">Dibuka</option>
                    <option value="announced">Diumumkan</option>
                    <option value="closed">Ditutup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Deadline</label>
                  <input 
                    required
                    type="date" 
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {editingId ? 'Simpan Perubahan' : 'Publish Program'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="lg:col-span-3 text-center py-12 text-slate-400">Memuat data...</div>
        ) : scholarships.map((s) => (
          <div key={s.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:border-emerald-400 transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border",
                  s.status === 'open' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                  s.status === 'announced' ? "bg-blue-50 text-blue-600 border-blue-100" :
                  "bg-slate-50 text-slate-500 border-slate-200"
                )}>
                  {s.status === 'open' ? 'Aktif' : s.status === 'announced' ? 'Diumumkan' : 'Ditutup'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{s.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-3 mb-6">
                {s.description}
              </p>
              
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Calendar size={14} />
                Deadline: {new Date(s.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="mt-auto p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => {
                  setEditingId(s.id);
                  setFormData({ 
                    name: s.name || '', 
                    description: s.description || '', 
                    status: s.status || 'open', 
                    deadline: s.deadline || '', 
                    benefits: s.benefits || [] 
                  });
                  setShowForm(true);
                }}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:border-emerald-400 transition-colors"
              >
                <Edit3 size={14} /> Edit
              </button>
              <button 
                onClick={() => toggleStatus(s)}
                className="flex-1 py-2.5 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {s.status === 'open' ? 'Tutup' : 'Buka'}
              </button>
              <button 
                onClick={() => deleteScholarship(s.id)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


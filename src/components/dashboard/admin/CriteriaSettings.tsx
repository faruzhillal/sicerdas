import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Settings, Plus, Save, Trash2, Loader2, Info } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface Criterion {
  id: string;
  name: string;
  weight: number;
  type: 'benefit' | 'cost';
  description: string;
}

export default function CriteriaSettings() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    weight: 0,
    type: 'benefit' as 'benefit' | 'cost',
    description: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'criteria'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Criterion));
      setCriteria(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching criteria:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.weight < 0 || formData.weight > 1) {
      alert("Bobot harus antara 0 dan 1 (contoh: 0.25 untuk 25%)");
      return;
    }

    try {
      setSaving(true);
      const id = editingId || formData.name.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, 'criteria', id), {
        ...formData,
        id
      });
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', weight: 0, type: 'benefit', description: '' });
    } catch (error) {
       handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'criteria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus kriteria ini? Data nilai yang sudah ada mungkin tidak akurat.")) return;
    try {
      await deleteDoc(doc(db, 'criteria', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `criteria/${id}`);
    }
  };

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Pengaturan Kriteria</h1>
          <p className="text-slate-500 text-sm">Tentukan kriteria penilaian dan bobot masing-masing untuk perhitungan SPK.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', weight: 0, type: 'benefit', description: '' });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} />
          Tambah Kriteria
        </button>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-3">
        <Info className="text-emerald-600 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm text-emerald-900 font-medium tracking-tight">Total Bobot Saat Ini: <span className={totalWeight === 1 ? "text-emerald-600" : "text-rose-600"}>{(totalWeight * 100).toFixed(0)}%</span></p>
          <p className="text-xs text-emerald-700 mt-1">Idealnya total bobot seluruh kriteria harus berjumlah 100% (1.0) untuk hasil perhitungan yang akurat.</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">{editingId ? 'Edit Kriteria' : 'Kriteria Baru'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Kriteria</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Hafalan Quran"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bobot (0 - 1.0)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                max="1"
                required
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                placeholder="Contoh: 0.3"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipe Kriteria</label>
              <select 
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'benefit'|'cost' })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
              >
                <option value="benefit">Benefit (Makin Besar Makin Baik)</option>
                <option value="cost">Cost (Makin Kecil Makin Baik)</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Keterangan</label>
              <input 
                type="text" 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={saving}
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                disabled={saving}
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full h-32 flex items-center justify-center text-slate-400 italic">Memuat kriteria...</div>
        ) : criteria.length === 0 ? (
          <div className="col-span-full h-32 flex items-center justify-center text-slate-400 italic">Belum ada kriteria yang dikonfigurasi.</div>
        ) : criteria.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Settings size={20} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingId(c.id);
                    setFormData({ name: c.name, weight: c.weight, type: c.type, description: c.description });
                    setShowForm(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Plus size={16} className="rotate-45" /> {/* Use Plus as Edit icon for simplicity or import more */}
                </button>
                <button 
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{c.name}</h3>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{c.type}</p>
            <p className="text-xs text-slate-400 mb-4">{c.description || 'Tidak ada deskripsi'}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Weight Bobot</span>
              <span className="text-xl font-black text-emerald-600">{(c.weight * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { collection, getDocs, query, doc, updateDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Search, Filter, MessageSquare, CheckCircle, Clock, X, ChevronRight, User as UserIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  category: string;
  status: 'new' | 'in_progress' | 'resolved';
  submittedAt: string;
  adminReply?: string;
  repliedAt?: string;
}

export default function ComplaintManager() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'complaints'), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'in_progress' | 'resolved') => {
    try {
      setSaving(true);
      const updateData: any = { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      if (reply) {
        updateData.adminReply = reply;
        updateData.repliedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'complaints', id), updateData);
      setSelectedComplaint(null);
      setReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `complaints/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredComplaints = complaints.filter(c => 
    c.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Pusat Aduan Siswa</h1>
        <p className="text-slate-500">Tanggapi dan kelola laporan atau keluhan yang dikirimkan oleh siswa.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari aduan atau nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa & Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pesan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Memuat aduan...</td></tr>
              ) : filteredComplaints.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Tidak ada aduan ditemukan.</td></tr>
              ) : filteredComplaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{c.studentName}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {new Date(c.submittedAt).toLocaleDateString('id-ID')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {c.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700 line-clamp-1 max-w-xs">{c.message}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex w-fit items-center gap-1.5",
                      c.status === 'new' ? "bg-rose-50 text-rose-600 border border-rose-100" : 
                      c.status === 'in_progress' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    )}>
                      {c.status === 'new' ? (
                        <><Clock size={12} /> Baru</>
                      ) : c.status === 'in_progress' ? (
                        <><MessageSquare size={12} /> Diproses</>
                      ) : (
                        <><CheckCircle size={12} /> Selesai</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedComplaint(c)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase tracking-widest flex items-center gap-1 ml-auto"
                    >
                      Buka <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedComplaint.studentName}</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{selectedComplaint.category}</p>
                </div>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pesan Aduan</p>
                <div className="p-4 bg-slate-50 rounded-xl text-sm border border-slate-100 leading-relaxed text-slate-700">
                  {selectedComplaint.message}
                </div>
              </div>

              {selectedComplaint.status !== 'resolved' && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tanggapan Administrator</p>
                  <textarea 
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Tulis tanggapan atau instruksi penyelesaian di sini..."
                    className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                {selectedComplaint.status === 'new' && (
                  <button 
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'in_progress')}
                    disabled={saving}
                    className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    Mulai Proses
                  </button>
                )}
                <button 
                  onClick={() => handleUpdateStatus(selectedComplaint.id, 'resolved')}
                  disabled={saving || !reply}
                  className="flex-[2] py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors disabled:opacity-50"
                >
                  Tandai Selesai & Kirim Balasan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


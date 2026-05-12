import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Clock, CheckCircle2, AlertCircle, ChevronRight, X, User, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Complaint {
  id: string;
  category: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  submittedAt: string;
  adminReply?: string;
  repliedAt?: string;
}

export default function MyComplaints() {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'complaints'),
      where('studentId', '==', currentUser.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
      setComplaints(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching my complaints:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Riwayat Aduan Saya</h1>
          <p className="text-slate-500 text-sm">Pantau status dan jawaban dari laporan yang Anda kirimkan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400 italic">Memuat aduan...</div>
          ) : complaints.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
                <MessageSquare size={32} />
              </div>
              <p className="text-sm font-bold text-slate-400">Belum ada aduan</p>
              <p className="text-xs text-slate-300 mt-1">Gunakan fitur aduan untuk mengirimkan kritik atau saran.</p>
            </div>
          ) : complaints.map((c) => (
            <div 
              key={c.id}
              onClick={() => setSelectedComplaint(c)}
              className={cn(
                "p-5 rounded-3xl border transition-all cursor-pointer group",
                selectedComplaint?.id === c.id 
                  ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200" 
                  : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    c.status === 'resolved' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                  )}>
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{c.category}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {new Date(c.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                  c.status === 'new' ? "bg-rose-50 text-rose-600" : 
                  c.status === 'in_progress' ? "bg-amber-50 text-amber-600" :
                  "bg-emerald-50 text-emerald-600"
                )}>
                  {c.status === 'new' ? 'Baru' : c.status === 'in_progress' ? 'Diproses' : 'Selesai'}
                </div>
              </div>
              
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                {c.message}
              </p>

              {c.adminReply && (
                <div className="mt-2 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Administrator telah membalas</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="md:sticky md:top-8 h-fit">
          {selectedComplaint ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                      Detail Aduan
                    </span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedComplaint.category}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedComplaint(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-slate-400">
                     <User size={14} />
                     <p className="text-[10px] font-bold uppercase tracking-widest">Pesan Anda</p>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                     <p className="text-sm text-slate-700 leading-relaxed font-medium">
                       {selectedComplaint.message}
                     </p>
                     <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                       Dikirim pada {new Date(selectedComplaint.submittedAt).toLocaleString('id-ID')}
                     </p>
                   </div>
                </div>

                {selectedComplaint.adminReply ? (
                  <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck size={14} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Balasan Administrator</p>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 relative group">
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 size={16} />
                      </div>
                      <p className="text-sm text-emerald-900 leading-relaxed font-bold italic">
                        "{selectedComplaint.adminReply}"
                      </p>
                      {selectedComplaint.repliedAt && (
                        <p className="mt-4 text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest">
                          Dibalas pada {new Date(selectedComplaint.repliedAt).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-900">Menunggu Balasan</p>
                      <p className="text-[10px] text-amber-700/70 font-medium">Administrator sedang meninjau laporan Anda.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] text-center">
               <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                 <AlertCircle size={40} />
               </div>
               <h3 className="text-lg font-bold text-slate-400 mb-2">Detail Aduan</h3>
               <p className="text-xs text-slate-300 max-w-[220px] leading-relaxed font-medium">
                 Pilih salah satu laporan di daftar riwayat untuk melihat isi pesan dan balasan dari administrator.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

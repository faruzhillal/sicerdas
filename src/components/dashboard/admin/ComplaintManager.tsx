import React, { useState, useEffect } from 'react';
import { collection, query, doc, updateDoc, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { Search, MessageSquare, CheckCircle, Clock, X, ChevronRight, User as UserIcon, Send, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'admin';
  message: string;
  timestamp: any;
}

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
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

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

  useEffect(() => {
    if (!selectedComplaint) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const q = query(
      collection(db, 'complaints', selectedComplaint.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedComplaint]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !reply.trim() || !currentUser) return;

    try {
      setSaving(true);
      
      // 1. Add message to subcollection
      await addDoc(collection(db, 'complaints', selectedComplaint.id, 'messages'), {
        senderId: currentUser.uid,
        senderName: 'Administrator',
        senderRole: 'admin',
        message: reply,
        timestamp: serverTimestamp()
      });

      // 2. Update complaint status and last reply
      const newStatus = selectedComplaint.status === 'new' ? 'in_progress' : selectedComplaint.status;
      await updateDoc(doc(db, 'complaints', selectedComplaint.id), {
        status: newStatus,
        adminReply: reply,
        repliedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });

      setReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `complaints/${selectedComplaint.id}/messages`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'resolved' | 'in_progress') => {
    try {
      setSaving(true);
      await updateDoc(doc(db, 'complaints', id), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      if (newStatus === 'resolved') setSelectedComplaint(null);
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
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-wrap gap-6 justify-between items-center bg-slate-50/30">
          <div className="flex-1 min-w-[300px]">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Manajemen Laporan</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari aduan atau nama siswa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm font-bold text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Laporan</p>
                <p className="text-xl font-black text-slate-900 leading-none">{complaints.length}</p>
             </div>
             <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                <MessageSquare size={18} />
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa & Tanggal</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesan Awal</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-16 text-center text-slate-400 italic font-bold">Memuat data aduan...</td></tr>
              ) : filteredComplaints.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-16 text-center text-slate-400 italic">Tidak ada aduan yang terdaftar.</td></tr>
              ) : filteredComplaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{c.studentName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(c.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600">
                      {c.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-medium text-slate-600 line-clamp-1 max-w-[200px]">{c.message}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex w-fit items-center gap-1.5",
                      c.status === 'new' ? "bg-emerald-600 text-white shadow-sm" : 
                      c.status === 'in_progress' ? "bg-emerald-100 text-emerald-700" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {c.status === 'new' ? (
                        <><Clock size={12} /> Baru</>
                      ) : c.status === 'in_progress' ? (
                        <><MessageSquare size={12} /> Diproses</>
                      ) : (
                        <><CheckCircle size={12} /> Selesai</>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => setSelectedComplaint(c)}
                      className="px-4 py-2 border-2 border-slate-100 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ml-auto hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                    >
                      Respon Chat <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">{selectedComplaint.studentName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{selectedComplaint.category}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                    <span className="text-[10px] font-bold text-slate-400 italic">Chat Interaktif</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)} 
                className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20">
                {/* Initial Message */}
                <div className="flex flex-col items-start max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2 ml-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aduan Awal</p>
                    </div>
                    <div className="p-5 bg-white border border-slate-100 rounded-[2rem] rounded-tl-none shadow-sm shadow-slate-200/50">
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">
                            {selectedComplaint.message}
                        </p>
                        <p className="mt-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            {new Date(selectedComplaint.submittedAt).toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>

                {/* Subcollection Messages */}
                {loadingMessages ? (
                  <div className="flex justify-center p-4">
                    <Loader2 size={24} className="animate-spin text-emerald-400" />
                  </div>
                ) : messages.map((msg) => (
                    <div key={msg.id} className={cn(
                        "flex flex-col max-w-[85%]",
                        msg.senderRole === 'admin' ? "items-end ml-auto text-right" : "items-start mr-auto"
                    )}>
                        <div className={cn(
                            "flex items-center gap-2 mb-2",
                            msg.senderRole === 'admin' ? "mr-4" : "ml-4"
                        )}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {msg.senderRole === 'admin' ? 'Administrator' : msg.senderName}
                            </p>
                        </div>
                        <div className={cn(
                            "p-5 rounded-[2rem] shadow-sm",
                            msg.senderRole === 'admin' 
                                ? "bg-emerald-600 text-white rounded-tr-none shadow-emerald-200" 
                                : "bg-white border border-slate-100 rounded-tl-none shadow-slate-200/50"
                        )}>
                            <p className={cn(
                                "text-sm font-bold leading-relaxed",
                                msg.senderRole === 'admin' ? "text-emerald-50" : "text-slate-700"
                            )}>
                                {msg.message}
                            </p>
                            <p className={cn(
                                "mt-3 text-[9px] font-bold uppercase tracking-widest",
                                msg.senderRole === 'admin' ? "text-emerald-300" : "text-slate-400"
                            )}>
                                {msg.timestamp?.toDate() ? msg.timestamp.toDate().toLocaleString('id-ID') : 'Baru saja'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-slate-50 bg-white">
              <div className="flex items-center gap-4 mb-4">
                 {selectedComplaint.status !== 'resolved' ? (
                   <button 
                      onClick={() => handleUpdateStatus(selectedComplaint.id, 'resolved')}
                      className="px-4 py-2 border-2 border-emerald-100 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                   >
                     Tandai Selesai
                   </button>
                 ) : (
                  <button 
                    onClick={() => handleUpdateStatus(selectedComplaint.id, 'in_progress')}
                    className="px-4 py-2 border-2 border-amber-100 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all"
                  >
                    Buka Kembali
                  </button>
                 )}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input 
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Ketik balasan Anda..."
                  disabled={selectedComplaint.status === 'resolved'}
                  className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={saving || !reply.trim() || selectedComplaint.status === 'resolved'}
                  className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

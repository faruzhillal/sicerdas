import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Clock, CheckCircle2, AlertCircle, X, User, ShieldCheck, Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { handleFirestoreError, OperationType } from '../../lib/firebase-errors';

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
  category: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  submittedAt: string;
  studentName?: string;
}

export default function MyComplaints() {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

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
        senderName: currentUser.displayName || 'Siswa',
        senderRole: 'student',
        message: reply,
        timestamp: serverTimestamp()
      });

      // 2. Alert admin by updating complaint timestamp (and maybe status back to in_progress if it was resolved but student replied)
      await updateDoc(doc(db, 'complaints', selectedComplaint.id), {
        updatedAt: serverTimestamp(),
        // If they reply to a resolved one, it stays resolved unless admin re-opens, 
        // or we can auto-change back to in_progress. Let's keep it in_progress if it's resolved?
        // Actually usually resolved is terminal. Let's just update timestamp.
      });

      setReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `complaints/${selectedComplaint.id}/messages`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">Riwayat <span className="text-emerald-600">Aduan</span></h1>
          <p className="text-slate-500 text-sm font-medium">Pantau status dan diskusikan laporan Anda secara real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400 italic">Memuat data aduan...</div>
          ) : complaints.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
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
                "p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden",
                selectedComplaint?.id === c.id 
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xl scale-[1.02]" 
                  : "bg-white border-slate-100 hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-50/50"
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                    selectedComplaint?.id === c.id 
                        ? "bg-white/10 text-white" 
                        : (c.status === 'resolved' ? "bg-emerald-50 text-emerald-600" : "bg-emerald-50 text-emerald-600")
                  )}>
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-tight">{c.category}</h3>
                    <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        selectedComplaint?.id === c.id ? "text-slate-400" : "text-slate-400"
                    )}>
                      {new Date(c.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                  c.status === 'new' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                  c.status === 'in_progress' ? "bg-emerald-100/50 text-emerald-700" :
                  "bg-slate-100 text-slate-500"
                )}>
                  {c.status === 'new' ? 'Baru' : c.status === 'in_progress' ? 'Diproses' : 'Selesai'}
                </div>
              </div>
              
              <p className={cn(
                  "text-xs line-clamp-2 leading-relaxed mb-2 font-medium",
                  selectedComplaint?.id === c.id ? "text-slate-300" : "text-slate-500"
              )}>
                {c.message}
              </p>
            </div>
          ))}
        </div>

        <div className="md:sticky md:top-8 h-[75vh] flex flex-col">
          {selectedComplaint ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Chat Header */}
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedComplaint.category}</h2>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ruang Obrolan Aduan</p>
                    </div>
                    <button 
                        onClick={() => setSelectedComplaint(null)}
                        className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20">
                    {/* Initial User Message */}
                    <div className="flex flex-col items-end ml-auto max-w-[85%]">
                        <div className="p-5 bg-emerald-600 text-white rounded-[2rem] rounded-tr-none shadow-lg shadow-emerald-100">
                             <p className="text-sm font-bold leading-relaxed">
                                 {selectedComplaint.message}
                             </p>
                             <p className="mt-3 text-[9px] text-emerald-300 font-bold uppercase tracking-widest">
                                Dikirim pada {new Date(selectedComplaint.submittedAt).toLocaleString('id-ID')}
                            </p>
                        </div>
                    </div>

                    {/* Messages Thread */}
                    {loadingMessages ? (
                        <div className="flex justify-center p-4">
                            <Loader2 size={24} className="animate-spin text-emerald-400" />
                        </div>
                    ) : messages.map((msg) => (
                        <div key={msg.id} className={cn(
                            "flex flex-col max-w-[85%]",
                            msg.senderRole === 'student' ? "items-end ml-auto text-right" : "items-start mr-auto"
                        )}>
                            <div className={cn(
                                "flex items-center gap-2 mb-2",
                                msg.senderRole === 'student' ? "mr-4" : "ml-4"
                            )}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    {msg.senderRole === 'admin' ? (
                                        <span className="flex items-center gap-1 text-emerald-600">
                                            <ShieldCheck size={10} /> Administrator
                                        </span>
                                    ) : 'Saya'}
                                </p>
                            </div>
                            <div className={cn(
                                "p-5 rounded-[2rem] shadow-sm transition-all",
                                msg.senderRole === 'student' 
                                    ? "bg-emerald-600 text-white rounded-tr-none shadow-emerald-100" 
                                    : "bg-white border border-slate-100 rounded-tl-none shadow-slate-200/50"
                            )}>
                                <p className={cn(
                                    "text-sm font-bold leading-relaxed",
                                    msg.senderRole === 'student' ? "text-emerald-50" : "text-slate-700"
                                )}>
                                    {msg.message}
                                </p>
                                <p className={cn(
                                    "mt-3 text-[9px] font-bold uppercase tracking-widest",
                                    msg.senderRole === 'student' ? "text-emerald-300" : "text-slate-400"
                                )}>
                                    {msg.timestamp?.toDate() ? msg.timestamp.toDate().toLocaleString('id-ID') : 'Baru saja'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat Input */}
                <div className="p-6 border-t border-slate-50 bg-white">
                    {selectedComplaint.status === 'resolved' && (
                        <div className="mb-4 p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Aduan telah diselesaikan oleh admin.</p>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <input 
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder={selectedComplaint.status === 'resolved' ? "Chat ditutup (sudah selesai)" : "Ketik pesan/tanya kembali..."}
                            disabled={saving || selectedComplaint.status === 'resolved'}
                            className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-sm disabled:opacity-50"
                        />
                        <button 
                            type="submit"
                            disabled={saving || !reply.trim() || selectedComplaint.status === 'resolved'}
                            className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-slate-900 transition-all shadow-xl shadow-emerald-200/50 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        </button>
                    </form>
                </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] text-center">
               <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                 <AlertCircle size={40} />
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Detail Aduan</h3>
               <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed font-bold uppercase tracking-widest">
                 Pilih laporan untuk memulai diskusi dengan administrator.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

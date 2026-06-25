import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { createAdminNotification } from '../lib/notifications';
import { motion } from 'motion/react';
import { MessageSquare, Send, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function ComplaintsPage() {
  const { currentUser, profile, loading: authLoading } = useAuth();
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Akademik');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (authLoading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const studentName = profile?.fullName || 'Anonymous';
      await addDoc(collection(db, 'complaints'), {
        studentId: currentUser.uid,
        studentName,
        message,
        category,
        status: 'new',
        submittedAt: new Date().toISOString()
      });
      await createAdminNotification(
        'Aduan Baru Masuk',
        `Siswa ${studentName} mengirimkan aduan: "${message.substring(0, 40)}${message.length > 40 ? '...' : ''}"`,
        'complaint',
        '/dashboard/complaints'
      );
      setSubmitted(true);
      setMessage('');
    } catch (error) {
      console.error("Error submitting complaint:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 px-4 max-w-7xl mx-auto min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="grid lg:grid-cols-2 gap-16 items-center w-full">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-semibold mb-6">
            <AlertCircle size={16} />
            Pusat Bantuan & Pengaduan
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-8">Kami Melayani <span className="text-emerald-500">Aduan & Saran</span> Anda</h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-10">
            Punya masalah teknis, kendala akademik, atau saran untuk perbaikan sistem kami? Jangan ragu untuk menyampaikannya. Tim kami akan menindaklanjuti dalam waktu maksimal 2x24 jam kerja.
          </p>

          <div className="space-y-6">
            {[
              { icon: MessageSquare, title: 'Respon Cepat', desc: 'Tim admin stand-by di jam kerja.' },
              { icon: Info, title: 'Privasi Terjamin', desc: 'Aduan Anda hanya dapat dilihat oleh tim berwenang.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center text-emerald-500 border border-slate-50 shrink-0">
                  <item.icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-white p-8 sm:p-12"
        >
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Berhasil Terkirim!</h2>
              <p className="text-slate-500 mb-8 leading-relaxed px-6">
                Terima kasih atas laporan Anda. Silakan cek perkembangan status aduan Anda di Dashboard secara berkala.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100"
              >
                Kirim Aduan Lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">Kategori Masalah</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Akademik', 'Teknis', 'Fasilitas', 'Lainnya'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "py-3 rounded-xl text-sm font-bold transition-all border",
                        category === cat
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">Pesan Lengkap</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ceritakan detail masalah atau saran Anda di sini..."
                  className="w-full min-h-[160px] p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-200 transition-all text-slate-700 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 hover:-translate-y-1 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:pointer-events-none group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Kirim Sekarang
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

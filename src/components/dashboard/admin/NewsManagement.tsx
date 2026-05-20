import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Plus, Pencil, Trash2, X, Save, Image as ImageIcon, Calendar, Tag, Type, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';
import { cn } from '../../../lib/utils';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageURL?: string;
  category: string;
  publishedAt: string;
}

export default function NewsManagement() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageURL: '',
    category: 'Edukasi'
  });

  const categories = ['Edukasi', 'Prestasi', 'Kompetisi', 'Kegiatan', 'Pengumuman'];

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const q = query(collection(db, 'news'), orderBy('publishedAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem));
      setNews(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'news');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        const docRef = doc(db, 'news', editingItem.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'news'), {
          ...formData,
          publishedAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', content: '', imageURL: '', category: 'Edukasi' });
      fetchNews();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'news');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus berita ini?')) return;
    try {
      await deleteDoc(doc(db, 'news', id));
      fetchNews();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'news');
    }
  };

  const openModal = (item?: NewsItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        content: item.content,
        imageURL: item.imageURL || '',
        category: item.category
      });
    } else {
      setEditingItem(null);
      setFormData({ title: '', content: '', imageURL: '', category: 'Edukasi' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic">Manajemen <span className="text-emerald-600">Berita</span></h2>
          <p className="text-slate-500 font-medium text-sm">Kelola berita dan kegiatan terbaru sekolah</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus size={20} />
          Tambah Berita
        </button>
      </div>

      {loading && news.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
              <div className="h-40 bg-slate-100 relative">
                {item.imageURL ? (
                  <img src={item.imageURL} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={48} />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-black text-emerald-600 uppercase">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-slate-500 text-xs mb-6 line-clamp-2">{item.content}</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(item.publishedAt).toLocaleDateString('id-ID')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 uppercase italic">
                  {editingItem ? 'Edit' : 'Tambah'} <span className="text-emerald-600">Berita</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    <Type size={14} /> Judul Berita
                  </label>
                  <input
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                    placeholder="Masukkan judul berita..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      <Tag size={14} /> Kategori
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium appearance-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      <ImageIcon size={14} /> URL Gambar
                    </label>
                    <input
                      value={formData.imageURL}
                      onChange={e => setFormData({ ...formData, imageURL: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                    <AlignLeft size={14} /> Konten Berita
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium resize-none"
                    placeholder="Tulis isi berita di sini..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 hover:-translate-y-1 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
                >
                  {loading ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={20} />
                      Simpan Berita
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

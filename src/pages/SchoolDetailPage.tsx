import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Info, Target, Eye, BookOpen, Clock, Calendar, ArrowRight, MapPin, Phone, Mail, Globe, Share2, AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import schoolHeroImg from '../assets/images/regenerated_image_1782052774830.png';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageURL?: string;
  category: string;
  publishedAt: string;
}

export default function SchoolDetailPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const q = query(collection(db, 'news'), orderBy('publishedAt', 'desc'), limit(3));
        const snapshot = await getDocs(q);
        const newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem));
        
        if (newsData.length === 0) {
          // Provide mock data if collection is empty
          setNews([
            {
              id: '1',
              title: 'SDQ Al Mahmudah Raih Penghargaan Sekolah Sehat 2024',
              content: 'Sekolah Dasar Quran Al Mahmudah berhasil meraih predikat sebagai Sekolah Sehat Tingkat Provinsi tahun 2024. Prestasi ini diraih berkat dedikasi seluruh staf dan siswa. Kriteria penilaian meliputi kebersihan lingkungan, fasilitas kesehatan sekolah, serta program kesehatan bagi siswa dan guru. Kepala sekolah menyatakan bahwa penghargaan ini adalah awal untuk terus meningkatkan kualitas lingkungan belajar yang sehat dan nyaman.',
              imageURL: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800',
              category: 'Prestasi',
              publishedAt: new Date().toISOString()
            },
            {
              id: '2',
              title: 'Kunjungan Edukasi ke Planetarium: Menjelajah Luar Angkasa',
              content: 'Siswa kelas 4 dan 5 melakukan kunjungan edukasi ke Planetarium Jakarta untuk belajar lebih dalam tentang tata surya dan benda langit lainnya. Dalam kunjungan ini, siswa diajak menyaksikan pertunjukan simulasi langit malam dan belajar mengenai rasi bintang. Kegiatan ini bertujuan untuk meningkatkan minat siswa terhadap ilmu pengetahuan alam dan astronomi sejak dini.',
              imageURL: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
              category: 'Edukasi',
              publishedAt: new Date(Date.now() - 86400000 * 2).toISOString()
            },
            {
              id: '3',
              title: 'Lomba Tahfidz Al-Quran Antar Sekolah Dasar',
              content: 'Pendaftaran lomba Tahfidz Al-Quran tingkat SD/MI kini telah dibuka. Mari tunjukkan kemampuan menghafal ayat-ayat suci Al-Quran dan dapatkan hadiah menarik. Lomba ini terbuka untuk kategori Juz 30 dan Juz 1. Pendaftaran dapat dilakukan melalui website sekolah atau datang langsung ke kantor administrasi pada jam kerja. Mari jadikan kesempatan ini sebagai sarana dakwah dan syiar Al-Quran.',
              imageURL: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=800',
              category: 'Kompetisi',
              publishedAt: new Date(Date.now() - 86400000 * 5).toISOString()
            }
          ]);
        } else {
          setNews(newsData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'news');
        console.error("Error fetching news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={schoolHeroImg} 
            alt="School Exterior" 
            className="w-full h-full object-cover filter brightness-[0.4]"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase italic">
              Tentang <span className="text-emerald-400">Sekolah Kami</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto font-medium">
              Mendidik generasi qurani yang cerdas, berakhlak mulia, dan siap menghadapi tantangan masa depan.
            </p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      <div className="max-w-7xl mx-auto px-4 py-20">
        {/* Profile Grid */}
        <div className="grid lg:grid-cols-2 gap-20 items-start mb-32">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold mb-6">
              <Info size={16} />
              Profil Sekolah
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-8">SD SDQ <span className="text-emerald-600">Al Mahmudah</span></h2>
            <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
              <p>
                SD SDQ Al Mahmudah didirikan dengan visi besar untuk menggabungkan kurikulum pendidikan nasional dengan penguatan nilai-nilai Al-Quran yang mendalam. Kami percaya bahwa setiap anak memiliki potensi unik yang harus dikembangkan secara seimbang antara kecerdasan intelektual, emosional, dan spiritual.
              </p>
              <p>
                Berlokasi di lingkungan yang islami, kami menyediakan fasilitas modern yang mendukung proses belajar mengajar secara interaktif. Guru-guru kami adalah praktisi pendidikan yang berdedikasi dan memiliki kompetensi tinggi di bidangnya masing-masing.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600 mb-4">
                  <BookOpen size={24} />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Kurikulum Terpadu</h4>
                <p className="text-sm text-slate-500 font-medium">Integrasi kurikulum nasional dan tahfidz Quran.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600 mb-4">
                  <Globe size={24} />
                </div>
                <h4 className="font-bold text-slate-900 mb-2">Wawasan Global</h4>
                <p className="text-sm text-slate-500 font-medium">Mempersiapkan siswa untuk bersaing di dunia modern.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-emerald-600 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl shadow-emerald-200"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Eye size={24} />
                </div>
                <h3 className="text-2xl font-black italic uppercase">Visi Kami</h3>
              </div>
              <p className="text-xl font-medium leading-relaxed italic border-l-4 border-emerald-300 pl-6">
                "Menjadi lembaga pendidikan dasar unggulan yang melahirkan generasi penghafal Quran yang cerdas secara akademik and berkarakter islami."
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 p-8 md:p-12 rounded-[3rem] text-white"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Target size={24} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tight">Misi Kami</h3>
              </div>
              <ul className="space-y-6">
                {[
                  "Menyelenggarakan pendidikan tahfidz Quran yang berkualitas.",
                  "Menerapkan kurikulum nasional secara kreatif and aplikatif.",
                  "Membangun lingkungan sekolah yang kondusif untuk pembentukan karakter.",
                  "Mengembangkan minat and bakat siswa melalui kegiatan ekstrakurikuler."
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                      {idx + 1}
                    </div>
                    <p className="text-slate-300 font-medium">{item}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>

        {/* News Section */}
        <div id="school-news" className="mb-32">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-bold mb-4">
                <Calendar size={16} />
                Berita & Kegiatan
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Seputar <span className="text-emerald-600">Al Mahmudah</span></h2>
              <p className="text-slate-500 font-medium mt-2 max-w-xl">Ikuti terus berita terbaru and dokumentasi kegiatan menarik di sekolah kami.</p>
            </div>
            <button className="px-6 py-3 border-2 border-slate-900 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 hover:text-white transition-all">
              Lihat Semua Berita
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[400px] bg-slate-100 animate-pulse rounded-[2.5rem]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedNews(item)}
                  className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col h-full overflow-hidden cursor-pointer"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img 
                      src={item.imageURL || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800'} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-widest shadow-sm">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                      <Clock size={12} />
                      {new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-4 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium line-clamp-3 mb-8">
                      {item.content}
                    </p>
                    <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        Baca Selengkapnya
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                      <Share2 size={16} className="text-slate-300 hover:text-emerald-500 transition-colors cursor-pointer" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Contact & Map Section */}
        <section className="bg-slate-900 rounded-[4rem] overflow-hidden p-8 md:p-20 text-white">
          <div className="grid lg:grid-cols-2 gap-20">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-emerald-400 text-sm font-bold mb-6">
                <MapPin size={16} />
                Lokasi & Kontak
              </div>
              <h2 className="text-4xl font-black mb-8 tracking-tight italic uppercase">Hubungi <span className="text-emerald-400">Kami</span></h2>
              <p className="text-slate-400 font-medium mb-12 text-lg">
                Punya pertanyaan tentang pendaftaran atau kegiatan sekolah? Tim kami siap membantu Anda memberikan informasi yang dibutuhkan.
              </p>

              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-emerald-400 shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Alamat Sekolah</h4>
                    <p className="text-slate-400 text-sm font-medium">SD QUR'AN AL-MAHMUDAH, cogreg, kec.parung, kabupaten bogor, jawabarat 16330</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-emerald-400 shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Telepon & WhatsApp</h4>
                    <p className="text-slate-400 text-sm font-medium">0823-1412-0498 / 0897-8179-274</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-14 h-14 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-emerald-400 shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Email Resmi</h4>
                    <p className="text-slate-400 text-sm font-medium">sdqalmahmudahbogor@gmail.com</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <a 
                  href="https://www.instagram.com/sdq_almahmudah" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2 bg-white/5 hover:bg-emerald-600 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all text-white"
                >
                  <span>Instagram</span>
                </a>
                <a 
                  href="https://www.youtube.com/results?search_query=SDQ+AL+MAHUDAH" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2 bg-white/5 hover:bg-emerald-600 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all text-white"
                >
                  <span>Youtube</span>
                </a>
                <a 
                  href="https://wa.me/6282314120498" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2 bg-white/5 hover:bg-emerald-600 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all text-white"
                >
                  <span>WhatsApp 1</span>
                </a>
                <a 
                  href="https://wa.me/628978179274" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="px-4 py-2 bg-white/5 hover:bg-emerald-600 rounded-xl flex items-center gap-2 text-xs font-black uppercase transition-all text-white"
                >
                  <span>WhatsApp 2</span>
                </a>
              </div>
            </div>

            <div className="relative h-[400px] lg:h-auto min-h-[400px] bg-slate-800 rounded-[3rem] overflow-hidden border border-white/10">
              <iframe 
                src="https://maps.google.com/maps?q=SD%20QUR'AN%20AL-MAHMUDAH,%20cogreg,%20kec.parung,%20kabupaten%20bogor,%20jawabarat%2016330&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                className="absolute inset-0 w-full h-full opacity-80 grayscale contrast-125 invert"
                loading="lazy"
                title="Peta Lokasi Sekolah"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
              <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Kunjungi Sekolah Kami</p>
                <p className="text-sm font-medium text-white">Buka setiap hari kerja pukul 07:00 - 15:30 WIB</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="relative h-64 md:h-96 shrink-0">
                <img 
                  src={selectedNews.imageURL || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800'} 
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-slate-900 transition-all border border-white/20"
                >
                  <X size={24} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                      {selectedNews.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(selectedNews.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
                    {selectedNews.title}
                  </h3>
                </div>
              </div>
              <div className="p-8 md:p-12 overflow-y-auto">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 text-lg leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedNews.content}
                  </p>
                </div>
                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                      <Share2 size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Bagikan Berita</p>
                      <p className="text-sm font-bold text-slate-900">Salin Tautan Berita</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNews(null)}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-100"
                  >
                    Tutup Berita
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

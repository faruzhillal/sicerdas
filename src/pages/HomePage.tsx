import { motion } from 'motion/react';
import { Trophy, GraduationCap, ArrowRight, Star, CheckCircle2, Users, BookOpen, ShieldCheck, MessageSquare, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import heroImage from '../assets/images/regenerated_image_1782052082260.jpg';

const stats = [
  { label: 'Siswa Aktif', value: '450+', icon: Users },
  { label: 'Prestasi Nasional', value: '25+', icon: Trophy },
  { label: 'Lulusan Unggul', value: '1000+', icon: GraduationCap },
  { label: 'Program Beasiswa', value: '12', icon: Star },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-52 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-8">
                <Lightbulb size={14} className="text-yellow-500 fill-yellow-400 animate-pulse" />
                SiCerdas Portal Resmi
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-8">
                Membangun Generasi <br />
                <span className="text-emerald-600">Cerdas & Berprestasi</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg mb-10">
                Pusat informasi prestasi, pemeringkatan, dan beasiswa terpadu SD SDQ AL MAHMUDAH. Transparansi akademik untuk masa depan cemerlang.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/ranking"
                  className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base hover:bg-emerald-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                  Lihat Pemeringkatan
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/scholarships"
                  className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all shadow-sm"
                >
                  Program Beasiswa
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="relative"
            >
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent z-10" />
                <img
                  src={heroImage}
                  alt="Student scholarship"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>

              {/* Status Badge Mockup from Theme */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 hidden sm:block w-64"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status Beasiswa</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-600 leading-tight">Lolos Seleksi</p>
                    <p className="text-[10px] text-slate-500">Tahfidz Quran 2024</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%]"></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="-mt-16 relative z-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                viewport={{ once: true }}
                className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center group hover:border-emerald-200 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <stat.icon size={24} />
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-[0.2em] mb-4">Layanan Unggulan</h2>
            <p className="text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Semua informasi kemajuan belajar dalam satu genggaman</p>
            <p className="text-lg text-slate-600 leading-relaxed">
              Kami berkomitmen memberikan keterbukaan data bagi orang tua dan motivasi bagi siswa melalui sistem yang terintegrasi.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Sistem Pemeringkatan',
                desc: 'Lihat peringkat siswa di setiap kelas secara transparan berdasarkan poin prestasi akademik dan non-akademik.',
                icon: Trophy,
                color: 'bg-emerald-600'
              },
              {
                title: 'Portal Beasiswa',
                desc: 'Akses pendaftaran berbagai program beasiswa internal maupun eksternal dengan proses seleksi yang objektif.',
                icon: GraduationCap,
                color: 'bg-emerald-600'
              },
              {
                title: 'Pusat Pengaduan',
                desc: 'Saran dan kritik serta aduan teknis dapat disampaikan langsung melalui portal untuk ditindaklanjuti segera.',
                icon: MessageSquare,
                color: 'bg-emerald-600'
              }
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                viewport={{ once: true }}
                className="p-8 rounded-[2.5rem] border border-slate-100 hover:border-emerald-100 hover:bg-slate-50 transition-all group"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg", feature.color)}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{feature.desc}</p>
                <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:gap-3 transition-all">
                  Pelajari Selengkapnya <ArrowRight size={16} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto rounded-[3rem] bg-emerald-600 p-8 sm:p-16 lg:p-24 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-2xl text-center mx-auto">
            <h2 className="text-3xl lg:text-5xl font-extrabold text-white mb-8 tracking-tight italic">
              "Ilmu adalah harta yang takkan pernah habis, prestasimu adalah bukti dedakasimu."
            </h2>
            <div className="mb-12">
              <p className="text-emerald-100 text-lg mb-2">Mari bergabung dan pantau prestasimu sekarang.</p>
            </div>
            <Link
              to="/login"
              className="inline-block px-10 py-5 bg-white text-emerald-600 rounded-2xl font-extrabold text-xl hover:bg-emerald-50 hover:scale-105 transition-all shadow-xl"
            >
              Mulai Gunakan Platform
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

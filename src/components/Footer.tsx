import { GraduationCap, Mail, MapPin, Phone, Instagram, Facebook, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand & Mission */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
                <GraduationCap size={24} />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">sicerdas</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Sistem Informasi Pemeringkatan & Beasiswa SD SDQ AL MAHMUDAH.
              Dedikasi untuk transparansi prestasi dan apresiasi akademik siswa.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Navigasi</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-sm hover:text-emerald-400 mb-1 transition-colors">Beranda</Link></li>
              <li><Link to="/ranking" className="text-sm hover:text-emerald-400 mb-1 transition-colors">Pemeringkatan</Link></li>
              <li><Link to="/scholarships" className="text-sm hover:text-emerald-400 mb-1 transition-colors">Program Beasiswa</Link></li>
              <li><Link to="/complaints" className="text-sm hover:text-emerald-400 mb-1 transition-colors">Pusat Bantuan & Aduan</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kontak</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-emerald-400 shrink-0" />
                <span className="text-sm">Jl. Pendidikan No. 123, Kota Cerdas, Indonesia</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-emerald-400 shrink-0" />
                <span className="text-sm">(021) 1234-5678</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-emerald-400 shrink-0" />
                <span className="text-sm">admin@sdqalmahmudah.sch.id</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sosial Media</h3>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-emerald-600 hover:-translate-y-1 transition-all">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-emerald-600 hover:-translate-y-1 transition-all">
                <Facebook size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-emerald-600 hover:-translate-y-1 transition-all">
                <Youtube size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} SD SDQ AL MAHMUDAH. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Kebijakan Privasi</a>
            <a href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Syarat & Ketentuan</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

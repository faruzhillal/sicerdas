import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { GraduationCap, Clock, CheckCircle2, XCircle, Search, Filter, Loader2, User, Wallet, FileText, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';
import { cn } from '../../../lib/utils';

interface Application {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  nisn: string;
  parentName: string;
  parentJob: string;
  parentIncome: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  adminComment?: string;
  spkScore?: number;
  criteriaValues?: {
    gpa: number;
    parentIncomeValue: number;
    dependents: number;
    achievements: number;
  };
}

export default function ApplicationManager() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scholarshipFilter, setScholarshipFilter] = useState('all');
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch unique scholarships for filter
    const fetchScholarships = async () => {
      const snap = await getDocs(collection(db, 'scholarships'));
      setScholarships(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchScholarships();

    const q = query(collection(db, 'scholarship_applications'), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Application));
      setApplications(appData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scholarship_applications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      await updateDoc(doc(db, 'scholarship_applications', id), {
        status: newStatus,
        adminComment: adminComment,
        updatedAt: new Date().toISOString()
      });
      setSelectedApp(null);
      setAdminComment('');
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `scholarship_applications/${id}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = app.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.scholarshipName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesScholarship = scholarshipFilter === 'all' || app.scholarshipId === scholarshipFilter;
    return matchesSearch && matchesStatus && matchesScholarship;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Kelola Pengajuan Beasiswa</h1>
          <p className="text-slate-500 text-sm">Review dan tentukan status pengajuan beasiswa siswa.</p>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/dashboard/scholarship-saw"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-2 uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100"
          >
            <Zap size={14} /> Proses Seleksi SAW
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama siswa atau beasiswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400" size={18} />
          <select 
            value={scholarshipFilter}
            onChange={(e) => setScholarshipFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
          >
            <option value="all">Semua Program</option>
            {scholarships.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400 italic">Memuat pengajuan...</div>
          ) : filteredApps.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-slate-400 italic">Tidak ada pengajuan ditemukan.</div>
          ) : filteredApps.map((app, index) => (
            <div 
              key={app.id} 
              onClick={() => setSelectedApp(app)}
              className={cn(
                "p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md relative",
                selectedApp?.id === app.id ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-slate-100'
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{app.studentName}</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">NISN: {app.nisn}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                    app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                    app.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {app.status === 'pending' ? 'Menunggu' : app.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Beasiswa yang diajukan:</p>
                  <p className="text-sm font-bold text-emerald-600">{app.scholarshipName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Tanggal</p>
                  <p className="text-xs font-medium text-slate-600">{new Date(app.submittedAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
              {app.spkScore && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skor SPK: <span className="text-emerald-600">{app.spkScore.toFixed(2)}</span></p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-8 h-fit">
          {selectedApp ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-900 p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <GraduationCap size={18} />
                  </div>
                  <h2 className="font-bold">Detail Pengajuan</h2>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-bold truncate max-w-[200px]">{selectedApp.studentName}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Kelas {selectedApp.studentClass}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className={`text-xs font-bold uppercase tracking-widest ${
                      selectedApp.status === 'approved' ? 'text-emerald-400' : 
                      selectedApp.status === 'rejected' ? 'text-rose-400' : 
                      'text-amber-400'
                    }`}>
                      {selectedApp.status === 'pending' ? 'Menunggu' : selectedApp.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Section: Siswa */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Detail Profil Siswa</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">NISN</p>
                      <p className="text-xs font-black text-slate-900">{selectedApp.nisn}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Waktu Daftar</p>
                      <p className="text-xs font-black text-slate-900">{new Date(selectedApp.submittedAt).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>

                {/* Section: Orang Tua */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Wallet size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Data Orang Tua / Wali</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl col-span-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Ayah/Ibu/Wali</p>
                      <p className="text-xs font-black text-slate-900">{selectedApp.parentName}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pekerjaan</p>
                      <p className="text-xs font-black text-slate-900">{selectedApp.parentJob}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Penghasilan</p>
                      <p className="text-xs font-black text-slate-900">{selectedApp.parentIncome}</p>
                    </div>
                  </div>
                </div>

                {/* Section: SPK */}
                {selectedApp.criteriaValues && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3 text-emerald-900">
                      <Zap size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Data Kriteria (SPK)</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">GPA</p>
                        <p className="text-sm font-black text-emerald-600">{selectedApp.criteriaValues.gpa}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Tanggungan</p>
                        <p className="text-sm font-black text-emerald-600">{selectedApp.criteriaValues.dependents}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Prestasi</p>
                        <p className="text-sm font-black text-emerald-600">{selectedApp.criteriaValues.achievements}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Nilai Inc</p>
                        <p className="text-sm font-black text-emerald-600">{selectedApp.criteriaValues.parentIncomeValue}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[8px] text-emerald-400 italic text-center">Data di atas digunakan untuk pemeringkatan SAW secara otomatis.</p>
                  </div>
                )}

                {/* Section: Alasan */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText size={14} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Alasan Mengajukan Beasiswa</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed italic">
                    "{selectedApp.notes || 'Tidak ada catatan alasan yang diberikan.'}"
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Komentar / Feedback Admin</label>
                    <textarea 
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Contoh: Dokumen lengkap, segera diverifikasi..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                      disabled={processingId === selectedApp.id}
                      className="py-3 px-4 border-2 border-rose-100 text-rose-600 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-rose-50 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                      <XCircle size={16} /> Tolak Pengajuan
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(selectedApp.id, 'approved')}
                      disabled={processingId === selectedApp.id}
                      className="py-3 px-4 bg-emerald-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-slate-900 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-emerald-100"
                    >
                      <CheckCircle2 size={16} /> Setujui Sekarang
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                <FileText size={32} />
              </div>
              <p className="text-sm font-bold text-slate-400">Pilih salah satu pengajuan</p>
              <p className="text-xs text-slate-300 mt-1 max-w-[200px]">Klik pada daftar di sebelah kiri untuk melihat detail data siswa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

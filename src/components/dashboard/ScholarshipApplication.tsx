import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, AlertCircle, CheckCircle2, Loader2, Info, ArrowLeft } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/firebase-errors';

interface Scholarship {
  id: string;
  name: string;
  description: string;
  status: string;
}

export default function ScholarshipApplication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, profile } = useAuth();
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [attemptsInfo, setAttemptsInfo] = useState({ count: 0, max: 3 });
  const [formData, setFormData] = useState({
    nisn: '',
    parentName: '',
    parentJob: '',
    parentIncome: '',
    dependents: '1',
    notes: '',
    criteriaValues: {
      nilaiAkademik: 0,
      nilaiHafalan: 0,
      nilaiPerilaku: 0,
      nilaiPresensi: 0,
      nilaiPenghasilan: 50,
      nilaiTanggungan: 50
    },
    declaration: false
  });

  const INCOME_RANGES = [
    '< Rp 1.000.000',
    'Rp 1.000.000 - Rp 2.500.000',
    'Rp 2.500.000 - Rp 5.000.000',
    'Rp 5.000.000 - Rp 7.500.000',
    '> Rp 7.500.000'
  ];

  useEffect(() => {
    const checkApplication = async () => {
      if (!id || !currentUser) return;
      
      try {
        setLoading(true);
        // Fetch scholarship details
        const sDoc = await getDoc(doc(db, 'scholarships', id));
        if (sDoc.exists()) {
          setScholarship({ id: sDoc.id, ...sDoc.data() } as Scholarship);
        }

        // Check if already applied and status
        const q = query(
          collection(db, 'scholarship_applications'), 
          where('scholarshipId', '==', id),
          where('studentId', '==', currentUser.uid)
        );
        const qSnap = await getDocs(q);
        const apps = qSnap.docs.map(doc => doc.data());
        const count = apps.length;
        setAttemptsInfo({ count, max: 3 });
        
        const pendingApp = apps.find(a => a.status === 'pending');
        const approvedApp = apps.find(a => a.status === 'approved');

        if (approvedApp) {
          setAlreadyApplied(true);
          setApplicationMessage("Anda sudah lolos dalam program beasiswa ini. Selamat!");
        } else if (pendingApp) {
          setAlreadyApplied(true);
          setApplicationMessage("Anda sudah memiliki pengajuan yang sedang diproses. Tunggu pengumuman atau hasil tinjauan dari pengelola.");
        } else if (count >= 3) {
          setAlreadyApplied(true);
          setApplicationMessage("Anda telah mencapai batas maksimal pengajuan (3 kali). Hubungi admin jika merasa ada kesalahan.");
        }

        // Fetch dynamic school grades
        const scoresDoc = await getDoc(doc(db, 'criteria_scores', currentUser.uid));
        const scoresData = scoresDoc.exists() ? scoresDoc.data() : {};
        
        // Auto-detect other fields from profile/demographics
        const dependentsCount = Number((profile as any)?.dependents || 1);
        const mappedTanggungan = Math.min(100, Math.max(0, dependentsCount * 20 || 50));

        let mappedIncomeValue = 50;
        if ((profile as any)?.parentIncome) {
          if ((profile as any).parentIncome === INCOME_RANGES[0]) mappedIncomeValue = 100;
          else if ((profile as any).parentIncome === INCOME_RANGES[1]) mappedIncomeValue = 80;
          else if ((profile as any).parentIncome === INCOME_RANGES[2]) mappedIncomeValue = 60;
          else if ((profile as any).parentIncome === INCOME_RANGES[3]) mappedIncomeValue = 40;
          else if ((profile as any).parentIncome === INCOME_RANGES[4]) mappedIncomeValue = 20;
        }

        setFormData(prev => ({
          ...prev,
          dependents: prev.dependents || String(dependentsCount || '1'),
          parentIncome: prev.parentIncome || (profile as any)?.parentIncome || '',
          criteriaValues: {
            nilaiAkademik: Math.round(Number(scoresData.nilaiAkademik || scoresData.academic || (scoresData.gpa ? scoresData.gpa * 10 : 80)) || 0),
            nilaiHafalan: Math.round(Number(scoresData.nilaiHafalan || scoresData.tahfidz || scoresData.hafalan || 75) || 0),
            nilaiPerilaku: Math.round(Number(scoresData.nilaiPerilaku || scoresData.behavior || 85) || 0),
            nilaiPresensi: Math.round(Number(scoresData.nilaiPresensi || scoresData.attendance || 90) || 0),
            nilaiPenghasilan: mappedIncomeValue,
            nilaiTanggungan: mappedTanggungan
          }
        }));

      } catch (error) {
        console.error("Error checking application:", error);
      } finally {
        setLoading(false);
      }
    };

    checkApplication();
  }, [id, currentUser, profile]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        nisn: prev.nisn || (profile as any).nisn || '',
        parentName: prev.parentName || (profile as any).parentName || '',
        parentJob: prev.parentJob || (profile as any).parentJob || '',
        parentIncome: prev.parentIncome || (profile as any).parentIncome || '',
        dependents: prev.dependents || String((profile as any).dependents || '1'),
      }));
    }
  }, [profile]);

  // Synchronize financial & dependent criteria calculations dynamically
  useEffect(() => {
    let mappedIncomeValue = 50;
    if (formData.parentIncome === INCOME_RANGES[0]) mappedIncomeValue = 100;
    else if (formData.parentIncome === INCOME_RANGES[1]) mappedIncomeValue = 80;
    else if (formData.parentIncome === INCOME_RANGES[2]) mappedIncomeValue = 60;
    else if (formData.parentIncome === INCOME_RANGES[3]) mappedIncomeValue = 40;
    else if (formData.parentIncome === INCOME_RANGES[4]) mappedIncomeValue = 20;

    const dependentsCount = Number(formData.dependents) || 1;
    const mappedTanggungan = Math.min(100, Math.max(0, dependentsCount * 20 || 50));

    setFormData(prev => {
      if (
        prev.criteriaValues.nilaiPenghasilan !== mappedIncomeValue ||
        prev.criteriaValues.nilaiTanggungan !== mappedTanggungan
      ) {
        return {
          ...prev,
          criteriaValues: {
            ...prev.criteriaValues,
            nilaiPenghasilan: mappedIncomeValue,
            nilaiTanggungan: mappedTanggungan
          }
        };
      }
      return prev;
    });
  }, [formData.parentIncome, formData.dependents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentUser || !profile) return;
    if (!formData.declaration) {
      alert("Anda harus menyetujui pernyataan kebenaran data.");
      return;
    }

    try {
      setSubmitting(true);
      const attemptNum = attemptsInfo.count + 1;
      const appId = `${currentUser.uid}_${id}_attempt_${attemptNum}`;
      
      await setDoc(doc(db, 'scholarship_applications', appId), {
        scholarshipId: id,
        scholarshipName: scholarship?.name || 'Beasiswa',
        studentId: currentUser.uid,
        studentName: profile.fullName,
        studentClass: profile.class,
        attempt: attemptNum,
        ...formData,
        criteriaValues: {
          nilaiAkademik: Math.round(Number(formData.criteriaValues.nilaiAkademik) || 0),
          nilaiHafalan: Math.round(Number(formData.criteriaValues.nilaiHafalan) || 0),
          nilaiPerilaku: Math.round(Number(formData.criteriaValues.nilaiPerilaku) || 0),
          nilaiPresensi: Math.round(Number(formData.criteriaValues.nilaiPresensi) || 0),
          nilaiPenghasilan: Math.round(Number(formData.criteriaValues.nilaiPenghasilan) || 50),
          nilaiTanggungan: Math.round(Number(formData.criteriaValues.nilaiTanggungan) || 50)
        },
        status: 'pending',
        submittedAt: new Date().toISOString()
      });
      setSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scholarship_applications');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 text-center">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Pendaftaran Berhasil!</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Pendaftaran Anda untuk <strong>{scholarship?.name}</strong> telah berhasil dikirim. Tim kurasi akan meninjau data Anda segera.
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  if (alreadyApplied) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6 text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Pengajuan Dibatasi</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {applicationMessage}
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 mb-8 font-medium transition-colors"
      >
        <ArrowLeft size={18} /> Kembali
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-12">
        <div className="bg-emerald-600 p-8 sm:p-10 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <GraduationCap size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">Formulir Pendaftaran Beasiswa</span>
          </div>
          <h1 className="text-3xl font-extrabold relative z-10 mb-2">I. Formulir Pendaftaran</h1>
          <p className="text-emerald-100/80 text-sm font-medium relative z-10">
            Isi semua kolom yang bertanda bintang (*)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-10">
          {/* SECTION A: DATA SISWA */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">A</div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Data Siswa</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Lengkap Siswa *</label>
                <input 
                  type="text" 
                  disabled
                  value={profile?.fullName || ''}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">NISN *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Masukkan NISN"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kelas Saat Ini *</label>
                <input 
                  type="text" 
                  disabled
                  value={profile?.class || ''}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jenis Beasiswa *</label>
                <input 
                  type="text" 
                  disabled
                  value={scholarship?.name || ''}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* SECTION B: DATA ORANG TUA */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">B</div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Data Orang Tua / Wali</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Ayah / Wali *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nama Lengkap Wali"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pekerjaan Orang Tua / Wali *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Wiraswasta, PNS, Buruh"
                  value={formData.parentJob}
                  onChange={(e) => setFormData({ ...formData, parentJob: e.target.value })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rata-rata Penghasilan per Bulan *</label>
                <select 
                  required
                  value={formData.parentIncome}
                  onChange={(e) => setFormData({ ...formData, parentIncome: e.target.value })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all bg-white"
                >
                  <option value="">-- Pilih Rentang Penghasilan --</option>
                  {INCOME_RANGES.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jumlah Tanggungan Orang Tua / Wali *</label>
                <select 
                  required
                  value={formData.dependents}
                  onChange={(e) => setFormData({ ...formData, dependents: e.target.value })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium transition-all bg-white"
                >
                  <option value="1">1 Orang Anak / Jiwa</option>
                  <option value="2">2 Orang Anak / Jiwa</option>
                  <option value="3">3 Orang Anak / Jiwa</option>
                  <option value="4">4 Orang Anak / Jiwa</option>
                  <option value="5">5 Orang Anak / Jiwa atau lebih</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECTION C: PERSENTASE KELAYAKAN BEASISWA (PREFILL DARI DATABASE SEKOLAH) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">C</div>
              <div className="flex-1">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Kriteria Kelayakan Beasiswa (SPK)</h2>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Nilai kriteria sensitif diambil & diverifikasi langsung dari basis data resmi Admin/Sekolah secara realtime untuk objektivitas SPK.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Akademik */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[9px] uppercase font-bold text-indigo-600 tracking-wider">
                  Admin Lock
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nilai Akademik</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800">
                    {formData.criteriaValues.nilaiAkademik || "0"}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Diambil secara langsung dari data Rapor & prestasi akademik resmi sekolah Anda.
                </p>
              </div>

              {/* Hafalan */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[9px] uppercase font-bold text-indigo-600 tracking-wider">
                  Admin Lock
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nilai Hafalan Quran</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800">
                    {formData.criteriaValues.nilaiHafalan || "0"}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Diambil berdasarkan kuantitas & kualitas tahfidz/hafalan resmi di sekolah.
                </p>
              </div>

              {/* Perilaku */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[9px] uppercase font-bold text-indigo-600 tracking-wider">
                  Admin Lock
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nilai Perilaku / Akhlak</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800">
                    {formData.criteriaValues.nilaiPerilaku || "0"}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Diambil dari catatan kepribadian resmi bimbingan konseling dan wali kelas.
                </p>
              </div>

              {/* Kehadiran */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-[9px] uppercase font-bold text-indigo-600 tracking-wider">
                  Admin Lock
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nilai Presensi / Kehadiran</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800">
                    {formData.criteriaValues.nilaiPresensi || "0"}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Akumulasi persentase keaktifan kehadiran dalam kegiatan belajar harian.
                </p>
              </div>

              {/* Ekonomi keluarga */}
              <div className="bg-emerald-50/30 border border-emerald-100/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-emerald-100/50 border border-emerald-200 rounded-full text-[9px] uppercase font-bold text-emerald-800 tracking-wider">
                  Auto Calc
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Skor Ekonomi Keluarga</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-700">
                    {formData.criteriaValues.nilaiPenghasilan}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Diperoleh secara otomatis berdasarkan pilihan rentang penghasilan bulanan di Section B.
                </p>
              </div>

              {/* Tanggungan */}
              <div className="bg-emerald-50/30 border border-emerald-100/80 rounded-2xl p-5 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 px-2.5 py-0.5 bg-emerald-100/50 border border-emerald-200 rounded-full text-[9px] uppercase font-bold text-emerald-800 tracking-wider">
                  Auto Calc
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Skor Tanggungan Orang Tua</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-700">
                    {formData.criteriaValues.nilaiTanggungan}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Diperoleh secara otomatis berdasarkan jumlah tanggungan di Section B.
                </p>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-400 italic font-medium leading-relaxed">
              * Seluruh data kriteria di atas dikonversi secara otomatis ke nilai skala 1-100 sesuai arahan formulasi kualitatif SPK beasiswa metode SAW (Simple Additive Weighting).
            </p>
          </section>

          {/* SECTION D: KELENGKAPAN BERKAS */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">D</div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Kelengkapan Berkas & Alasan</h2>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alasan Mengajukan Beasiswa *</label>
              <textarea 
                rows={4}
                required
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Jelaskan secara singkat mengapa siswa tersebut layak mendapatkan beasiswa ini..."
                className="w-full px-5 py-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 text-sm font-medium transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Dokumen Pendukung (PDF/JPG) *</label>
              <p className="text-[10px] text-slate-400 font-medium">Gabungkan rapor, sertifikat, sktm ke dalam 1 file maksimal 5MB</p>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 group hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <p className="text-xs font-bold text-slate-600 mb-1">Klik untuk upload atau drag & drop file kesini</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Max Ukuran file: 5MB</p>
                <p className="mt-4 text-[10px] bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full font-bold">Berkas Simulasi Otomatis Terdeteksi</p>
              </div>
            </div>
          </section>

          <div className="pt-8 space-y-6">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 cursor-pointer group">
              <input 
                type="checkbox" 
                required
                checked={formData.declaration}
                onChange={(e) => setFormData({ ...formData, declaration: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-emerald-900 leading-relaxed font-medium">
                Dengan ini saya menyatakan bahwa seluruh data yang diisi adalah benar. Apabila di kemudian hari ditemukan ketidaksesuaian data, pihak sekolah berhak membatalkan status penerima beasiswa.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                Kirim Pengajuan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

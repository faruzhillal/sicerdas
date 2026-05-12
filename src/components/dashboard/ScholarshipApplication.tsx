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
    notes: '',
    criteriaValues: {
      gpa: 0,
      dependents: 0,
      achievements: 1 // 1: Cukup, 2: Baik, 3: Sangat Baik, 4: Prestasi Kota, 5: Prestasi Nasional
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
      } catch (error) {
        console.error("Error checking application:", error);
      } finally {
        setLoading(false);
      }
    };

    checkApplication();
  }, [id, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentUser || !profile) return;
    if (!formData.declaration) {
      alert("Anda harus menyetujui pernyataan kebenaran data.");
      return;
    }

    // Map parent income to numeric value (1-5) for Cost logic
    // < 1m: 1, 1-2.5: 2, 2.5-5: 3, 5-7.5: 4, > 7.5: 5
    let incomeValue = 1;
    if (formData.parentIncome === INCOME_RANGES[1]) incomeValue = 2;
    else if (formData.parentIncome === INCOME_RANGES[2]) incomeValue = 3;
    else if (formData.parentIncome === INCOME_RANGES[3]) incomeValue = 4;
    else if (formData.parentIncome === INCOME_RANGES[4]) incomeValue = 5;

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
          ...formData.criteriaValues,
          parentIncomeValue: incomeValue
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
        <Loader2 className="animate-spin text-indigo-600" size={32} />
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
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
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
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-all"
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
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-8 font-medium transition-colors"
      >
        <ArrowLeft size={18} /> Kembali
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden mb-12">
        <div className="bg-indigo-600 p-8 sm:p-10 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
              <GraduationCap size={24} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-100">Formulir Pendaftaran Beasiswa</span>
          </div>
          <h1 className="text-3xl font-extrabold relative z-10 mb-2">I. Formulir Pendaftaran</h1>
          <p className="text-indigo-100/80 text-sm font-medium relative z-10">
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
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
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
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
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
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rata-rata Penghasilan per Bulan *</label>
                <select 
                  required
                  value={formData.parentIncome}
                  onChange={(e) => setFormData({ ...formData, parentIncome: e.target.value })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all bg-white"
                >
                  <option value="">-- Pilih Rentang Penghasilan --</option>
                  {INCOME_RANGES.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* SECTION C: KRITERIA BEASISWA (SPK) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">C</div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Kriteria Beasiswa (Data SPK)</h2>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">GPA / Nilai Rata-rata *</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  placeholder="Contoh: 85.50 atau 3.75"
                  value={formData.criteriaValues.gpa}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    criteriaValues: { ...formData.criteriaValues, gpa: parseFloat(e.target.value) || 0 } 
                  })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jumlah Tanggungan *</label>
                <input 
                  type="number" 
                  min="0"
                  required
                  placeholder="Jumlah saudara/tanggungan"
                  value={formData.criteriaValues.dependents}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    criteriaValues: { ...formData.criteriaValues, dependents: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tingkat Prestasi *</label>
                <select 
                  required
                  value={formData.criteriaValues.achievements}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    criteriaValues: { ...formData.criteriaValues, achievements: parseInt(e.target.value) || 1 } 
                  })}
                  className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all bg-white"
                >
                  <option value={1}>Cukup (Hanya Akademik)</option>
                  <option value={2}>Baik (Ex-school/Organisasi)</option>
                  <option value={3}>Sangat Baik (Juara Sekolah/Kecamatan)</option>
                  <option value={4}>Prestasi Tingkat Kota/Provinsi</option>
                  <option value={5}>Prestasi Tingkat Nasional/Intl</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">Data ini akan diakumulasi menggunakan algoritma SPK untuk menentukan peringkat kelayakan Anda secara objektif.</p>
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
                className="w-full px-5 py-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-sm font-medium transition-all"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Dokumen Pendukung (PDF/JPG) *</label>
              <p className="text-[10px] text-slate-400 font-medium">Gabungkan rapor, sertifikat, sktm ke dalam 1 file maksimal 5MB</p>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <p className="text-xs font-bold text-slate-600 mb-1">Klik untuk upload atau drag & drop file kesini</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Max Ukuran file: 5MB</p>
                <p className="mt-4 text-[10px] bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-bold">Berkas Simulasi Otomatis Terdeteksi</p>
              </div>
            </div>
          </section>

          <div className="pt-8 space-y-6">
            <label className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 cursor-pointer group">
              <input 
                type="checkbox" 
                required
                checked={formData.declaration}
                onChange={(e) => setFormData({ ...formData, declaration: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-indigo-900 leading-relaxed font-medium">
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
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
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

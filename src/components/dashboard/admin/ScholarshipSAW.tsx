import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, where, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { 
  Calculator, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Table as TableIcon,
  Zap,
  Save,
  Trophy,
  GraduationCap,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface Criterion {
  id: string;
  name: string;
  weight: number;
  type: 'benefit' | 'cost';
}

interface Application {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  scholarshipId: string;
  scholarshipName: string;
  status: string;
  criteriaValues: {
    gpa: number;
    parentIncomeValue: number;
    dependents: number;
    achievements: number;
  };
}

interface Scholarship {
  id: string;
  name: string;
}

export default function ScholarshipSAW() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string>('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, { fullName: string; class: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [step, setStep] = useState(1); // 1: Select & Data, 2: Normalization, 3: Final Rank

  // Local calculation result state
  const [normalizationMatrix, setNormalizationMatrix] = useState<{ [appId: string]: { [criteriaId: string]: number } }>({});
  const [finalScores, setFinalScores] = useState<{ appId: string; score: number; name: string; class: string; studentId: string }[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Fetch Scholarships
        const schSnap = await getDocs(collection(db, 'scholarships'));
        const schData = schSnap.docs.map(d => ({ id: d.id, name: d.data().name } as Scholarship));
        setScholarships(schData);
        if (schData.length > 0) setSelectedScholarshipId(schData[0].id);

        // Fetch students map
        const studentQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentQuery);
        const map = new Map<string, { fullName: string; class: string }>();
        studentsSnapshot.forEach(doc => {
          const d = doc.data();
          map.set(doc.id, {
            fullName: d.fullName || 'Siswa',
            class: d.class || 'N/A'
          });
        });
        setStudentsMap(map);

        // Fetch Criteria
        const critSnap = await getDocs(collection(db, 'criteria'));
        let critData = critSnap.docs.map(d => ({ id: d.id, ...d.data() } as Criterion));
        
        // If criteria not present, we use default scholarship criteria mapping
        if (critData.length === 0) {
            critData = [
                { id: 'gpa', name: 'IPK / Rata-rata', weight: 0.4, type: 'benefit' },
                { id: 'income', name: 'Penghasilan', weight: 0.3, type: 'cost' },
                { id: 'dependents', name: 'Tanggungan', weight: 0.2, type: 'benefit' },
                { id: 'achievements', name: 'Prestasi', weight: 0.1, type: 'benefit' }
            ];
        }
        setCriteria(critData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedScholarshipId) return;

    setLoading(true);
    const q = query(
      collection(db, 'scholarship_applications'), 
      where('scholarshipId', '==', selectedScholarshipId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appData = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as Application));
      setApplications(appData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedScholarshipId]);

  const executeSAW = () => {
    if (applications.length === 0) {
        alert("Tidak ada pendaftar untuk program ini.");
        return;
    }
    setCalculating(true);
    
    // Mapping from application data to criteria
    // We assume the criteria IDs match the keys in criteriaValues: 
    // gpa -> gpa
    // income -> parentIncomeValue
    // dependents -> dependents
    // achievements -> achievements

    const getAppCriteriaValue = (app: Application, critId: string): number => {
        const cv = app.criteriaValues || { gpa: 0, parentIncomeValue: 5, dependents: 0, achievements: 1 };
        if (critId.toLowerCase().includes('gpa') || critId === 'gpa') return cv.gpa;
        if (critId.toLowerCase().includes('income') || critId === 'income') return cv.parentIncomeValue;
        if (critId.toLowerCase().includes('dependent') || critId === 'dependents') return cv.dependents;
        if (critId.toLowerCase().includes('achievement') || critId === 'achievements') return cv.achievements;
        return 0;
    };

    // 1. Find Max/Min for each criteria
    const limits: { [key: string]: { max: number; min: number } } = {};
    criteria.forEach(c => {
      const values = applications.map(a => getAppCriteriaValue(a, c.id));
      limits[c.id] = {
        max: Math.max(...values, 0.0001), 
        min: Math.min(...values.filter(v => v > 0), 1) 
      };
    });

    // 2. Normalize Matrix
    const normMatrix: { [appId: string]: { [criteriaId: string]: number } } = {};
    applications.forEach(app => {
      normMatrix[app.id] = {};
      criteria.forEach(c => {
        const val = getAppCriteriaValue(app, c.id);
        if (c.type === 'benefit') {
          normMatrix[app.id][c.id] = val / limits[c.id].max;
        } else {
          normMatrix[app.id][c.id] = limits[c.id].min / Math.max(val, 0.0001);
        }
      });
    });
    setNormalizationMatrix(normMatrix);

    // 3. Final Score
    const results = applications.map(app => {
      let total = 0;
      criteria.forEach(c => {
        total += (normMatrix[app.id][c.id] || 0) * c.weight;
      });
      const studentInfo = studentsMap.get(app.studentId);
      const name = studentInfo ? studentInfo.fullName : app.studentName;
      const clsName = studentInfo ? studentInfo.class : app.studentClass;
      return {
        appId: app.id,
        studentId: app.studentId,
        name: name,
        class: clsName,
        score: total
      };
    }).sort((a, b) => b.score - a.score);

    setFinalScores(results);
    setCalculating(false);
    setStep(2);
  };

  const handleApplyAction = async (appId: string, status: 'approved' | 'rejected') => {
      if (!window.confirm(`Yakin ingin menyetujui pengajuan ini?`)) return;
      try {
          await setDoc(doc(db, 'scholarship_applications', appId), {
              status,
              processedAt: new Date().toISOString()
          }, { merge: true });
          alert("Status berhasil diperbarui!");
      } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `scholarship_applications/${appId}`);
      }
  };

  if (loading && scholarships.length === 0) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">Selection SAW <span className="text-emerald-600">Beasiswa</span></h1>
          <p className="text-slate-500 font-medium">Lakukan seleksi beasiswa secara objektif dengan metode SAW.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {step === 1 ? (
             <div className="flex bg-white rounded-2xl border border-slate-200 p-1">
                <button 
                onClick={executeSAW}
                disabled={applications.length === 0 || criteria.length === 0}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
                >
                {calculating ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />}
                Hitung Ranking
                </button>
             </div>
          ) : (
            <button 
              onClick={() => setStep(1)}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black transition-all hover:bg-emerald-600"
            >
              Ulangi Perhitungan
            </button>
          )}
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <GraduationCap size={24} />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pilih Program Beasiswa</p>
                    <select 
                        value={selectedScholarshipId}
                        onChange={(e) => setSelectedScholarshipId(e.target.value)}
                        className="text-lg font-black text-slate-900 focus:outline-none bg-transparent cursor-pointer"
                    >
                        {scholarships.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="flex gap-8 border-l border-slate-100 pl-8 hidden lg:flex">
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pendaftar</p>
                    <p className="text-xl font-black text-emerald-600">{applications.length}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kriteria</p>
                    <p className="text-xl font-black text-emerald-600">{criteria.length}</p>
                </div>
            </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-full border border-slate-100 w-fit">
        <div className={cn("px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all", step === 1 ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-50 text-slate-400")}>01 Data Pendaftar</div>
        <ArrowRight size={14} className="text-slate-300" />
        <div className={cn("px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all", step === 2 ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-50 text-slate-400")}>02 Normalisasi</div>
        <ArrowRight size={14} className="text-slate-300" />
        <div className={cn("px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all", step === 3 ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-50 text-slate-400")}>03 Rekomendasi Ranking</div>
      </div>

      {applications.length === 0 && !loading ? (
        <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2rem] text-center max-w-2xl mx-auto space-y-4">
          <AlertCircle className="mx-auto text-amber-500" size={48} />
          <h3 className="text-lg font-black text-amber-900">Belum Ada Pendaftar</h3>
          <p className="text-sm text-amber-700 leading-relaxed font-medium">
            Tidak ditemukan pendaftar beasiswa dengan status 'Menunggu' untuk program yang dipilih saat ini.
          </p>
        </div>
      ) : step === 1 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TableIcon size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900">Alternatif Calon Penerima (X)</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Matriks nilai dari formulir pendaftaran</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nama Lengkap</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">GPA</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Income</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Dep</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {applications.map(app => {
                  const studentInfo = studentsMap.get(app.studentId);
                  const displayName = studentInfo ? studentInfo.fullName : app.studentName;
                  const displayClass = studentInfo ? studentInfo.class : app.studentClass;
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-900">{displayName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas {displayClass}</p>
                      </td>
                      <td className="px-8 py-5 text-center font-black text-slate-700 text-sm">{app.criteriaValues?.gpa || 0}</td>
                      <td className="px-8 py-5 text-center font-black text-slate-700 text-sm">{app.criteriaValues?.parentIncomeValue || 5}</td>
                      <td className="px-8 py-5 text-center font-black text-slate-700 text-sm">{app.criteriaValues?.dependents || 0}</td>
                      <td className="px-8 py-5 text-center font-black text-slate-700 text-sm">{app.criteriaValues?.achievements || 1}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : step === 2 ? (
        <div className="space-y-8">
           <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    <Zap size={24} />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Normalisasi Lanjutan</h2>
                </div>
                <button 
                  onClick={() => setStep(3)}
                  className="px-8 py-3 bg-white text-emerald-600 rounded-xl font-black text-sm hover:bg-slate-900 hover:text-white transition-all shadow-lg"
                >
                  Lihat Rekomendasi Rank
                </button>
              </div>
              <p className="text-emerald-100/80 text-sm font-medium leading-relaxed max-w-2xl relative z-10">
                Nilai IPK, Tanggungan, dan Prestasi bersifat <span className="text-white font-black">Benefit</span>, sedangkan Penghasilan bersifat <span className="text-white font-black">Cost</span>.
              </p>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alternatif</th>
                      <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">R: GPA</th>
                      <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">R: Income</th>
                      <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">R: Dep</th>
                      <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">R: Ach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {applications.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-900">{studentsMap.get(app.studentId)?.fullName || app.studentName}</p>
                        </td>
                        <td className="px-8 py-5 text-center font-black text-emerald-600 text-sm">{(normalizationMatrix[app.id]?.['gpa'] || 0).toFixed(3)}</td>
                        <td className="px-8 py-5 text-center font-black text-emerald-600 text-sm">{(normalizationMatrix[app.id]?.['income'] || normalizationMatrix[app.id]?.['parentIncomeValue'] || 0).toFixed(3)}</td>
                        <td className="px-8 py-5 text-center font-black text-emerald-600 text-sm">{(normalizationMatrix[app.id]?.['dependents'] || 0).toFixed(3)}</td>
                        <td className="px-8 py-5 text-center font-black text-emerald-600 text-sm">{(normalizationMatrix[app.id]?.['achievements'] || 0).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                {finalScores.map((res, i) => (
                    <div key={res.appId} className={cn(
                        "p-6 rounded-3xl border transition-all relative overflow-hidden group flex items-center justify-between",
                        i === 0 ? "bg-slate-900 text-white border-slate-800 shadow-2xl scale-105 z-10" : "bg-white border-slate-100 shadow-md"
                    )}>
                        <div className="flex items-center gap-6">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                                i === 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                                {i + 1}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors" style={i === 0 ? { color: 'white' } : {}}>{res.name}</h3>
                                <div className="flex items-center gap-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.class}</p>
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Score: {res.score.toFixed(4)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => handleApplyAction(res.appId, 'approved')}
                                className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            >
                                <CheckCircle2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 h-fit sticky top-8">
                <Trophy className="text-amber-400 mb-6" size={40} />
                <h2 className="text-xl font-black text-slate-900 mb-4">Ringkasan Seleksi</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    Berdasarkan perhitungan SAW, <span className="font-black text-slate-900">{finalScores[0]?.name}</span> merupakan pendaftar dengan nilai preferensi tertinggi untuk program ini.
                </p>
                
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendaftar Terproses</span>
                        <span className="text-sm font-black text-slate-900">{finalScores.length}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Perhitungan</span>
                        <span className="text-sm font-black text-emerald-600 uppercase">SAW BENEFIT/COST</span>
                    </div>
                </div>

                <div className="mt-8 p-4 border border-amber-100 bg-amber-50 rounded-2xl">
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                        <span className="font-bold">Tips:</span> Silakan setujui (approve) pendaftar pada list di samping sesuai dengan kuota penerima yang tersedia pada program ini.
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

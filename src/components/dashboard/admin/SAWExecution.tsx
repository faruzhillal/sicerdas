import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
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
  Trophy
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface Criterion {
  id: string;
  name: string;
  weight: number;
  type: 'benefit' | 'cost';
}

interface StudentScoreData {
  id: string;
  name: string;
  class: string;
  scores: { [key: string]: number };
}

export default function SAWExecution() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [students, setStudents] = useState<StudentScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState(1); // 1: Matrix, 2: Normalization, 3: Final Rank

  // Local calculation result state
  const [normalizationMatrix, setNormalizationMatrix] = useState<{ [studentId: string]: { [criteriaId: string]: number } }>({});
  const [finalScores, setFinalScores] = useState<{ studentId: string; score: number; name: string; class: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Criteria
      const critSnap = await getDocs(collection(db, 'criteria'));
      const critData = critSnap.docs.map(d => ({ id: d.id, ...d.data() } as Criterion));
      setCriteria(critData);

      // Fetch Students & Scores
      const usersSnap = await query(collection(db, 'users'), where('role', '==', 'student'));
      const studentDocs = await getDocs(usersSnap);
      
      const scoresSnap = await getDocs(collection(db, 'criteria_scores'));
      const scoresMap = new Map();
      scoresSnap.forEach(d => scoresMap.set(d.id, d.data()));

      const studentData = studentDocs.docs.map(d => {
        const profile = d.data();
        const rawScores = scoresMap.get(d.id) || {};
        const scores: { [key: string]: number } = {};
        critData.forEach(c => scores[c.id] = rawScores[c.id] || 0);
        
        return {
          id: d.id,
          name: profile.fullName || 'No Name',
          class: profile.class || 'N/A',
          scores
        };
      });

      setStudents(studentData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const executeSAW = () => {
    setCalculating(true);
    
    // 1. Find Max/Min for each criteria
    const limits: { [key: string]: { max: number; min: number } } = {};
    criteria.forEach(c => {
      const values = students.map(s => s.scores[c.id] || 0);
      limits[c.id] = {
        max: Math.max(...values, 0.0001), // avoid div by zero
        min: Math.min(...values.filter(v => v > 0), 1) // default min for cost
      };
    });

    // 2. Normalize Matrix (R)
    const normMatrix: { [studentId: string]: { [criteriaId: string]: number } } = {};
    students.forEach(s => {
      normMatrix[s.id] = {};
      criteria.forEach(c => {
        const val = s.scores[c.id] || 0;
        if (c.type === 'benefit') {
          normMatrix[s.id][c.id] = val / limits[c.id].max;
        } else {
          normMatrix[s.id][c.id] = limits[c.id].min / Math.max(val, 0.0001);
        }
      });
    });
    setNormalizationMatrix(normMatrix);

    // 3. Final Weights Multiplication (V)
    const results = students.map(s => {
      let total = 0;
      criteria.forEach(c => {
        total += (normMatrix[s.id][c.id] || 0) * c.weight;
      });
      return {
        studentId: s.id,
        name: s.name,
        class: s.class,
        score: total
      };
    }).sort((a, b) => b.score - a.score);

    setFinalScores(results);
    setCalculating(false);
    setStep(2);
  };

  const publishRankings = async () => {
    if (!window.confirm("Publikasikan hasil pemeringkatan ini ke dashboard siswa?")) return;
    setPublishing(true);
    try {
      for (let i = 0; i < finalScores.length; i++) {
        const res = finalScores[i];
        const scaledScore = Math.round(res.score * 100 * 10) / 10;
        await setDoc(doc(db, 'rankings', res.studentId), {
          studentId: res.studentId,
          studentName: res.name,
          class: res.class,
          totalScore: res.score,
          score: scaledScore,
          rank: i + 1,
          updatedAt: new Date().toISOString()
        });
      }
      alert("Peringkat berhasil diperbarui!");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'rankings');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-600" size={32} />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Engine Perhitungan</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kalkulasi SAW Monitoring</h1>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {step === 1 ? (
            <button 
              onClick={executeSAW}
              disabled={students.length === 0 || criteria.length === 0}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {calculating ? <Loader2 size={20} className="animate-spin" /> : <Calculator size={20} />}
              Hitung Sekarang
            </button>
          ) : (
            <>
              <button 
                onClick={() => setStep(1)}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black transition-all hover:bg-slate-200"
              >
                Kembali
              </button>
              <button 
                onClick={publishRankings}
                disabled={publishing}
                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
              >
                {publishing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                Publikasikan Rank
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-full border border-slate-100 w-fit">
        <div className={cn("px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all", step === 1 ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-50 text-slate-400")}>01 Matrix Keputusan</div>
        <ArrowRight size={14} className="text-slate-300" />
        <div className={cn("px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all", step === 2 ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-50 text-slate-400")}>02 Normalisasi</div>
        <ArrowRight size={14} className="text-slate-300" />
        <div className={cn("px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all", step === 3 ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-50 text-slate-400")}>03 Hasil Akhir</div>
      </div>

      {students.length === 0 ? (
        <div className="bg-amber-50 border border-amber-100 p-8 rounded-[2rem] text-center max-w-2xl mx-auto space-y-4">
          <AlertCircle className="mx-auto text-amber-500" size={48} />
          <h3 className="text-lg font-black text-amber-900">Data Tidak Mencukupi</h3>
          <p className="text-sm text-amber-700 leading-relaxed font-medium">
            Maaf, sistem tidak dapat melakukan perhitungan karena belum ada data siswa atau kriteria yang diinputkan. Silakan periksa menu Input Nilai dan Pengaturan Kriteria.
          </p>
        </div>
      ) : step === 1 ? (
        /* Matrix Data */
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TableIcon size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900">Matrix Keputusan (X)</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data nilai mentah seluruh kriteria</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Siswa</th>
                  {criteria.map(c => (
                    <th key={c.id} className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      C: {c.name}<br/><span className="text-[8px] opacity-60 text-emerald-600">({(c.weight * 100).toFixed(0)}%)</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-900">{s.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.class}</p>
                    </td>
                    {criteria.map(c => (
                      <td key={c.id} className="px-8 py-5 text-center font-black text-slate-700 text-sm">
                        {s.scores[c.id] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : step === 2 ? (
        /* Normalization Matrix */
        <div className="space-y-8">
           <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    <Zap size={24} />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Normalisasi Matrix (R)</h2>
                </div>
                <button 
                  onClick={() => setStep(3)}
                  className="px-8 py-3 bg-white text-emerald-600 rounded-xl font-black text-sm hover:bg-slate-900 hover:text-white transition-all shadow-lg"
                >
                  Lanjut Lihat Ranking
                </button>
              </div>
              <p className="text-emerald-100/80 text-sm font-medium leading-relaxed max-w-2xl relative z-10">
                Sistem menghitung nilai normalisasi berdasarkan tipe kriteria. 
                <span className="font-black text-white ml-1">Benefit: (Value / Max)</span>, 
                <span className="font-black text-white ml-1">Cost: (Min / Value)</span>. 
                Nilai akhir berkisar antara 0 - 1.
              </p>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                      {criteria.map(c => (
                        <th key={c.id} className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          {c.id.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-900">{s.name}</p>
                        </td>
                        {criteria.map(c => (
                          <td key={c.id} className="px-8 py-5 text-center font-black text-emerald-600 text-sm">
                            {(normalizationMatrix[s.id]?.[c.id] || 0).toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      ) : (
        /* Final Rank (V) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {finalScores.map((res, i) => (
              <div key={res.studentId} className={cn(
                "p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group",
                i === 0 ? "bg-slate-900 text-white border-slate-800 scale-105 shadow-2xl z-10" : "bg-white border-slate-100 shadow-xl"
              )}>
                {i === 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full" />}
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black",
                    i === 0 ? "bg-emerald-600 shadow-lg shadow-emerald-500/50 text-white" : "bg-slate-50 text-slate-400"
                  )}>
                    {i + 1}
                  </div>
                  {i < 3 && <Trophy size={20} className={i === 0 ? "text-amber-400" : "text-slate-200"} />}
                </div>

                <h3 className="text-xl font-black mb-1">{res.name}</h3>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-8", i === 0 ? "text-slate-400" : "text-slate-400")}>
                  {res.class} • Peringkat {i + 1}
                </p>

                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Final Preference Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-tighter text-emerald-500">{res.score.toFixed(4)}</span>
                      <span className="text-xs font-black text-slate-400">/ 1.0</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {i === 0 && <CheckCircle2 className="text-emerald-400" size={24} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

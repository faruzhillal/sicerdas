import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Trophy, Plus, Save, Trash2, Search, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

interface StudentScore {
  id: string; // studentId
  studentName: string;
  class: string;
  nis: string;
  scores: { [key: string]: number };
}

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

const CLASSES = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'];

export default function ScoreInput() {
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch criteria
      const criteriaSnapshot = await getDocs(collection(db, 'criteria'));
      let criteriaData = criteriaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Criterion));
      
      // Default if none
      if (criteriaData.length === 0) {
        criteriaData = [
          { id: 'academic', name: 'Akademik', weight: 0.4 },
          { id: 'tahfidz', name: 'Tahfidz', weight: 0.3 },
          { id: 'behavior', name: 'Perilaku', weight: 0.2 },
          { id: 'attendance', name: 'Presensi', weight: 0.1 },
        ];
      }
      setCriteria(criteriaData);

      // Fetch students
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      
      // Fetch scores
      const scoresSnapshot = await getDocs(collection(db, 'criteria_scores'));
      const scoresMap = new Map();
      scoresSnapshot.forEach(doc => {
        scoresMap.set(doc.id, doc.data());
      });

      const studentScores: StudentScore[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const rawScore = scoresMap.get(doc.id) || {};
        
        const res: { [key: string]: number } = {};
        criteriaData.forEach(c => {
          res[c.id] = rawScore[c.id] ?? 0;
        });

        return {
          id: doc.id,
          studentName: data.fullName || 'No Name',
          class: data.class || 'N/A',
          nis: data.studentId || 'N/A',
          scores: res
        };
      });

      setScores(studentScores);
    } catch (error: any) {
      console.error("Error fetching scores:", error);
      if (error.message?.includes('insufficient permissions')) {
        alert("Anda tidak memiliki izin untuk mengakses data ini. Pastikan Anda masuk sebagai Admin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, criteriaId: string, value: string) => {
    const numValue = value === '' ? 0 : Math.min(100, Math.max(0, parseInt(value) || 0));
    setScores(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          scores: { ...s.scores, [criteriaId]: numValue }
        };
      }
      return s;
    }));
  };

  const saveScore = async (student: StudentScore) => {
    try {
      setSavingId(student.id);
      
      // Save raw scores
      await setDoc(doc(db, 'criteria_scores', student.id), {
        ...student.scores,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Calculate total for ranking using current criteria weights
      let totalScore = 0;
      criteria.forEach(c => {
        totalScore += (student.scores[c.id] || 0) * c.weight;
      });
      
      await setDoc(doc(db, 'rankings', student.id), {
        studentId: student.id,
        studentName: student.studentName,
        class: student.class,
        score: Math.round(totalScore * 10) / 10,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert(`Nilai ${student.studentName} berhasil disimpan!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `criteria_scores/${student.id}`);
    } finally {
      setSavingId(null);
    }
  };

  const filteredScores = scores.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || s.nis.includes(searchTerm);
    const matchesClass = selectedClass === 'Semua Kelas' || s.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
         <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Entry Nilai Siswa</p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Perhitungan Kriteria SPK</h1>
         </div>
         <button 
           onClick={() => alert('Fitur Import Excel akan segera hadir!')}
           className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200"
         >
           <Plus size={18} />
           Input Massal
         </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-wrap gap-4 justify-between items-center bg-slate-50/30">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari siswa berdasarkan nama atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm font-bold text-sm"
            />
          </div>
          <div className="flex gap-3">
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-6 py-3 border border-slate-100 rounded-2xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            >
              <option>Semua Kelas</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                {criteria.map(c => (
                  <th key={c.id} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    {c.name}
                  </th>
                ))}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={criteria.length + 2} className="px-6 py-12 text-center text-slate-400">Memuat data siswa...</td>
                </tr>
              ) : filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={criteria.length + 2} className="px-6 py-12 text-center text-slate-400">Tidak ada data siswa ditemukan.</td>
                </tr>
              ) : filteredScores.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{student.studentName}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">NIS: {student.nis} • Kelas {student.class}</p>
                  </td>
                  {criteria.map(c => (
                    <td key={c.id} className="px-6 py-4 text-center">
                      <input 
                        type="number" 
                        value={student.scores[c.id] || 0}
                        onChange={(e) => handleScoreChange(student.id, c.id, e.target.value)}
                        className="w-16 h-10 text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => saveScore(student)}
                        disabled={savingId === student.id}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" 
                        title="Simpan"
                      >
                        {savingId === student.id ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      </button>
                      <button 
                        onClick={() => alert('Fungsi reset nilai')}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                        title="Hapus Nilai"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


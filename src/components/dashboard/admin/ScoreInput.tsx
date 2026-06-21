import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Trophy, Plus, Save, Trash2, Search, Loader2, Download, Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [classesList, setClassesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua Kelas');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Bulk input states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const downloadTemplate = () => {
    const targetStudents = scores.filter(s => selectedClass === 'Semua Kelas' || s.class === selectedClass);
    if (targetStudents.length === 0) {
      alert("Tidak ada data siswa untuk kelas ini.");
      return;
    }

    const friendlyHeaders = ['NIS', 'Nama Siswa', 'Kelas', ...criteria.map(c => c.name)];
    
    const rows = [
      friendlyHeaders.join(','),
      ...targetStudents.map(s => {
        return [
          `"${s.nis}"`,
          `"${s.studentName}"`,
          `"${s.class}"`,
          ...criteria.map(c => s.scores[c.id] || 0)
        ].join(',');
      })
    ];

    const csvBlob = new Blob(["\uFEFF" + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.setAttribute("href", blobUrl);
    link.setAttribute("download", `template_nilai_${selectedClass.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkText(text);
        parseBulkInput(text);
      }
    };
    reader.readAsText(file);
  };

  const parseBulkInput = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      setBulkError("Data harus berisi minimal 1 baris header dan 1 baris data.");
      return;
    }

    // Try detecting delimiter: tab vs comma vs semicolon
    const headerLine = lines[0];
    let delimiter = ',';
    if (headerLine.includes('\t')) delimiter = '\t';
    else if (headerLine.includes(';')) delimiter = ';';

    const splitLine = (line: string, delim: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = splitLine(headerLine, delimiter).map(h => h.toLowerCase().replace(/["']/g, ''));
    
    // Find column indexes
    const nisIdx = headers.findIndex(h => h.includes('nis') || h.includes('induk') || h === 'id');
    const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('siswa'));
    const classIdx = headers.findIndex(h => h.includes('kelas') || h.includes('class') || h.includes('cls'));

    if (nisIdx === -1 && nameIdx === -1) {
      setBulkError("Header CSV/Excel harus memiliki kolom 'NIS' atau 'Nama Siswa' agar sistem bisa mendeteksi data siswa.");
      return;
    }

    const criteriaColMap: { [criteriaId: string]: number } = {};
    criteria.forEach(c => {
      const colIdx = headers.findIndex(h => 
        h === c.id.toLowerCase() || 
        h === c.name.toLowerCase() || 
        h.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(h)
      );
      if (colIdx !== -1) {
        criteriaColMap[c.id] = colIdx;
      }
    });

    const parsedRows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = splitLine(lines[i], delimiter);
      if (parts.length < Math.max(nisIdx, nameIdx) + 1) continue;

      const rowNis = nisIdx !== -1 ? parts[nisIdx]?.replace(/["']/g, '') : '';
      const rowName = nameIdx !== -1 ? parts[nameIdx]?.replace(/["']/g, '') : '';
      const rowClass = classIdx !== -1 ? parts[classIdx]?.replace(/["']/g, '') : '';

      // Try finding the matching student from our state `scores`
      let matchedStudent = scores.find(s => {
        if (rowNis && s.nis && s.nis.toLowerCase() === rowNis.toLowerCase()) return true;
        if (rowName && s.studentName && s.studentName.toLowerCase().trim() === rowName.toLowerCase().trim()) return true;
        return false;
      });

      const parsedScores: { [key: string]: number } = {};
      criteria.forEach(c => {
        const colIdx = criteriaColMap[c.id];
        if (colIdx !== undefined && parts[colIdx] !== undefined) {
          const val = parseInt(parts[colIdx].replace(/[^0-9]/g, '')) || 0;
          parsedScores[c.id] = Math.min(100, Math.max(0, val));
        } else {
          parsedScores[c.id] = matchedStudent ? (matchedStudent.scores[c.id] || 0) : 0;
        }
      });

      parsedRows.push({
        studentId: matchedStudent?.id || null,
        studentName: matchedStudent?.studentName || rowName || 'Tidak Diketahui',
        nis: matchedStudent?.nis || rowNis || 'N/A',
        class: matchedStudent?.class || rowClass || 'N/A',
        scores: parsedScores,
        isValid: !!matchedStudent
      });
    }

    setPreviewData(parsedRows);
    setBulkError(null);
  };

  const handleImportSave = async () => {
    const validRows = previewData.filter(r => r.isValid && r.studentId);
    if (validRows.length === 0) {
      alert("Tidak ada data siswa valid yang siap di-import.");
      return;
    }

    setImporting(true);
    try {
      for (const row of validRows) {
        await setDoc(doc(db, 'criteria_scores', row.studentId), {
          ...row.scores,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        let totalScore = 0;
        criteria.forEach(c => {
          totalScore += (row.scores[c.id] || 0) * c.weight;
        });

        await setDoc(doc(db, 'rankings', row.studentId), {
          studentId: row.studentId,
          studentName: row.studentName,
          class: row.class,
          score: Math.round(totalScore * 10) / 10,
          totalScore: totalScore / 100,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setImportSuccess(`Berhasil meng-import nilai untuk ${validRows.length} siswa!`);
      setShowBulkModal(false);
      setBulkText('');
      setPreviewData([]);
      setBulkError(null);
      
      fetchData();
      
      setTimeout(() => setImportSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan saat meng-import data: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const resetScore = async (student: StudentScore) => {
    if (!window.confirm(`Yakin ingin menyetel ulang (reset) semua nilai untuk ${student.studentName}?`)) return;
    try {
      setSavingId(student.id);
      
      const wipedScores: { [key: string]: number } = {};
      criteria.forEach(c => {
        wipedScores[c.id] = 0;
      });

      await setDoc(doc(db, 'criteria_scores', student.id), {
        ...wipedScores,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'rankings', student.id), {
        studentId: student.id,
        studentName: student.studentName,
        class: student.class,
        score: 0,
        totalScore: 0,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setScores(prev => prev.map(s => {
        if (s.id === student.id) {
          return {
            ...s,
            scores: wipedScores
          };
        }
        return s;
      }));

      alert(`Nilai ${student.studentName} berhasil di-reset!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `criteria_scores/${student.id}`);
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch dynamic classes from Firestore
      const classesSnapshot = await getDocs(query(collection(db, 'classes'), orderBy('name', 'asc')));
      const dbClasses = classesSnapshot.docs.map(d => d.data().name as string);
      setClassesList(dbClasses.length > 0 ? dbClasses : CLASSES);
      
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
        totalScore: totalScore / 100,
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
           onClick={() => {
             setBulkText('');
             setPreviewData([]);
             setBulkError(null);
             setShowBulkModal(true);
           }}
           className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200"
         >
           <FileSpreadsheet size={18} />
           Input Massal (Excel/CSV)
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
              {classesList.map(c => <option key={c} value={c}>{c}</option>)}
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
                        step="1"
                        min="0"
                        max="100"
                        value={student.scores[c.id] || 0}
                        onChange={(e) => handleScoreChange(student.id, c.id, e.target.value)}
                        className="w-16 h-10 text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold"
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
                        onClick={() => resetScore(student)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" 
                        title="Reset Nilai"
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

      {/* Floating Success Toast notification */}
      {importSuccess && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-bounce z-50">
          <CheckCircle2 className="text-emerald-400" size={18} />
          <p className="text-xs font-bold text-white leading-none">{importSuccess}</p>
        </div>
      )}

      {/* Bulk Input Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-4xl w-full border border-slate-100 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Input Massal Nilai Siswa</h3>
                  <p className="text-xs text-slate-500 font-bold">Import spreadsheet Excel atau file CSV secara praktis</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkModal(false)}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Template & Upload */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Langkah 1: Unduh Template</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Sistem akan membuat file template khusus berdasarkan data siswa kelas <span className="font-bold text-emerald-600">{selectedClass}</span>. Unduh lalu isi nilai dengan Excel.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    type="button"
                    className="w-full py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-emerald-200/50"
                  >
                    <Download size={14} />
                    Unduh Template {selectedClass}
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Langkah 2: Unggah File CSV atau Paste Data</h4>
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-slate-50/50">
                    <input 
                      type="file" 
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                    <p className="text-xs font-bold text-slate-700">Pilih berkas CSV atau drag-and-drop</p>
                    <p className="text-[10px] text-slate-400 mt-1">Gunakan format pemisah koma atau tab</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Text Paste & Instructions */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Atau Paste Langsung dari Excel</h4>
                  {bulkText && (
                    <button 
                      onClick={() => { setBulkText(''); setPreviewData([]); setBulkError(null); }}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => {
                    setBulkText(e.target.value);
                    parseBulkInput(e.target.value);
                  }}
                  rows={6}
                  placeholder={`NIS,Nama Siswa,Kelas,${criteria.map(c => c.name).join(',')}\n1001,Ahmad Dani,2A,85,90,80,95`}
                  className="w-full px-4 py-3 text-xs font-mono border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/30 placeholder-slate-400"
                />
                <p className="text-[10px] text-slate-400 leading-normal font-medium">
                  💡 Tips: Anda bisa menyeleksi baris tabel di Excel/Google Sheets, menyalinnya (<kbd className="px-1 bg-slate-100 rounded border">Ctrl</kbd>+<kbd className="px-1 bg-slate-100 rounded border">C</kbd>), dan mem-paste langsung ke kolom teks di atas.
                </p>
              </div>
            </div>

            {bulkError && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 text-rose-700">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="text-xs font-bold leading-normal">{bulkError}</div>
              </div>
            )}

            {/* Preview Parsing Results */}
            {previewData.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Pratinjau Hasil Parsing ({previewData.length} baris terdeteksi)
                </h4>
                <div className="overflow-x-auto max-h-[250px] border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 font-black text-slate-500">NIS</th>
                        <th className="px-4 py-3 font-black text-slate-500">Nama Siswa</th>
                        <th className="px-4 py-3 font-black text-slate-500">Kelas</th>
                        {criteria.map(c => (
                          <th key={c.id} className="px-4 py-3 font-black text-slate-500 text-center">{c.name}</th>
                        ))}
                        <th className="px-4 py-3 font-black text-slate-500 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? "hover:bg-slate-50" : "bg-rose-50/30 hover:bg-rose-50/50"}>
                          <td className="px-4 py-2 font-bold text-slate-700">{row.nis}</td>
                          <td className="px-4 py-2 font-bold text-slate-900">{row.studentName}</td>
                          <td className="px-4 py-2 font-bold text-slate-500">{row.class}</td>
                          {criteria.map(c => (
                            <td key={c.id} className="px-4 py-2 text-center font-bold text-slate-800">
                              {row.scores[c.id]}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-right">
                            {row.isValid ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-[9px] uppercase tracking-wider">Valid</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full font-black text-[9px] uppercase tracking-wider" title="Nama/NIS tidak terdaftar di sistem">Tidak Cocok</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                type="button"
                disabled={importing}
              >
                Tutup
              </button>
              <button
                onClick={handleImportSave}
                disabled={importing || previewData.filter(r => r.isValid).length === 0}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg disabled:opacity-50"
                type="button"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan {previewData.filter(r => r.isValid).length} Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


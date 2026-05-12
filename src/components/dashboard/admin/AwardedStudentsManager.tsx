import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { GraduationCap, Trophy, Search, User, Mail, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';
import { cn } from '../../../lib/utils';

interface AwardedStudent {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  scholarshipName: string;
  status: string;
  submittedAt: string;
  awardedAt?: string;
  disbursementStatus?: 'pending' | 'completed';
}

export default function AwardedStudentsManager() {
  const [awardedStudents, setAwardedStudents] = useState<AwardedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'scholarship_applications'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as AwardedStudent));
      
      setAwardedStudents(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scholarship_applications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDisbursementToggle = async (id: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await updateDoc(doc(db, 'scholarship_applications', id), {
        disbursementStatus: newStatus,
        disbursementDate: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `scholarship_applications/${id}`);
    }
  };

  const filtered = awardedStudents.filter(s => 
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.scholarshipName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Penerima Beasiswa</h1>
        <p className="text-slate-500 text-sm">Daftar siswa yang telah dinyatakan lolos dan menerima bantuan beasiswa.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama siswa atau jenis beasiswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400 font-medium italic">Memuat data penerima...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
             <Trophy className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-sm font-bold text-slate-400">Belum ada penerima beasiswa</p>
          </div>
        ) : filtered.map((student) => (
          <div key={student.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                  <User size={24} />
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={10} /> TERVERIFIKASI
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-black text-slate-900 leading-tight">{student.studentName}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kelas {student.studentClass}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl mb-6 space-y-3">
                <div className="flex items-center gap-3">
                  <GraduationCap className="text-indigo-600" size={16} />
                  <span className="text-xs font-bold text-slate-700">{student.scholarshipName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-slate-400" size={16} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tahun Ajaran 2024/2025</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Pencairan</p>
                  <p className={cn(
                    "text-xs font-bold",
                    student.disbursementStatus === 'completed' ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {student.disbursementStatus === 'completed' ? 'Dana Sudah Cair' : 'Menunggu Pencairan'}
                  </p>
                </div>
                <button 
                  onClick={() => handleDisbursementToggle(student.id, student.disbursementStatus)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    student.disbursementStatus === 'completed' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600"
                  )}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

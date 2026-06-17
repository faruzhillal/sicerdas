import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, setDoc, addDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Users, UserPlus, Search, MoreVertical, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';
import { cn } from '../../../lib/utils';

interface Student {
  uid: string;
  fullName: string;
  studentId: string; // NIS
  nisn?: string;     // NISN
  gender?: string;   // Jenis Kelamin
  religion?: string; // Agama
  semester?: string; // Semester
  status?: string;   // Status Siswa ('Aktif', 'Lulus', 'Non-Aktif', 'Pindah')
  email: string;
  class: string;
  address?: string;
  phone?: string;
  birthPlace?: string;
  birthDate?: string;
  parentName?: string;
  parentJob?: string;
  parentIncome?: string;
  role: 'student';
}

export default function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua Kelas');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Omit<Student, 'uid'>>({
    fullName: '',
    studentId: '',
    nisn: '',
    gender: 'Laki-laki',
    religion: 'Islam',
    semester: '1',
    status: 'Aktif',
    email: '',
    class: '',
    address: '',
    phone: '',
    birthPlace: '',
    birthDate: '',
    parentName: '',
    parentJob: '',
    parentIncome: '',
    role: 'student'
  });

  useEffect(() => {
    // Fetch classes
    const classQuery = query(collection(db, 'classes'), orderBy('name', 'asc'));
    const unsubscribeClasses = onSnapshot(classQuery, (snapshot) => {
      const classList = snapshot.docs.map(d => d.data().name as string);
      setClasses(classList);
      if (classList.length > 0 && !formData.class) {
        setFormData(prev => ({ ...prev, class: classList[0] }));
      }
    });

    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
      setStudents(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeClasses();
      unsubscribeStudents();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Clean undefined values from formData
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== undefined)
      );

      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), cleanData);
      } else {
        const newRef = doc(collection(db, 'users'));
        await setDoc(newRef, { ...cleanData, uid: newRef.id, role: 'student' });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        fullName: '',
        studentId: '',
        nisn: '',
        gender: 'Laki-laki',
        religion: 'Islam',
        semester: '1',
        status: 'Aktif',
        email: '',
        class: classes[0] || '',
        address: '',
        phone: '',
        birthPlace: '',
        birthDate: '',
        parentName: '',
        parentJob: '',
        parentIncome: '',
        role: 'student'
      });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'users');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm('Hapus data siswa ini?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      setStudents(prev => prev.filter(s => s.uid !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.studentId || '').includes(searchTerm) || 
      (s.nisn || '').includes(searchTerm) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClassFilter === 'Semua Kelas' || s.class === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Manajemen Pengguna</p>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Data Master Siswa</h1>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({
              fullName: '',
              studentId: '',
              nisn: '',
              gender: 'Laki-laki',
              religion: 'Islam',
              semester: '1',
              status: 'Aktif',
              email: '',
              class: classes[0] || '',
              address: '',
              phone: '',
              birthPlace: '',
              birthDate: '',
              parentName: '',
              parentJob: '',
              parentIncome: '',
              role: 'student'
            });
            setShowForm(true);
          }}
          className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200"
        >
          <UserPlus size={18} />
          Tambah Siswa
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Siswa' : 'Tambah Siswa Baru'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Lengkap</label>
                <input 
                  required
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">NIS</label>
                  <input 
                    required
                    type="text" 
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">NISN</label>
                  <input 
                    type="text" 
                    value={formData.nisn || ''}
                    onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Nomor Induk Siswa Nasional"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Kelas</label>
                  <select 
                    value={formData.class}
                    onChange={e => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {classes.length > 0 ? (
                      classes.map(c => <option key={c} value={c}>{c}</option>)
                    ) : (
                      <option disabled>Tambahkan kelas di menu Kelola Kelas</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Semester</label>
                  <select 
                    value={formData.semester || '1'}
                    onChange={e => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    <option value="1">1 (Satu)</option>
                    <option value="2">2 (Dua)</option>
                    <option value="3">3 (Tiga)</option>
                    <option value="4">4 (Empat)</option>
                    <option value="5">5 (Lima)</option>
                    <option value="6">6 (Enam)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                  <select 
                    value={formData.status || 'Aktif'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                    <option value="Pindah">Pindah</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Jenis Kelamin</label>
                  <select 
                    value={formData.gender || 'Laki-laki'}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Agama</label>
                  <select 
                    value={formData.religion || 'Islam'}
                    onChange={e => setFormData({ ...formData, religion: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tempat Lahir</label>
                  <input 
                    type="text" 
                    value={formData.birthPlace}
                    onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: Jakarta"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tanggal Lahir</label>
                  <input 
                    type="date" 
                    value={formData.birthDate}
                    onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nomor Telepon</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0812xxx"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Alamat domisili..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Data Orang Tua / Wali</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Orang Tua / Wali</label>
                    <input 
                      type="text" 
                      value={formData.parentName || ''}
                      onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="Nama ayah/ibu/wali..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pekerjaan Orang Tua</label>
                    <input 
                      type="text" 
                      value={formData.parentJob || ''}
                      onChange={e => setFormData({ ...formData, parentJob: e.target.value })}
                      placeholder="PNS, Karyawan, TNI, dll."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estimasi Gaji Bulanan</label>
                  <select 
                    value={formData.parentIncome || ''}
                    onChange={e => setFormData({ ...formData, parentIncome: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm font-medium"
                  >
                    <option value="">Pilih Range Gaji</option>
                    <option value="< Rp 1.000.000">{'< Rp 1.000.000'}</option>
                    <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                    <option value="Rp 2.500.000 - Rp 5.000.000">Rp 2.500.000 - Rp 5.000.000</option>
                    <option value="Rp 5.000.000 - Rp 7.500.000">Rp 5.000.000 - Rp 7.500.000</option>
                    <option value="> Rp 7.500.000">{'> Rp 7.500.000'}</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving || classes.length === 0}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {saving && <Loader2 size={18} className="animate-spin" />}
                {editingId ? 'Simpan Perubahan' : 'Tambah Siswa'}
              </button>
              {classes.length === 0 && <p className="text-[10px] text-rose-500 italic text-center">Silakan buat kelas terlebih dahulu di menu Kelola Kelas.</p>}
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden text-sm">
        <div className="p-8 border-b border-slate-50 flex flex-wrap gap-4 justify-between items-center bg-slate-50/30">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari siswa berdasarkan nama, NIS, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm font-bold text-sm"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Filter Kelas:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-4 py-3 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm font-bold text-sm min-w-[150px]"
            >
              <option value="Semua Kelas">Semua Kelas</option>
              {classes.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profil Siswa</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alamat & Nomor Telepon</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempat/Tgl Lahir</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orang Tua / Wali</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Memuat data siswa...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Tidak ada data siswa.</td></tr>
              ) : filteredStudents.map((s) => (
                <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 shrink-0">
                        {s.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{s.fullName}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            NIS: {s.studentId || '-'}
                          </span>
                          <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            NISN: {s.nisn || '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-600 block mb-1">
                      Kelas {s.class || '-'} <span className="text-[10px] text-slate-400 font-normal">(Sem. {s.semester || '1'})</span>
                    </span>
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      (s.status || 'Aktif') === 'Aktif' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                      s.status === 'Lulus' && "bg-blue-50 text-blue-600 border-blue-100",
                      s.status === 'Pindah' && "bg-amber-50 text-amber-600 border-amber-100",
                      s.status === 'Non-Aktif' && "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {s.status || 'Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                    <p className="line-clamp-1 max-w-[150px]" title={s.address}>{s.address || '-'}</p>
                    <p className="text-[10px] text-slate-500">{s.phone || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                    <p>{s.birthPlace || '-'}</p>
                    <p className="text-[10px] text-slate-500">{s.birthDate || '-'}</p>
                    <div className="flex gap-1.5 mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{s.gender || 'Laki-laki'}</span>
                      <span>•</span>
                      <span>{s.religion || 'Islam'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                    <p className="font-bold text-slate-900">{s.parentName || '-'}</p>
                    <p className="text-[10px] text-slate-500">{s.parentJob || '-'}</p>
                    {s.parentIncome && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] text-emerald-700 font-bold border border-emerald-100">
                        {s.parentIncome}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{s.email}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => {
                          setEditingId(s.uid);
                          setFormData({ 
                            fullName: s.fullName || '', 
                            studentId: s.studentId || '', 
                            nisn: s.nisn || '',
                            gender: s.gender || 'Laki-laki',
                            religion: s.religion || 'Islam',
                            semester: s.semester || '1',
                            status: s.status || 'Aktif',
                            email: s.email || '', 
                            class: s.class || '', 
                            address: s.address || '',
                            phone: s.phone || '',
                            birthPlace: s.birthPlace || '',
                            birthDate: s.birthDate || '',
                            parentName: s.parentName || '',
                            parentJob: s.parentJob || '',
                            parentIncome: s.parentIncome || '',
                            role: 'student' 
                          });
                          setShowForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteStudent(s.uid)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
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


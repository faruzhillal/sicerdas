import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Loader2, 
  GraduationCap, 
  Users, 
  Trophy, 
  CheckCircle2, 
  MessageSquare, 
  AlertCircle,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { handleFirestoreError, OperationType } from '../../../lib/firebase-errors';

// Interfaces matching database structures
interface Student {
  uid: string;
  fullName: string;
  studentId: string;
  nisn?: string;
  class: string;
  gender?: string;
  religion?: string;
  status?: string;
  phone?: string;
  address?: string;
  parentName?: string;
  parentJob?: string;
  parentIncome?: string;
  dependents?: string;
}

interface Scholarship {
  id: string;
  name: string;
  description?: string;
  weightAcademic?: number;
  weightHafalan?: number;
  weightPerilaku?: number;
  weightPresensi?: number;
  weightPenghasilan?: number;
  weightTanggungan?: number;
}

interface Application {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  nisn?: string;
  parentName?: string;
  parentIncome?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  sawScore?: number;
  disbursementStatus?: 'pending' | 'completed';
  criteriaValues?: {
    gpa?: number;
    achievements?: number;
    dependents?: number;
    nilaiAkademik?: number;
    nilaiHafalan?: number;
    nilaiPerilaku?: number;
    nilaiPresensi?: number;
    nilaiPenghasilan?: number;
    nilaiTanggungan?: number;
  };
}

interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  category: string;
  status: 'new' | 'in_progress' | 'resolved';
  submittedAt: string;
}

export default function ReportsManager() {
  const [reportType, setReportType] = useState<'ranking' | 'students' | 'applications' | 'awarded' | 'complaints'>('ranking');
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  
  // Filter States
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classesList, setClassesList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch lists for filters
  useEffect(() => {
    // Fetch active scholarships
    const unsubscribeSch = onSnapshot(collection(db, 'scholarships'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scholarship));
      setScholarships(list);
    });

    // Fetch unique classes
    const unsubscribeCls = onSnapshot(collection(db, 'classes'), (snap) => {
      const list = snap.docs.map(doc => doc.data().name as string).filter(Boolean);
      setClassesList(list);
    });

    return () => {
      unsubscribeSch();
      unsubscribeCls();
    };
  }, []);

  // Fetch report data on reportType change or filters
  useEffect(() => {
    setLoading(true);
    let unsubscribe: () => void = () => {};

    if (reportType === 'students') {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      unsubscribe = onSnapshot(q, (snap) => {
        const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Student));
        setStudents(list);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });
    } else if (reportType === 'ranking' || reportType === 'applications' || reportType === 'awarded') {
      let q = query(collection(db, 'scholarship_applications'), orderBy('submittedAt', 'desc'));
      
      unsubscribe = onSnapshot(q, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
        setApplications(list);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });
    } else if (reportType === 'complaints') {
      const q = query(collection(db, 'complaints'), orderBy('submittedAt', 'desc'));
      unsubscribe = onSnapshot(q, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
        setComplaints(list);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });
    }

    return () => unsubscribe();
  }, [reportType]);

  // Clean data according to current filters & search query
  const getFilteredData = () => {
    if (reportType === 'students') {
      return students.filter(s => {
        const matchesClass = selectedClass === 'all' || s.class === selectedClass;
        const matchesSearch = !searchQuery || 
          s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (s.studentId && s.studentId.includes(searchQuery)) ||
          (s.nisn && s.nisn.includes(searchQuery));
        return matchesClass && matchesSearch;
      });
    }

    if (reportType === 'ranking') {
      // Filtering pending/evaluating applications with active SAW scores
      return applications.filter(app => {
        const matchesScholarship = selectedScholarshipId === 'all' || app.scholarshipId === selectedScholarshipId;
        const matchesClass = selectedClass === 'all' || app.studentClass === selectedClass;
        const matchesSearch = !searchQuery || app.studentName.toLowerCase().includes(searchQuery.toLowerCase());
        // For ranking, we want to include all applications for that program sorted by sawScore or status
        return matchesScholarship && matchesClass && matchesSearch;
      }).sort((a, b) => (b.sawScore || 0) - (a.sawScore || 0));
    }

    if (reportType === 'applications') {
      return applications.filter(app => {
        const matchesScholarship = selectedScholarshipId === 'all' || app.scholarshipId === selectedScholarshipId;
        const matchesClass = selectedClass === 'all' || app.studentClass === selectedClass;
        const matchesSearch = !searchQuery || app.studentName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesScholarship && matchesClass && matchesSearch;
      });
    }

    if (reportType === 'awarded') {
      return applications.filter(app => {
        const isApproved = app.status === 'approved';
        const matchesScholarship = selectedScholarshipId === 'all' || app.scholarshipId === selectedScholarshipId;
        const matchesClass = selectedClass === 'all' || app.studentClass === selectedClass;
        const matchesSearch = !searchQuery || app.studentName.toLowerCase().includes(searchQuery.toLowerCase());
        return isApproved && matchesScholarship && matchesClass && matchesSearch;
      });
    }

    if (reportType === 'complaints') {
      return complaints.filter(c => {
        const matchesSearch = !searchQuery || 
          c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
          c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    }

    return [];
  };

  const processedData = getFilteredData();

  // Export to Excel-compatible CSV with UTF-8 BOM
  const exportToCSV = () => {
    if (processedData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    let csvContent = "";
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = "";

    const formatCsvValue = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (reportType === 'students') {
      filename = `Laporan_Data_Siswa_SDQ_Al_Mahmudah_${selectedClass}.csv`;
      headers = ['NIS', 'NISN', 'Nama Lengkap', 'Kelas', 'Jenis Kelamin', 'Agama', 'No HP', 'Alamat', 'Orang Tua / Wali', 'Pekerjaan Orang Tua', 'Penghasilan Orang Tua', 'Tanggungan', 'Status'];
      rows = (processedData as Student[]).map(s => [
        s.studentId,
        s.nisn || '-',
        s.fullName,
        s.class,
        s.gender || '-',
        s.religion || '-',
        s.phone || '-',
        s.address || '-',
        s.parentName || '-',
        s.parentJob || '-',
        s.parentIncome || '-',
        s.dependents || '-',
        s.status || 'Aktif'
      ]);
    } else if (reportType === 'ranking') {
      filename = `Laporan_Pemeringkatan_SAW_${selectedScholarshipId}.csv`;
      headers = ['Peringkat', 'Nama Siswa', 'Kelas', 'Program Beasiswa', 'Skor SAW', 'Nilai Akademik', 'Nilai Tahfidz', 'Nilai Perilaku', 'Nilai Presensi', 'Penghasilan Ortu', 'Tanggungan', 'Status Pengajuan'];
      rows = (processedData as Application[]).map((app, idx) => [
        String(idx + 1),
        app.studentName,
        app.studentClass,
        app.scholarshipName,
        app.sawScore !== undefined ? String(app.sawScore) : '-',
        String(app.criteriaValues?.gpa || '-'),
        String(app.criteriaValues?.achievements || '-'),
        String(app.criteriaValues?.dependents || '-'),
        '-', // Placeholder legacy fields
        app.parentIncome || '-',
        String(app.criteriaValues?.dependents || '-'),
        app.status === 'approved' ? 'DISETUJUI' : app.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'
      ]);
    } else if (reportType === 'applications') {
      filename = `Laporan_Pengajuan_Beasiswa.csv`;
      headers = ['Nama Siswa', 'Kelas', 'Program Beasiswa', 'NISN', 'Nama Wali', 'Penghasilan Wali', 'Tanggal Pengajuan', 'Status'];
      rows = (processedData as Application[]).map(app => [
        app.studentName,
        app.studentClass,
        app.scholarshipName,
        app.nisn || '-',
        app.parentName || '-',
        app.parentIncome || '-',
        app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('id-ID') : '-',
        app.status === 'approved' ? 'DISETUJUI' : app.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'
      ]);
    } else if (reportType === 'awarded') {
      filename = `Laporan_Penerima_Beasiswa_Lolos.csv`;
      headers = ['Nama Penerima', 'Kelas', 'Program Beasiswa', 'NISN', 'Nama Wali', 'Status Pencairan Dana', 'Tanggal Terproses'];
      rows = (processedData as Application[]).map(app => [
        app.studentName,
        app.studentClass,
        app.scholarshipName,
        app.nisn || '-',
        app.parentName || '-',
        app.disbursementStatus === 'completed' ? 'Sudah Cair' : 'Menunggu Pencairan',
        app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('id-ID') : '-'
      ]);
    } else if (reportType === 'complaints') {
      filename = `Laporan_Aduan_Siswa_SDQ_Al_Mahmudah.csv`;
      headers = ['Nama Pengadu', 'Kategori', 'Isi Aduan / Keluhan', 'Tanggal Masuk', 'Status'];
      rows = (processedData as Complaint[]).map(c => [
        c.studentName,
        c.category,
        c.message,
        c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('id-ID') : '-',
        c.status === 'resolved' ? 'SELESAI' : c.status === 'in_progress' ? 'DIPROSES' : 'BARU'
      ]);
    }

    // Combine headers and rows
    csvContent = "\uFEFF"; // Add UTF-8 BOM so Excel opens with proper encoding
    csvContent += headers.map(formatCsvValue).join(";") + "\r\n"; // Use semicolon for seamless Indonesian Excel integration
    rows.forEach(row => {
      csvContent += row.map(formatCsvValue).join(";") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open structured Printable layout
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const todayString = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let titleText = "";
    let tableHeaders = "";
    let tableRows = "";

    // Build the tables dynamically
    if (reportType === 'students') {
      titleText = `DATA MASTER SISWA - KELAS ${selectedClass === 'all' ? 'SEMUA KELAS' : selectedClass.toUpperCase()}`;
      tableHeaders = `
        <tr>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">No</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">NIS/NISN</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Nama Siswa</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Kelas</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">JK</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Orang Tua / Wali</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">No Telepon</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Status</th>
        </tr>
      `;
      tableRows = (processedData as Student[]).map((s, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${s.studentId || '-'}<br/><small style="color:#555">${s.nisn || '-'}</small></td>
          <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${s.fullName}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${s.class}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${s.gender === 'Laki-laki' ? 'L' : 'P'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${s.parentName || '-'}<br/><small>${s.parentJob || '-'}</small></td>
          <td style="border: 1px solid #000; padding: 8px;">${s.phone || '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${s.status || 'Aktif'}</td>
        </tr>
      `).join("");
    } else if (reportType === 'ranking') {
      const activeSch = scholarships.find(s => s.id === selectedScholarshipId);
      titleText = `LAPORAN HASIL PEMERINGKATAN SPK BEASISWA\nPROGRAM: ${activeSch ? activeSch.name.toUpperCase() : 'SEMUA PROGRAM'}`;
      tableHeaders = `
        <tr>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Peringkat</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Nama Siswa</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Kelas</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Program Beasiswa</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center; background-color: #f0f0f0;">Skor SAW (0-100)</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Status Pengajuan</th>
        </tr>
      `;
      tableRows = (processedData as Application[]).map((app, idx) => `
        <tr ${idx === 0 ? 'style="background-color: #f9f9f9; font-weight: bold;"' : ''}>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${app.studentName}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${app.studentClass}</td>
          <td style="border: 1px solid #000; padding: 8px;">${app.scholarshipName}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: black; font-size: 14px; color: #059669; background-color: #f0fdf4;">
            ${app.sawScore !== undefined ? app.sawScore : '-'}
          </td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">
            ${app.status === 'approved' ? 'DISETUJUI' : app.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU SELEKSI'}
          </td>
        </tr>
      `).join("");
    } else if (reportType === 'applications') {
      titleText = "LAPORAN SELURUH DATA PENGAJUAN MASUK";
      tableHeaders = `
        <tr>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">No</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Nama Siswa</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Kelas</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Program Beasiswa</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Wali Siswa</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Pendapatan</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Tanggal Daftar</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Status</th>
        </tr>
      `;
      tableRows = (processedData as Application[]).map((app, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${app.studentName}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${app.studentClass}</td>
          <td style="border: 1px solid #000; padding: 8px;">${app.scholarshipName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${app.parentName || '-'}</td>
          <td style="border: 1px solid #000; padding: 8px;">${app.parentIncome || '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('id-ID') : '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">
            ${app.status === 'approved' ? 'DISETUJUI (LOLOS)' : app.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'}
          </td>
        </tr>
      `).join("");
    } else if (reportType === 'awarded') {
      titleText = "LAPORAN PENERIMA BEASISWA (LOLOS SELEKSI)";
      tableHeaders = `
        <tr>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">No</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Nama Penerima</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Kelas</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Program Beasiswa</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Nama Orang Tua</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Pencairan Dana</th>
        </tr>
      `;
      tableRows = (processedData as Application[]).map((app, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${app.studentName}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${app.studentClass}</td>
          <td style="border: 1px solid #000; padding: 8px; font-weight: bold; color: #0d9488;">${app.scholarshipName}</td>
          <td style="border: 1px solid #000; padding: 8px;">${app.parentName || '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; color: ${app.disbursementStatus === 'completed' ? '#059669' : '#d97706'}">
            ${app.disbursementStatus === 'completed' ? 'SUDAH CAIR' : 'MENUNGGU'}
          </td>
        </tr>
      `).join("");
    } else if (reportType === 'complaints') {
      titleText = "LAPORAN PENGAJUAN ADUAN DAN KELUHAN SISWA";
      tableHeaders = `
        <tr>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">No</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Nama Pengadu</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Kategori</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: left;">Isi Aduan / Masalah</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Tanggal</th>
          <th style="border: 1px solid #000; padding: 8px; text-align: center;">Status</th>
        </tr>
      `;
      tableRows = (processedData as Complaint[]).map((c, idx) => `
        <tr>
          <td style="border: 1px solid #000; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 8px; font-weight: bold;">${c.studentName}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${c.category}</td>
          <td style="border: 1px solid #000; padding: 8px;">${c.message}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('id-ID') : '-'}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">
            ${c.status === 'resolved' ? 'SELESAI' : c.status === 'in_progress' ? 'DIPROSES' : 'BARU'}
          </td>
        </tr>
      `).join("");
    }

    // Write the full, pristine, official Indonesian school letterhead HTML string
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Laporan - SDQ Al Mahmudah</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #000;
              background-color: #fff;
            }
            .header-container {
              display: flex;
              align-items: center;
              border-bottom: 4px double #000;
              padding-bottom: 12px;
              margin-bottom: 30px;
            }
            .header-logo {
              width: 80px;
              height: 80px;
              margin-right: 20px;
              border-radius: 12px;
              background-color: #059669;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 28px;
              font-weight: bold;
            }
            .header-text {
              flex: 1;
              text-align: center;
            }
            .header-text h1 {
              font-size: 22px;
              font-weight: 900;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header-text h2 {
              font-size: 16px;
              font-weight: bold;
              margin: 4px 0 0 0;
              text-transform: uppercase;
              color: #333;
            }
            .header-text p {
              font-size: 11px;
              margin: 4px 0 0 0;
              color: #555;
            }
            .report-title {
              text-align: center;
              font-size: 16px;
              font-weight: 900;
              margin-bottom: 25px;
              text-decoration: underline;
              text-transform: uppercase;
              line-height: 1.4;
            }
            .meta-info {
              margin-bottom: 20px;
              font-size: 12px;
              line-height: 1.6;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
              font-size: 11px;
            }
            th {
              background-color: #f5f5f5 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-weight: bold;
              text-transform: uppercase;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
            .signature-container {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              font-size: 12px;
              page-break-inside: avoid;
            }
            .signature-box {
              width: 250px;
              text-align: center;
            }
            .signature-space {
              height: 80px;
            }
            .signature-name {
              font-weight: bold;
              text-decoration: underline;
            }
            @media print {
              body {
                margin: 20px;
              }
              button {
                display: none;
              }
            }
            .no-print-btn {
              padding: 10px 20px;
              background-color: #059669;
              color: #fff;
              border: none;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              margin-bottom: 20px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .no-print-btn:hover {
              background-color: #047857;
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 10px;">
            <button class="no-print-btn" onclick="window.print()">Cetak Laporan / Simpan PDF</button>
          </div>

          <!-- Official Indonesian Kop Surat -->
          <div class="header-container">
            <div class="header-logo">
              🎓
            </div>
            <div class="header-text">
              <h1>SDQ AL MAHMUDAH</h1>
              <h2>SISTEM MONITORING & PENERIMAAN BEASISWA (SPK-SAW)</h2>
              <p>Perumahan Bukit Permata Blok B9 No. 12, Kec. Ciputat, Tangerang Selatan | Telp: 0812-3456-7890 | Email: info@sdqalmahmudah.sch.id</p>
            </div>
          </div>

          <div class="report-title">
            ${titleText.replace(/\n/g, '<br/>')}
          </div>

          <div class="meta-info">
            <strong>Tanggal Cetak:</strong> ${todayString}<br/>
            <strong>Dicetak Oleh:</strong> Administrator Sistem (SiCerdas)<br/>
            <strong>Total Rekord:</strong> ${processedData.length} Data ditemukan
          </div>

          <table>
            <thead>
              ${tableHeaders}
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <!-- Official signatures block -->
          <div class="signature-container">
            <div class="signature-box">
              <p>Mengetahui,</p>
              <p style="font-weight: bold;">Kepala Sekolah SDQ Al Mahmudah</p>
              <div class="signature-space"></div>
              <p class="signature-name">H. Mahmud, M.Pd.</p>
              <p>NIP. 19740812 200112 1 002</p>
            </div>
            <div class="signature-box">
              <p>Tangerang Selatan, ${new Date().getDate()} ${new Date().toLocaleDateString('id-ID', { month: 'long' })} ${new Date().getFullYear()}</p>
              <p style="font-weight: bold;">Ketua Panitia Beasiswa</p>
              <div class="signature-space"></div>
              <p class="signature-name">${window.opener?.document.querySelector('[data-admin-name]')?.textContent || 'Staff Administrasi'}</p>
              <p>Sistem SiCerdas</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-16">
      {/* Title block */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Pusat Cetak Dokumen</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cetak & Unduh Laporan</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            Ekspor data master siswa, hasil seleksi SPK-SAW, program beasiswa, aduan, dan kriteria ke Excel (CSV) atau cetak PDF ber-kop resmi.
          </p>
        </div>
      </div>

      {/* Grid of Report selection */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { type: 'ranking', label: 'Pemeringkatan SAW', icon: Trophy, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100/50 border-amber-200' },
          { type: 'students', label: 'Data Master Siswa', icon: Users, color: 'text-sky-600 bg-sky-50 hover:bg-sky-100/50 border-sky-200' },
          { type: 'applications', label: 'Pengajuan Masuk', icon: FileText, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100/50 border-indigo-200' },
          { type: 'awarded', label: 'Penerima Lolos', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100/50 border-emerald-200' },
          { type: 'complaints', label: 'Laporan Aduan', icon: MessageSquare, color: 'text-rose-600 bg-rose-50 hover:bg-rose-100/50 border-rose-200' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => {
              setReportType(item.type as any);
              setSearchQuery('');
            }}
            className={cn(
              "p-5 rounded-[2rem] border transition-all flex flex-col items-center justify-center text-center gap-3 shrink-0 cursor-pointer shadow-sm",
              reportType === item.type
                ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105 z-10"
                : `${item.color} bg-white text-slate-700`
            )}
          >
            <item.icon size={24} className={reportType === item.type ? "text-emerald-400" : ""} />
            <span className="text-[11px] font-black uppercase tracking-wider leading-snug">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Filter and export action card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/20 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 flex-1 min-w-[300px]">
            {/* Conditional Sub-Filters */}
            {(reportType === 'ranking' || reportType === 'applications' || reportType === 'awarded') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Program Beasiswa</label>
                <select
                  value={selectedScholarshipId}
                  onChange={(e) => setSelectedScholarshipId(e.target.value)}
                  className="px-4 py-2.5 border border-slate-100 bg-white rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 outline-none"
                >
                  <option value="all">Semua Program Beasiswa</option>
                  {scholarships.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(reportType === 'students' || reportType === 'ranking' || reportType === 'applications' || reportType === 'awarded') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Filter Kelas</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-4 py-2.5 border border-slate-100 bg-white rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 outline-none min-w-[140px]"
                >
                  <option value="all">Semua Kelas</option>
                  {classesList.map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5 flex-1 max-w-sm">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Cari Data</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik kata kunci pencarian..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-100 bg-white rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Export Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={exportToCSV}
              disabled={loading || processedData.length === 0}
              className="px-5 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Excel (CSV)
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || processedData.length === 0}
              className="px-5 py-3 bg-slate-900 text-white hover:bg-emerald-600 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Printer size={16} />
              Cetak / PDF
            </button>
          </div>
        </div>

        {/* Live Preview area */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-xs font-bold uppercase tracking-widest">Sedang mengompilasi pratinjau...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 italic">
              <AlertCircle size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="font-bold text-sm">Tidak ditemukan data yang cocok dengan kriteria filter</p>
              <p className="text-xs mt-1">Silakan sesuaikan filter atau tambahkan data terlebih dahulu di menu utama.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {reportType === 'students' && (
                    <>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas & Gender</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orang Tua / Wali</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kontak & Alamat</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </>
                  )}
                  {reportType === 'ranking' && (
                    <>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Rank</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program Beasiswa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Skor SAW</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Berkas</th>
                    </>
                  )}
                  {reportType === 'applications' && (
                    <>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program Beasiswa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wali / Penghasilan</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal Daftar</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </>
                  )}
                  {reportType === 'awarded' && (
                    <>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penerima Lolos</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Program Beasiswa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Ortu</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status Pencairan</th>
                    </>
                  )}
                  {reportType === 'complaints' && (
                    <>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pengadu</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keluhan / Aduan</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {reportType === 'students' && (processedData as Student[]).map((s) => (
                  <tr key={s.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{s.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">NIS: {s.studentId || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>Kelas {s.class}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{s.gender || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{s.parentName || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{s.parentJob || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="line-clamp-1 max-w-[150px]">{s.address || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{s.phone || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        (s.status || 'Aktif') === 'Aktif' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                      )}>
                        {s.status || 'Aktif'}
                      </span>
                    </td>
                  </tr>
                ))}

                {reportType === 'ranking' && (processedData as Application[]).map((app, idx) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "w-6 h-6 rounded-lg inline-flex items-center justify-center font-bold text-[10px]",
                        idx === 0 ? "bg-amber-100 text-amber-800" : idx === 1 ? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-400"
                      )}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{app.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kelas {app.studentClass}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold">{app.scholarshipName}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-emerald-600 text-sm">{app.sawScore !== undefined ? app.sawScore : '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        app.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        app.status === 'rejected' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {app.status === 'approved' ? 'DISETUJUI' : app.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'}
                      </span>
                    </td>
                  </tr>
                ))}

                {reportType === 'applications' && (processedData as Application[]).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{app.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kelas {app.studentClass}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold">{app.scholarshipName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{app.parentName || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{app.parentIncome || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        app.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        app.status === 'rejected' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {app.status === 'approved' ? 'DISETUJUI' : app.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'}
                      </span>
                    </td>
                  </tr>
                ))}

                {reportType === 'awarded' && (processedData as Application[]).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{app.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kelas {app.studentClass}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-teal-700">{app.scholarshipName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{app.parentName || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        app.disbursementStatus === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {app.disbursementStatus === 'completed' ? 'Dana Sudah Cair' : 'Menunggu'}
                      </span>
                    </td>
                  </tr>
                ))}

                {reportType === 'complaints' && (processedData as Complaint[]).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.studentName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{c.category}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={c.message}>{c.message}</td>
                    <td className="px-6 py-4">
                      {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        c.status === 'resolved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        c.status === 'in_progress' ? "bg-sky-50 text-sky-600 border-sky-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {c.status === 'resolved' ? 'SELESAI' : c.status === 'in_progress' ? 'DIPROSES' : 'BARU'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

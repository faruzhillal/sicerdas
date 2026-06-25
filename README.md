# ScholarSPK - SDQ Al Mahmudah

**ScholarSPK** adalah sistem informasi modern berbasis web untuk monitoring, pengolahan data kriteria, dan seleksi penerimaan beasiswa menggunakan metode **Simple Additive Weighting (SAW)** di **SDQ Al Mahmudah**. Aplikasi ini dirancang untuk memudahkan pihak sekolah dalam menyeleksi calon penerima beasiswa secara objektif, transparan, dan efisien.

---

## 🚀 Fitur Utama

Sistem ini terdiri dari beberapa modul utama yang saling terintegrasi:

### 1. **Data Master & Akademik**
*   **Data Master Siswa:** Pengelolaan informasi lengkap siswa (NIS, NISN, Kelas, Wali, Kontak, dan Status).
*   **Kelola Kelas:** Penambahan dan manajemen kelas-kelas aktif di SDQ Al Mahmudah.
*   **Pengelola Akun:** Sistem registrasi dan pembagian hak akses (Administrator dan Siswa).

### 2. **Sistem Pendukung Keputusan (SPK-SAW)**
*   **Kriteria Penilaian:** Konfigurasi bobot kriteria utama (Nilai Akademik, Nilai Hafalan/Tahfidz, Perilaku, Presensi, Penghasilan Orang Tua, dan Jumlah Tanggungan).
*   **Input Nilai Evaluasi:** Pengisian data kriteria bagi setiap siswa secara cepat dan terstruktur.
*   **Perhitungan SAW (Sistem & Simulasi):** Kalkulasi normalisasi matriks dan perangkingan otomatis untuk menentukan nilai kelayakan.

### 3. **Manajemen Beasiswa & Hasil**
*   **Program Beasiswa:** Pembuatan program beasiswa aktif beserta pengaturan tanggal pendaftaran.
*   **Daftar Pengajuan:** Verifikasi dokumen kelengkapan pendaftaran dari siswa.
*   **Seleksi Beasiswa:** Proses perangkingan real-time berbasis data kriteria pengajuan program beasiswa tertentu.
*   **Penerima Lolos Seleksi:** Monitoring status kelulusan dan proses pencairan dana beasiswa bagi para penerima terpilih.

### 4. **Layanan & Pelaporan**
*   **Cetak & Unduh Laporan:** Pembuatan laporan ber-kop surat resmi sekolah dalam format PDF siap cetak atau ekspor ke format Excel (CSV).
*   **Aduan & Keluhan Siswa:** Layanan interaktif bagi siswa untuk menyampaikan keluhan atau kendala teknis langsung kepada administrator.
*   **Portal Berita & Kegiatan:** Manajemen informasi, artikel, dan dokumentasi kegiatan sekolah.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan arsitektur modern berkinerja tinggi:

*   **Frontend:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Modern Utility-First Styles)
*   **Animasi:** [Framer Motion](https://www.framer.com/motion/) (Smooth Transitions & Staggers)
*   **Database & Autentikasi:** [Firebase Firestore & Firebase Auth](https://firebase.google.com/) (Real-time Sync)
*   **Icons:** [Lucide React](https://lucide.dev/)

---

## 💻 Panduan Instalasi Lokal

Ikuti langkah-langkah berikut untuk menjalankan aplikasi ini di komputer lokal Anda:

### **Prasyarat**
Pastikan Anda sudah menginstal:
*   [Node.js](https://nodejs.org/) (Sangat direkomendasikan versi LTS/terbaru)
*   npm (Sudah terinstal otomatis bersama Node.js)

### **Langkah-Langkah**

1.  **Clone atau Unduh Proyek**
    Unduh repositori ini ke komputer lokal Anda.

2.  **Instalasi Dependensi**
    Buka terminal di dalam direktori proyek ini, lalu jalankan:
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variables**
    Buat berkas bernama `.env.local` di direktori utama (root) proyek, lalu masukkan konfigurasi Firebase Anda seperti contoh berikut:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key_here
    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
    VITE_FIREBASE_PROJECT_ID=your_project_id_here
    VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
    VITE_FIREBASE_APP_ID=your_app_id_here
    ```

4.  **Menjalankan Aplikasi secara Lokal (Development)**
    Jalankan perintah berikut untuk mengaktifkan server pengembangan lokal:
    ```bash
    npm run dev
    ```
    Setelah server berjalan, buka peramban Anda dan kunjungi halaman:
    [http://localhost:3000](http://localhost:3000) atau alamat port yang ditampilkan di terminal Anda.

5.  **Membangun Aplikasi untuk Produksi**
    Gunakan perintah berikut untuk mengompilasi kode menjadi berkas statis siap rilis:
    ```bash
    npm run build
    ```

---

## 📄 Lisensi

Proyek ini dibuat dan dikembangkan untuk lingkungan internal **SDQ Al Mahmudah**. Hak Cipta © 2026. Semua Hak Dilindungi Undang-Undang.

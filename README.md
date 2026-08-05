# SwitchFile — Free Client-Side File Converter & AI Utilities

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat-flat&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-flat&logo=tailwind-css)](https://tailwindcss.com/)
[![100% Client-Side](https://img.shields.io/badge/Processing-100%25_Client--Side-emerald?style=flat-flat)](https://developer.mozilla.org/en-US/docs/Web/API/WebAssembly)
[![Privacy First](https://img.shields.io/badge/Privacy-First-blue?style=flat-flat)](https://www.w3.org/TR/IndexedDB/)

**SwitchFile** adalah platform utilitas file bertenaga AI yang berjalan 100% di sisi klien (Client-Side). Seluruh pemrosesan konversi berkas dan algoritma AI berjalan di atas RAM browser Anda tanpa ada satu pun data berkas yang diunggah ke server luar. Cepat, aman, tanpa login/registrasi, dan sepenuhnya gratis.

---

## Mengapa SwitchFile? (Problem & Solution)

1. **Jaminan Privasi Total:** Konverter file konvensional mengirim berkas sensitif Anda ke server pihak ketiga. SwitchFile memproses semuanya di dalam sandboxed RAM browser Anda secara lokal menggunakan WebAssembly (WASM).
2. **Tanpa Batasan File & Antrean:** Tidak ada limitasi ukuran file harian, throttling kecepatan unduh, atau keharusan berlangganan.
3. **Offline-Safe:** Menggunakan model AI lokal yang di-cache langsung di dalam browser Anda menggunakan IndexedDB. Sekali dimuat, Anda bisa menggunakannya tanpa koneksi internet.

---

## Fitur Utama

- **Multi-Format Document & Image Converter:** Konversi bolak-balik antar format populer:
  - **Dokumen & Presentasi:** `PDF`, `DOCX`, `XLSX`, `PPTX`, `TXT`
  - **Gambar:** `PNG`, `JPG`, `WebP`, `HEIC`
- **Top Quick Actions Presets:** Konversi instan dengan 1-klik untuk alur kerja cepat:
  - `JPG to PDF` | `PNG to WebP` | `PPTX to PDF` | `PDF to PPTX` | `Compress Image`
- **Client-Side AI Tools (Beta):**
  - **AI Document Extractor (OCR):** Ekstraksi teks dari gambar struk, nota, atau dokumen scan secara instan tanpa API key server (menggunakan `tesseract.js`).
  - **AI Background Remover:** Hapus latar belakang gambar secara instan menghasilkan berkas PNG transparan (menggunakan model WASM `@imgly/background-removal`).
- **Responsive Mobile UX:** Dioptimalkan untuk perangkat mobile dengan Bottom Navigation Bar dan layout Responsive Card Stack untuk tabel riwayat berkas.
- **Local Memory Vault:** Kelola riwayat konversi lokal secara detail melalui IndexedDB, lengkap dengan penghapusan memori yang aman dan visualisasi penggunaan storage.

---

## Tech Stack & Processing Engines

- **Framework & UI:** Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons.
- **Client-Side PDF/Doc Engines:**
  - `pdf-lib` — Manipulasi & pembuatan dokumen PDF.
  - `pdfjs-dist` — Rendering halaman PDF & ekstraksi teks.
  - `jszip` — Dekompresi struktur berkas dokumen berbasis OpenXML (`.docx`, `.pptx`).
  - `pptxgenjs` — Pembuatan slide presentasi PPTX secara lokal.
- **Client-Side AI Engines:**
  - `tesseract.js` — Ekstraksi karakter OCR berbasis WebAssembly lokal.
  - `@imgly/background-removal` — Segmentasi gambar berbasis AI ONNX Runtime di browser.
- **Local Storage:**
  - `IndexedDB` — Penyimpanan persisten berkas hasil konversi.
  - `LocalStorage` — Preferensi kualitas kompresi & opsi unduhan otomatis.

---

## Instalasi & Panduan Pengembangan

### Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi 18.x atau yang lebih baru).

### Langkah-langkah
1. **Clone repositori proyek:**
   ```bash
   git clone https://github.com/username/switchfile.git
   cd switchfile
   ```

2. **Instal seluruh dependensi npm:**
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan lokal:**
   ```bash
   npm run dev
   ```

4. **Buka aplikasi di browser:**
   Akses `http://localhost:3000` di browser Anda.

---

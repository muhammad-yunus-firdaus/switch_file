# UI/UX Design System Specification: Fast Convert Platform

## 1. Visual Style & Theme Baseline
- **Design Style:** Clean Modern SaaS / Soft Card Dashboard.
- **Color Palette:**
  - **Background Page:** `#F3F4F6` (Neutral Light Grey / Off-White).
  - **Card Container Background:** `#FFFFFF` (Pure White dengan Subtle Shadow).
  - **Primary Accent:** `#2563EB` (Royal Blue / Electric Blue).
  - **Secondary Accent / AI Card:** Deep Gradient `linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)`.
  - **Text Primary:** `#1E293B` (Slate 800).
  - **Text Muted:** `#64748B` (Slate 500).
  - **Status Success:** `#16A34A` (Emerald Green).
  - **Border Line:** `#E2E8F0` (Slate 200).
- **Typography:** Inter / Plus Jakarta Sans (Clean Sans-Serif).

---

## 2. Layout Architecture & Component Grid

Dashboard menggunakan **3-Column Grid Layout**:

### Column 1: Sidebar Navigation (Left Panel - Width: 260px)
- **Top:** Brand Logo (`Fast Convert` with Refresh Icon).
- **Navigation Items:**
  - `Home` (Active State: Blue Light Background & Blue Text).
  - `All Files`
  - `Shared by you` (Optional / Hidden in Personal Mode).
  - `Settings`
- **Bottom Widget (Personal Profile):**
  - Minimalist Avatar & Profile Card.
  - Usage Meter (e.g., "Unlimited Local Processing").

### Column 2: Main Workspace (Center Panel - Flex Grow)
- **Top Bar (Category Selection & Quick Selector):**
  - **Filter Tabs:** `All`, `Documents (PDF/DOCX/XLS)`, `Images (PNG/JPG/WebP)`, `Compressor`.
  - **Smart Switcher Zone:**
    - Label Header: `Convert [ SOURCE_FORMAT ] to [ TARGET_FORMAT ]`
    - Interaktif Dropdown Selector: `From: [ Auto-Detect / Select ]` $\rightarrow$ `To: [ DOCX | PDF | XLS | WebP | PNG ]`.
- **Drag-and-Drop Zone:**
  - Dashed Border Container (`border-dashed border-2 border-blue-300`).
  - Centered Upload Icon with text: *"Click or drag your files here to convert"*.
- **Active Processing & Queue List:**
  - Card list menunjukkan status real-time per file:
    - Icon Format (Blue PDF/DOCX Badge).
    - File Name & Size.
    - Status Indicator: `Converting...` (Progress Bar) or `Converted` (Green Checkmark).
    - Action: Download Button (Individual & `Download All` ZIP).
- **Recommended Tools (Quick Action Grid):**
  - Interactive Cards: `JPG to PDF`, `DOC to XLS`, `Compress Image`, `PDF Splitter`.

### Column 3: Utility & History Panel (Right Panel - Width: 300px)
- **Top Card (AI / Featured Feature Banner):**
  - High-contrast Gradient Card dengan CTA Button (*"Try OCR / AI Extractor"*).
- **Recent History List:**
  - Vertical list menampilkan 5–10 file terakhir yang baru diproses secara lokal (tersimpan di `IndexedDB` browser).
  - Keterangan File Name, Size, & Action Menu (`⋮`).

---

## 3. Responsive & Interactive State Rules
- **Hover State:** Card hover mengangkat 2px dengan shadow lebih pekat (`shadow-md transition-all duration-200`).
- **Drag Hover State:** Saat file di-drag di atas Dropzone, warna latar Dropzone berubah menjadi `rgba(37, 99, 235, 0.05)` dengan border solid blue.
- **Dark Mode Compatibility (Persiapan TailWind):**
  - Target Background Dark: `#0B0F19`
  - Target Card Dark: `#121826`
  - Target Border Dark: `#1E293B`
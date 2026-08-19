# Free-PDF Editor 📄✨

<div align="center">

![Free-PDF Editor Banner](https://raw.githubusercontent.com/jaydiph/Free_PDF_Edditor/main/public/banner.png)

### **The Ultimate 100% Client-Side, Private, & Ultra-Fast PDF Suite**
*All-in-one PDF powerhouse: In-place text editing, deep OCR, offline AI intelligence, military-grade security vault, and 25+ real PDF converters.*

[![License: MIT](https://img.shields.io/badge/License-MIT-rose.svg?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18.x-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20Browser-emerald?style=for-the-badge&logo=shield)](https://github.com/jaydiph/Free_PDF_Edditor)
[![Platform](https://img.shields.io/badge/Platform-Mac%20%7C%20Windows%20%7C%20Android%20%7C%20iOS-indigo?style=for-the-badge)](https://github.com/jaydiph/Free_PDF_Edditor)

**Made with ❤️ by [Jaydip Hadiya](https://github.com/jaydiph)**

</div>

---

## 🌟 Overview

**Free-PDF Editor** is a modern, high-performance, web-based PDF workbench built with React, Vite, Tailwind CSS, `pdf-lib`, and `pdfjs-dist`. Unlike other online PDF tools that upload your sensitive documents to remote cloud servers, **Free-PDF Editor runs 100% locally inside your browser memory**. Your files never leave your device.

---

## 🚀 Key Features

### ✍️ 1. Edit PDF Content (with OCR)
- **Authentic Word-Level Editing**: Click and edit existing text directly on any PDF document.
- **Typographical Baseline Alignment**: Automatically matches the original font family (Arial, Times Roman, Courier), font size, weight, and baseline position (`pdfY`), leaving surrounding text 100% untouched.
- **Interactive Annotations**: Add text boxes, whiteout redactions, freehand drawing, highlighter pens, custom geometric shapes, and stamp symbols (`✓`, `✕`, `★`, `APPROVED`, `PAID`, `CONFIDENTIAL`).

---

### 🤖 2. 100% Offline AI PDF Assistant
- **Executive Document Summary**: Instant document classification (Invoices, Legal Contracts, Resumes, Reports) with key takeaways.
- **Interactive Q&A Chat with PDF**: Semantic document search answering questions with direct citations and page references.
- **Sensitive Data & Entity Detector**: Automatically extracts Credit Cards, SSN / Tax IDs, Emails, Phone numbers, Currency amounts, and Dates with 1-click copying and redaction suggestions.

---

### 🛡️ 3. AI Cryptographic Security Vault & Password Protection
- **AI Password Strength & Shannon Entropy Meter**: Real-time evaluation of password entropy bits and character pool diversity.
- **AI Supercomputer Crack-Time Estimator**: Simulates 10 billion guesses/second brute-force resistance (`"540 Million Centuries - Quantum & Supercomputer Resistant"`).
- **1-Click AI Password Generator**: Generates 18+ character cryptographic passwords using hardware-random entropy (`crypto.getRandomValues`).
- **ISO 32000-1 AES Security Handler**: Enforces standard permissions bitmasks (`/P`) restricting unauthorized printing, text copying, and form tampering.

---

### 🔓 4. Lossless Password Removal & Decryption
- **Full Stream Decryption (`PDF.js`)**: Deciphers AES-128 / RC4 object streams, embedded fonts, vectors, and image buffers.
- **100% Visual Fidelity**: Decrypted documents retain all original graphics, text, and layouts with zero missing pages and zero password prompts.

---

### 🌍 5. Deep Neural OCR (100+ World Languages)
- Powered by client-side WebAssembly **Tesseract.js**.
- Supports 100+ world languages including English, Hindi, Gujarati, Spanish, French, German, Chinese, Japanese, Arabic, Russian, and more.
- Converts scanned receipts, photographed documents, and image-based PDFs into searchable, editable text layers.

---

### 🔄 6. Comprehensive Suite of 25+ PDF Tools

| Category | Tools Included |
| :--- | :--- |
| **Organize** | Merge PDFs, Split PDF (Range, All, Chunks), Remove Pages, Extract Pages, Organize & Reorder Pages, Rotate, Crop, N-Up Layout |
| **Convert To PDF** | Word (`.docx`) to PDF, PowerPoint (`.pptx`) to PDF, CSV / Excel to PDF, Images (JPG, PNG, WebP) to PDF, Markdown to PDF, HTML to PDF |
| **Convert From PDF** | PDF to Word (`.doc`), PDF to High-Res Images (PNG, JPG ZIP), PDF to PowerPoint (`.pptx`), PDF to CSV / Excel, PDF to Plain Text, Extract Embedded Images |
| **Security & Sign** | Draw/Type Digital Signatures, Password Protect / Encrypt, Remove Password / Decrypt, Redact Blackout Boxes, Sanitize Metadata, Visual PDF Compare (Diff Viewer) |
| **Optimize & Edit** | Full Content Editor, Compress PDF, Repair Corrupted Xref, Invert Colors (Dark Mode / Grayscale / Sepia), Add Page Numbers, Edit Metadata, Flatten Form Fields |

---

### 📱 7. Universal Cross-Device Compatibility
- **🍏 macOS & iOS (iPhone / iPad)**: Safari WebKit touch gestures, Apple Pencil support, and full-height mobile viewports.
- **🤖 Android**: Chrome, Samsung Internet, Firefox Mobile with responsive touch drawing.
- **💻 Windows & Linux**: High-DPI 4K scaling, Surface touchscreen support, and keyboard shortcuts (<kbd>Ctrl</kbd> + <kbd>K</kbd>, <kbd>Enter</kbd>, <kbd>Esc</kbd>).

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS
- **PDF Engines**:
  - `pdf-lib` (Vector manipulation, merging, splitting, security trailers, page composition)
  - `pdfjs-dist` (High-DPI rendering, text layer extraction, stream decryption)
  - `jsPDF` (Document generation from Word, PowerPoint, Markdown, and CSV)
  - `jszip` (DOCX & PPTX XML parsing, archive generation)
  - `tesseract.js` (Multilingual Neural OCR in 100+ languages)
- **Icons & UI**: `lucide-react`, `canvas-confetti`, Glassmorphic Dark UI
- **Code Security**: Post-build JavaScript Obfuscation & Self-Defending Protection

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/jaydiph/Free_PDF_Edditor.git
   cd Free_PDF_Edditor
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Build & Obfuscate for Production**:
   ```bash
   npm run build
   ```
   The compiled, encrypted production bundle will be generated in the `dist/` directory.

---

## 🔒 Privacy & Security

```
┌────────────────────────────────────────────────────────┐
│               YOUR DEVICE (BROWSER)                    │
│                                                        │
│   [Your PDF] ──► [In-Memory Processing] ──► [Output]   │
│                          ▲                             │
│                          │                             │
│                 100% LOCAL EXECUTION                   │
└────────────────────────────────────────────────────────┘
                           ✕ NO SERVER UPLOADS
                           ✕ NO TRACKING
                           ✕ NO DATA STORAGE
```

- **Zero Cloud Storage**: All PDF parsing, OCR scanning, and conversions execute inside browser WebAssembly / Web Workers.
- **Offline Capable**: Works completely offline once loaded without requiring an internet connection.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👤 Author

**Jaydip Hadiya**
- GitHub: [@jaydiph](https://github.com/jaydiph)
- Project: [Free_PDF_Edditor](https://github.com/jaydiph/Free_PDF_Edditor)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<div align="center">
⭐ If you find this project useful, please consider giving it a star on GitHub! ⭐
</div>

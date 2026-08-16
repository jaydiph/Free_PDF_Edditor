export const CATEGORIES = [
  { id: 'all', name: 'All Tools', icon: 'LayoutGrid' },
  { id: 'organize', name: 'Organize PDF', icon: 'Layers' },
  { id: 'optimize', name: 'Optimize & OCR', icon: 'Sparkles' },
  { id: 'convert-to', name: 'Convert To PDF', icon: 'FileInput' },
  { id: 'convert-from', name: 'Convert From PDF', icon: 'FileOutput' },
  { id: 'edit', name: 'Edit & Annotate', icon: 'Edit3' },
  { id: 'security', name: 'Security & Sign', icon: 'ShieldCheck' },
];

export const TOOLS = [
  // --- ORGANIZE CATEGORY ---
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    description: 'Combine multiple PDF documents into one unified file in any custom sequence.',
    category: 'organize',
    icon: 'Merge',
    color: 'from-rose-500 to-red-600',
    accept: '.pdf',
    multiple: true,
    badge: 'Popular',
    type: 'standard',
    fields: [
      { id: 'mergeOrder', label: 'File Arrangement', type: 'info', text: 'Drag and reorder files above to set the merge sequence.' }
    ]
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    description: 'Split a PDF into multiple documents by visual page range, fixed count, or extract all single pages.',
    category: 'organize',
    icon: 'Split',
    color: 'from-sky-500 to-blue-600',
    accept: '.pdf',
    multiple: false,
    badge: 'Visual Preview',
    type: 'workbench',
    workbenchId: 'split'
  },
  {
    id: 'remove-pages',
    title: 'Remove Pages',
    description: 'Delete specific unwanted pages or ranges with interactive visual thumbnail selection.',
    category: 'organize',
    icon: 'Trash2',
    color: 'from-red-500 to-rose-700',
    accept: '.pdf',
    multiple: false,
    badge: 'Visual Preview',
    type: 'workbench',
    workbenchId: 'remove-pages'
  },
  {
    id: 'extract-pages',
    title: 'Extract Pages',
    description: 'Pull specific pages or chapters out of a PDF document into a fresh new PDF.',
    category: 'organize',
    icon: 'FileSpreadsheet',
    color: 'from-emerald-500 to-teal-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'pagesToExtract',
        label: 'Pages to Extract',
        type: 'text',
        placeholder: 'e.g. 1-4, 7, 10-12',
        required: true
      }
    ]
  },
  {
    id: 'organize-pdf',
    title: 'Visual Page Organizer',
    description: 'Interactive visual grid to drag-and-drop reorder, rotate individual pages, duplicate, or delete pages.',
    category: 'organize',
    icon: 'Grid',
    color: 'from-indigo-500 to-purple-600',
    accept: '.pdf',
    multiple: true,
    badge: 'Interactive',
    type: 'workbench',
    workbenchId: 'organize'
  },
  {
    id: 'scan-to-pdf',
    title: 'Scan to PDF',
    description: 'Capture documents from photos or scan images directly into a high-quality PDF.',
    category: 'organize',
    icon: 'Camera',
    color: 'from-teal-500 to-emerald-600',
    accept: 'image/*',
    multiple: true,
    badge: 'Scanner',
    type: 'standard',
    fields: [
      {
        id: 'pageSize',
        label: 'Output Page Size',
        type: 'select',
        defaultValue: 'A4',
        options: [
          { value: 'A4', label: 'A4 Document' },
          { value: 'Letter', label: 'US Letter' },
          { value: 'FitImage', label: 'Fit to Scan Size' }
        ]
      }
    ]
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    description: 'Rotate all pages or selective odd/even pages by 90, 180, or 270 degrees.',
    category: 'organize',
    icon: 'RotateCw',
    color: 'from-teal-500 to-emerald-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'angle',
        label: 'Rotation Angle',
        type: 'select',
        defaultValue: '90',
        options: [
          { value: '90', label: '90° Clockwise' },
          { value: '180', label: '180° Half Turn' },
          { value: '270', label: '270° (90° Counter-Clockwise)' }
        ]
      },
      {
        id: 'pageSelection',
        label: 'Apply To',
        type: 'select',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All Pages' },
          { value: 'odd', label: 'Odd Pages Only (1, 3, 5...)' },
          { value: 'even', label: 'Even Pages Only (2, 4, 6...)' },
          { value: 'custom', label: 'Custom Page Range' }
        ]
      },
      {
        id: 'customPages',
        label: 'Page Range (e.g. 1-3, 5)',
        type: 'text',
        placeholder: '1-3, 5',
        showIf: (values) => values.pageSelection === 'custom'
      }
    ]
  },
  {
    id: 'crop-pdf',
    title: 'Crop PDF',
    description: 'Trim page margins or resize document boundaries on top, bottom, left, and right.',
    category: 'organize',
    icon: 'Crop',
    color: 'from-amber-500 to-orange-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      { id: 'topMargin', label: 'Top Margin (pt)', type: 'number', defaultValue: 30, min: 0 },
      { id: 'bottomMargin', label: 'Bottom Margin (pt)', type: 'number', defaultValue: 30, min: 0 },
      { id: 'leftMargin', label: 'Left Margin (pt)', type: 'number', defaultValue: 30, min: 0 },
      { id: 'rightMargin', label: 'Right Margin (pt)', type: 'number', defaultValue: 30, min: 0 }
    ]
  },
  {
    id: 'n-up-pdf',
    title: 'Multi-Page Layout (N-Up)',
    description: 'Arrange multiple pages onto a single sheet (2-Up, 4-Up, 9-Up) for handouts and book printing.',
    category: 'organize',
    icon: 'Columns',
    color: 'from-violet-500 to-purple-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'pagesPerSheet',
        label: 'Pages Per Sheet',
        type: 'select',
        defaultValue: '2',
        options: [
          { value: '2', label: '2 Pages (1 x 2)' },
          { value: '4', label: '4 Pages (2 x 2)' },
          { value: '9', label: '9 Pages (3 x 3)' }
        ]
      },
      {
        id: 'drawBorders',
        label: 'Draw Page Borders',
        type: 'checkbox',
        defaultValue: true
      }
    ]
  },

  // --- OPTIMIZE & OCR ---
  {
    id: 'ai-assistant',
    title: 'AI PDF Assistant & Insights',
    description: 'Executive AI summary, chat & ask questions to your PDF, and extract sensitive entities 100% offline.',
    category: 'optimize',
    icon: 'Sparkles',
    color: 'from-rose-500 via-pink-500 to-purple-600',
    accept: '.pdf',
    multiple: false,
    badge: 'AI Powered',
    type: 'workbench',
    workbenchId: 'ai-assistant'
  },
  {
    id: 'compress-pdf',
    title: 'Compress / Optimize PDF',
    description: 'Reduce PDF file size by downscaling images, stripping unused objects, and compressing stream data.',
    category: 'optimize',
    icon: 'Minimize2',
    color: 'from-emerald-500 to-green-700',
    accept: '.pdf',
    multiple: false,
    badge: 'Popular',
    type: 'standard',
    fields: [
      {
        id: 'compressionLevel',
        label: 'Compression Intensity',
        type: 'select',
        defaultValue: 'medium',
        options: [
          { value: 'low', label: 'Low Compression (Maximum visual quality)' },
          { value: 'medium', label: 'Recommended (Balanced quality & size)' },
          { value: 'high', label: 'High Compression (Smaller size for web/email)' },
          { value: 'extreme', label: 'Extreme (Lowest size, aggressive compression)' }
        ]
      }
    ]
  },
  {
    id: 'repair-pdf',
    title: 'Repair PDF',
    description: 'Rebuild broken cross-reference tables and corrupt stream dictionaries to restore unreadable PDFs.',
    category: 'optimize',
    icon: 'Wrench',
    color: 'from-rose-500 to-pink-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      { id: 'info', label: 'Info', type: 'info', text: 'Repairs corrupted byte headers, fixes broken page tree indexes, and cleans invalid object references.' }
    ]
  },
  {
    id: 'ocr-pdf',
    title: 'OCR Text Recognition',
    description: 'Perform multilingual optical character recognition on scanned PDFs or images with 40+ languages (English, Hindi, Gujarati, Spanish, French, etc.).',
    category: 'optimize',
    icon: 'ScanText',
    color: 'from-violet-600 to-fuchsia-600',
    accept: '.pdf, image/*',
    multiple: false,
    badge: '40+ Languages',
    type: 'workbench',
    workbenchId: 'ocr'
  },
  {
    id: 'pdf-to-pdfa',
    title: 'PDF to PDF/A',
    description: 'Convert PDF into PDF/A ISO standard for long-term archiving and legal compliance.',
    category: 'optimize',
    icon: 'Award',
    color: 'from-blue-600 to-indigo-700',
    accept: '.pdf',
    multiple: false,
    badge: 'ISO Standard',
    type: 'standard',
    fields: [
      { id: 'info', label: 'Standard', type: 'info', text: 'Embeds PDF/A-1b metadata dictionary and compliance headers for legal document preservation.' }
    ]
  },

  // --- CONVERT TO PDF ---
  {
    id: 'img-to-pdf',
    title: 'JPG / Images to PDF',
    description: 'Convert JPG, PNG, WebP, GIF, or BMP images into a beautifully formatted single PDF.',
    category: 'convert-to',
    icon: 'Image',
    color: 'from-amber-500 to-orange-600',
    accept: 'image/png, image/jpeg, image/webp, image/gif, image/bmp',
    multiple: true,
    badge: 'Popular',
    type: 'standard',
    fields: [
      {
        id: 'pageSize',
        label: 'Page Size',
        type: 'select',
        defaultValue: 'A4',
        options: [
          { value: 'A4', label: 'A4 (210 x 297 mm)' },
          { value: 'Letter', label: 'US Letter (8.5 x 11 in)' },
          { value: 'FitImage', label: 'Fit exactly to Image dimensions' }
        ]
      },
      {
        id: 'orientation',
        label: 'Orientation',
        type: 'select',
        defaultValue: 'portrait',
        options: [
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' }
        ],
        showIf: (v) => v.pageSize !== 'FitImage'
      },
      {
        id: 'margin',
        label: 'Page Margin',
        type: 'select',
        defaultValue: '20',
        options: [
          { value: '0', label: 'No Margin (Edge-to-Edge)' },
          { value: '20', label: 'Standard Margin (20pt)' },
          { value: '40', label: 'Large Margin (40pt)' }
        ],
        showIf: (v) => v.pageSize !== 'FitImage'
      }
    ]
  },
  {
    id: 'word-to-pdf',
    title: 'Word to PDF',
    description: 'Convert Microsoft Word documents (.docx, .doc) or text files directly to PDF.',
    category: 'convert-to',
    icon: 'FileText',
    color: 'from-blue-600 to-indigo-700',
    accept: '.doc, .docx, .txt',
    multiple: false,
    badge: 'DOCX / DOC',
    type: 'standard',
    fields: []
  },
  {
    id: 'ppt-to-pdf',
    title: 'PowerPoint to PDF',
    description: 'Convert presentation slides (.pptx, .ppt) or presentation outlines into PDF format.',
    category: 'convert-to',
    icon: 'Presentation',
    color: 'from-orange-600 to-red-600',
    accept: '.ppt, .pptx, .txt',
    multiple: false,
    badge: 'PPTX',
    type: 'standard',
    fields: []
  },
  {
    id: 'csv-to-pdf',
    title: 'Excel / CSV to PDF',
    description: 'Transform CSV spreadsheets or JSON arrays into clean, formatted tabular PDF reports.',
    category: 'convert-to',
    icon: 'Table',
    color: 'from-emerald-500 to-teal-600',
    accept: '.csv, .json, .xlsx',
    multiple: false,
    badge: 'XLSX / CSV',
    type: 'standard',
    fields: [
      {
        id: 'tableTitle',
        label: 'Report Title',
        type: 'text',
        placeholder: 'Data Summary Report'
      },
      {
        id: 'orientation',
        label: 'Page Orientation',
        type: 'select',
        defaultValue: 'landscape',
        options: [
          { value: 'landscape', label: 'Landscape (Recommended for tables)' },
          { value: 'portrait', label: 'Portrait' }
        ]
      }
    ]
  },
  {
    id: 'html-to-pdf',
    title: 'HTML to PDF',
    description: 'Render raw HTML documents or web templates directly into a styled PDF file.',
    category: 'convert-to',
    icon: 'Code2',
    color: 'from-amber-500 to-yellow-600',
    accept: '.html, .htm',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'pageSize',
        label: 'Page Format',
        type: 'select',
        defaultValue: 'A4',
        options: [
          { value: 'A4', label: 'A4' },
          { value: 'Letter', label: 'Letter' }
        ]
      }
    ]
  },
  {
    id: 'markdown-to-pdf',
    title: 'Markdown to PDF',
    description: 'Convert Markdown documentation or raw text into a styled PDF with clean typography.',
    category: 'convert-to',
    icon: 'FileCode',
    color: 'from-cyan-500 to-blue-600',
    accept: '.md, .txt, .markdown',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'theme',
        label: 'Document Style',
        type: 'select',
        defaultValue: 'modern',
        options: [
          { value: 'modern', label: 'Modern Clean (Inter Font)' },
          { value: 'classic', label: 'Classic Editorial (Serif)' },
          { value: 'code', label: 'Developer Monospace' }
        ]
      },
      {
        id: 'fontSize',
        label: 'Base Font Size',
        type: 'select',
        defaultValue: '12',
        options: [
          { value: '10', label: 'Compact (10pt)' },
          { value: '12', label: 'Standard (12pt)' },
          { value: '14', label: 'Large (14pt)' }
        ]
      }
    ]
  },
  {
    id: 'url-to-pdf',
    title: 'Webpage URL to PDF',
    description: 'Capture online articles or webpage URLs and render them into offline PDF documents.',
    category: 'convert-to',
    icon: 'Globe',
    color: 'from-blue-500 to-indigo-600',
    accept: null,
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'webUrl',
        label: 'Webpage URL',
        type: 'text',
        placeholder: 'https://en.wikipedia.org/wiki/Portable_Document_Format',
        required: true
      }
    ]
  },

  // --- CONVERT FROM PDF ---
  {
    id: 'pdf-to-img',
    title: 'PDF to JPG / PNG',
    description: 'Convert PDF pages into high-resolution PNG, JPG, or WebP images (download single or ZIP).',
    category: 'convert-from',
    icon: 'Images',
    color: 'from-amber-500 to-yellow-600',
    accept: '.pdf',
    multiple: false,
    badge: 'Popular',
    type: 'standard',
    fields: [
      {
        id: 'imgFormat',
        label: 'Image Format',
        type: 'select',
        defaultValue: 'image/png',
        options: [
          { value: 'image/png', label: 'PNG (Lossless & Sharp)' },
          { value: 'image/jpeg', label: 'JPG / JPEG (Standard)' },
          { value: 'image/webp', label: 'WebP (Modern Compact)' }
        ]
      },
      {
        id: 'dpi',
        label: 'Resolution / Quality',
        type: 'select',
        defaultValue: '2',
        options: [
          { value: '1', label: 'Standard (72 DPI - Web)' },
          { value: '2', label: 'High (150 DPI - Standard Print)' },
          { value: '3', label: 'Ultra High (300 DPI - Sharp HD)' }
        ]
      },
      {
        id: 'pageRange',
        label: 'Pages (Leave blank for all)',
        type: 'text',
        placeholder: 'e.g. 1-3, 5'
      }
    ]
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word (.doc)',
    description: 'Convert PDF documents into editable Microsoft Word (.doc) format with preserved text formatting.',
    category: 'convert-from',
    icon: 'FileText',
    color: 'from-blue-600 to-indigo-700',
    accept: '.pdf',
    multiple: false,
    badge: 'DOCX / DOC',
    type: 'standard',
    fields: []
  },
  {
    id: 'pdf-to-ppt',
    title: 'PDF to PowerPoint (.pptx)',
    description: 'Turn your PDF pages into Microsoft PowerPoint presentation slides for easy editing and pitching.',
    category: 'convert-from',
    icon: 'Presentation',
    color: 'from-orange-500 to-red-600',
    accept: '.pdf',
    multiple: false,
    badge: 'PPTX Slides',
    type: 'standard',
    fields: []
  },
  {
    id: 'pdf-to-csv',
    title: 'PDF to Excel / CSV',
    description: 'Detect data tables inside PDF pages and extract them into downloadable CSV/Excel spreadsheet format.',
    category: 'convert-from',
    icon: 'Sheet',
    color: 'from-emerald-500 to-green-600',
    accept: '.pdf',
    multiple: false,
    badge: 'XLSX / CSV',
    type: 'standard',
    fields: [
      {
        id: 'delimiter',
        label: 'CSV Delimiter',
        type: 'select',
        defaultValue: ',',
        options: [
          { value: ',', label: 'Comma (,)' },
          { value: ';', label: 'Semicolon (;)' },
          { value: '\t', label: 'Tab (\\t)' }
        ]
      }
    ]
  },
  {
    id: 'pdf-to-text',
    title: 'PDF to Text / Markdown',
    description: 'Extract all textual content, structure, and paragraph flows from PDF to plain text or Markdown.',
    category: 'convert-from',
    icon: 'FileText',
    color: 'from-emerald-500 to-green-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'outputFormat',
        label: 'Extraction Format',
        type: 'select',
        defaultValue: 'txt',
        options: [
          { value: 'txt', label: 'Plain Text (.txt)' },
          { value: 'md', label: 'Structured Markdown (.md)' }
        ]
      }
    ]
  },
  {
    id: 'extract-images',
    title: 'Extract Images from PDF',
    description: 'Extract and isolate all raster images, charts, and diagrams embedded inside the PDF.',
    category: 'convert-from',
    icon: 'ImageDown',
    color: 'from-amber-500 to-orange-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'minSize',
        label: 'Minimum Image Size',
        type: 'select',
        defaultValue: '50',
        options: [
          { value: '0', label: 'Extract All (Including small icons)' },
          { value: '50', label: 'Exclude Tiny Icons (< 50px)' },
          { value: '200', label: 'Medium & Large Photos Only' }
        ]
      }
    ]
  },
  {
    id: 'pdf-to-html',
    title: 'PDF to HTML',
    description: 'Convert PDF content into readable HTML markup for embedding on websites.',
    category: 'convert-from',
    icon: 'Code',
    color: 'from-indigo-500 to-blue-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: []
  },

  // --- EDIT & ANNOTATE ---
  {
    id: 'edit-pdf-content',
    title: 'Edit PDF Content (with OCR)',
    description: 'Edit existing text directly on PDF pages, add new text, insert images, shapes, freehand draw, highlight, and whiteout mistakes.',
    category: 'edit',
    icon: 'Sparkles',
    color: 'from-brand-500 via-rose-500 to-purple-600',
    accept: '.pdf',
    multiple: false,
    badge: 'OCR In-Place Editor',
    type: 'workbench',
    workbenchId: 'full-editor'
  },
  {
    id: 'annotate-pdf',
    title: 'Visual PDF Editor & Annotator',
    description: 'Comprehensive canvas editor to draw freehand, add text boxes, highlight content, and add shapes.',
    category: 'edit',
    icon: 'Highlighter',
    color: 'from-blue-600 to-purple-600',
    accept: '.pdf',
    multiple: false,
    badge: 'Pro Editor',
    type: 'workbench',
    workbenchId: 'full-editor'
  },
  {
    id: 'page-numbers',
    title: 'Add Page Numbers',
    description: 'Insert header/footer page numbering in formats like "Page 1 of 10" with custom positions.',
    category: 'edit',
    icon: 'Hash',
    color: 'from-indigo-500 to-cyan-500',
    accept: '.pdf',
    multiple: false,
    badge: 'Popular',
    type: 'standard',
    fields: [
      {
        id: 'position',
        label: 'Numbering Position',
        type: 'select',
        defaultValue: 'bottom-center',
        options: [
          { value: 'bottom-center', label: 'Bottom Center' },
          { value: 'bottom-right', label: 'Bottom Right' },
          { value: 'bottom-left', label: 'Bottom Left' },
          { value: 'top-center', label: 'Top Center' },
          { value: 'top-right', label: 'Top Right' },
          { value: 'top-left', label: 'Top Left' }
        ]
      },
      {
        id: 'format',
        label: 'Format Template',
        type: 'select',
        defaultValue: 'Page {n} of {total}',
        options: [
          { value: 'Page {n} of {total}', label: 'Page {n} of {total}' },
          { value: '{n} / {total}', label: '{n} / {total}' },
          { value: '{n}', label: 'Simple number: {n}' },
          { value: '- {n} -', label: '- {n} -' }
        ]
      },
      {
        id: 'startPage',
        label: 'Start Numbering From Page',
        type: 'number',
        defaultValue: 1,
        min: 1
      },
      {
        id: 'fontSize',
        label: 'Font Size',
        type: 'number',
        defaultValue: 10,
        min: 6,
        max: 30
      }
    ]
  },
  {
    id: 'watermark-pdf',
    title: 'Watermark PDF',
    description: 'Overlay custom text stamps (CONFIDENTIAL, DRAFT) or company logos with custom opacity & angle.',
    category: 'edit',
    icon: 'Stamp',
    color: 'from-blue-500 to-teal-500',
    accept: '.pdf',
    multiple: false,
    badge: 'Live Preview',
    type: 'workbench',
    workbenchId: 'watermark'
  },
  {
    id: 'flatten-pdf',
    title: 'Flatten PDF',
    description: 'Flatten all interactive form fields, checkboxes, and annotations permanently into the page canvas.',
    category: 'edit',
    icon: 'FileSpreadsheet',
    color: 'from-cyan-600 to-teal-700',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      { id: 'info', label: 'Notice', type: 'info', text: 'This will lock all interactive forms and signature fields so they cannot be altered.' }
    ]
  },
  {
    id: 'invert-colors',
    title: 'Invert Colors / Dark Mode',
    description: 'Invert page colors to enable comfortable night reading or high-contrast viewing.',
    category: 'edit',
    icon: 'Moon',
    color: 'from-slate-700 to-indigo-900',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'mode',
        label: 'Color Filter',
        type: 'select',
        defaultValue: 'invert',
        options: [
          { value: 'invert', label: 'Inverted Dark Mode' },
          { value: 'grayscale', label: 'Grayscale (Black & White)' },
          { value: 'sepia', label: 'Warm Sepia Reader' }
        ]
      }
    ]
  },

  // --- SECURITY & SIGN ---
  {
    id: 'sign-pdf',
    title: 'Digital & Drawn Signatures',
    description: 'Draw your signature, type script calligraphy, or upload stamp image and place on any page.',
    category: 'security',
    icon: 'PenTool',
    color: 'from-purple-500 to-indigo-600',
    accept: '.pdf',
    multiple: false,
    badge: 'Interactive',
    type: 'workbench',
    workbenchId: 'sign'
  },
  {
    id: 'protect-pdf',
    title: 'Password Protect / Encrypt',
    description: 'Encrypt your PDF with unbreakable access passwords and restrict copying, printing, or editing.',
    category: 'security',
    icon: 'Lock',
    color: 'from-rose-500 to-red-700',
    accept: '.pdf',
    multiple: false,
    badge: 'AI Vault',
    type: 'workbench',
    workbenchId: 'protect'
  },
  {
    id: 'unlock-pdf',
    title: 'Remove Password / Decrypt',
    description: 'Remove password protection and permission locks from an encrypted PDF document.',
    category: 'security',
    icon: 'Unlock',
    color: 'from-emerald-500 to-green-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      {
        id: 'password',
        label: 'Current PDF Password',
        type: 'password',
        placeholder: 'Enter document password to unlock',
        required: true
      }
    ]
  },
  {
    id: 'redact-pdf',
    title: 'Redact PDF',
    description: 'Permanently blackout sensitive information, credit cards, or names by drawing redaction boxes.',
    category: 'security',
    icon: 'EyeOff',
    color: 'from-zinc-600 to-slate-800',
    accept: '.pdf',
    multiple: false,
    badge: 'Interactive',
    type: 'workbench',
    workbenchId: 'redact'
  },
  {
    id: 'sanitize-pdf',
    title: 'Sanitize PDF',
    description: 'Completely purge hidden metadata, author information, JavaScript scripts, comments, and attachments.',
    category: 'security',
    icon: 'Eraser',
    color: 'from-sky-500 to-blue-600',
    accept: '.pdf',
    multiple: false,
    badge: 'Privacy',
    type: 'standard',
    fields: [
      { id: 'stripMetadata', label: 'Strip All Author & Software Metadata', type: 'checkbox', defaultValue: true },
      { id: 'stripAnnotations', label: 'Remove Sticky Notes & Comments', type: 'checkbox', defaultValue: true },
      { id: 'stripScripts', label: 'Remove JavaScript & Interactive Actions', type: 'checkbox', defaultValue: true },
      { id: 'stripAttachments', label: 'Remove Embedded File Attachments', type: 'checkbox', defaultValue: true }
    ]
  },
  {
    id: 'compare-pdf',
    title: 'Compare PDFs (Diff Viewer)',
    description: 'Compare two versions of a PDF side-by-side or with visual difference pixel overlay.',
    category: 'security',
    icon: 'GitCompare',
    color: 'from-indigo-500 to-pink-500',
    accept: '.pdf',
    multiple: true,
    badge: 'Diff Viewer',
    type: 'workbench',
    workbenchId: 'compare'
  },
  {
    id: 'edit-metadata',
    title: 'Edit PDF Metadata',
    description: 'Inspect and modify Title, Author, Subject, Keywords, Creator, and Producer properties.',
    category: 'security',
    icon: 'Tags',
    color: 'from-amber-500 to-orange-600',
    accept: '.pdf',
    multiple: false,
    type: 'standard',
    fields: [
      { id: 'title', label: 'Title', type: 'text', placeholder: 'Document Title' },
      { id: 'author', label: 'Author', type: 'text', placeholder: 'Author Name' },
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Topic / Subject' },
      { id: 'keywords', label: 'Keywords (Comma separated)', type: 'text', placeholder: 'report, pdf, 2026' },
      { id: 'creator', label: 'Creator Tool', type: 'text', placeholder: 'Free-PDF Editor' }
    ]
  }
];

export type OptionField = {
  key: string;
  label: string;
  type?: "select" | "number" | "textarea" | "text" | "checkbox" | "date";
  values?: string[];
  default?: string | number | boolean;
  hint?: string;
  min?: number;
  max?: number;
};
export const featureFields: Record<string, OptionField[]> = {
  "image-generator": [
    {
      key: "style",
      label: "Gaya visual",
      values: [
        "Photorealistic",
        "Cinematic",
        "Illustration",
        "Anime",
        "Product Photography",
        "Poster",
        "Minimalist",
      ],
    },
    {
      key: "ratio",
      label: "Rasio gambar",
      values: ["1:1", "3:2", "2:3"],
      hint: "Model gambar ini mendukung 1024×1024, 1536×1024, dan 1024×1536.",
    },
  ],
  "video-generator": [
    { key: "ratio", label: "Rasio video", values: ["16:9", "9:16"] },
    { key: "duration", label: "Durasi (detik)", values: ["4", "8", "12"] },
    {
      key: "resolution",
      label: "Resolusi",
      values: ["720p"],
      hint: "Pilihan ditampilkan sesuai adapter Sora 2.",
    },
  ],
  "presentation-studio": [
    {
      key: "audience",
      label: "Audiens",
      type: "text",
      default: "Mahasiswa dan profesional",
    },
    {
      key: "count",
      label: "Jumlah slide",
      type: "number",
      default: 8,
      min: 3,
      max: 30,
    },
    {
      key: "duration",
      label: "Durasi (menit)",
      type: "number",
      default: 10,
      min: 1,
      max: 120,
    },
    {
      key: "theme",
      label: "Tema",
      values: ["Professional blue", "Minimal light", "Editorial dark"],
    },
    {
      key: "language",
      label: "Bahasa",
      values: ["Bahasa Indonesia", "English"],
    },
  ],
  "book-creator": [
    {
      key: "genre",
      label: "Genre",
      values: ["Nonfiksi", "Pendidikan", "Panduan praktis", "Fiksi"],
    },
    { key: "audience", label: "Target pembaca", type: "text" },
    {
      key: "chapters",
      label: "Jumlah bab",
      type: "number",
      default: 6,
      min: 1,
      max: 20,
    },
    {
      key: "style",
      label: "Gaya penulisan",
      values: ["Informatif", "Naratif", "Akademik", "Percakapan"],
    },
    {
      key: "language",
      label: "Bahasa",
      values: ["Bahasa Indonesia", "English"],
    },
  ],
  "deep-search": [
    { key: "from", label: "Dari tanggal", type: "date" },
    { key: "to", label: "Sampai tanggal", type: "date" },
    {
      key: "focus",
      label: "Fokus sumber",
      values: ["Semua sumber publik", "Berita"],
    },
  ],
  "notes-summarizer": [
    {
      key: "depth",
      label: "Kedalaman ringkasan",
      values: ["Balanced", "Short", "Detailed", "Academic"],
    },
  ],
  paraphrase: [
    {
      key: "tone",
      label: "Nada tulisan",
      values: [
        "Formal Academic",
        "Professional",
        "Neutral",
        "Simplified",
        "Concise",
      ],
    },
  ],
  "study-exam": [
    {
      key: "count",
      label: "Jumlah soal",
      values: ["5", "10", "20", "30", "40", "50"],
      default: "10",
    },
    {
      key: "difficulty",
      label: "Kesulitan",
      values: ["Mixed", "Easy", "Medium", "Hard"],
    },
    {
      key: "mode",
      label: "Mode",
      values: ["exam", "practice"],
      hint: "Mode Exam menyembunyikan kunci sampai submit.",
    },
    {
      key: "timer",
      label: "Timer (menit; 0 = tanpa batas)",
      type: "number",
      default: 0,
      min: 0,
      max: 180,
    },
    {
      key: "shuffleQuestions",
      label: "Acak urutan soal",
      type: "checkbox",
      default: true,
    },
    {
      key: "shuffleAnswers",
      label: "Acak posisi jawaban",
      type: "checkbox",
      default: true,
    },
  ],
  "academic-document": [
    {
      key: "type",
      label: "Jenis dokumen",
      values: [
        "Makalah",
        "Laporan praktikum",
        "Proposal penelitian",
        "Artikel ilmiah",
        "Laporan proyek",
        "Draft skripsi",
        "Literature review",
        "Laporan tugas akhir",
      ],
    },
    { key: "institution", label: "Institusi", type: "text" },
    {
      key: "pages",
      label: "Target halaman",
      type: "number",
      default: 10,
      min: 1,
      max: 100,
    },
    {
      key: "citation",
      label: "Gaya sitasi",
      values: ["APA 7th", "IEEE", "Harvard", "Vancouver"],
    },
    {
      key: "language",
      label: "Bahasa",
      values: ["Bahasa Indonesia", "English"],
    },
  ],
  "defense-simulator": [
    {
      key: "mode",
      label: "Mode simulasi",
      values: [
        "Classroom Presentation",
        "Proposal Defense",
        "Thesis Defense",
        "Research Seminar",
        "Interview-style Q&A",
      ],
    },
    {
      key: "answer",
      label: "Jawabanmu (isi setelah menerima pertanyaan)",
      type: "textarea",
      hint: "Umpan balik dan contoh struktur jawaban baru diberikan setelah kamu menjawab.",
    },
  ],
  "career-matcher": [
    {
      key: "location",
      label: "Filter lokasi lowongan",
      type: "text",
      hint: "Sumber Arbeitnow berfokus pada pasar Eropa. Kosongkan untuk semua lokasi.",
    },
    {
      key: "remote",
      label: "Hanya lowongan remote",
      type: "checkbox",
      default: false,
    },
  ],
  "journal-matrix": [
    {
      key: "focus",
      label: "Fokus perbandingan",
      type: "text",
      default: "Metode, sampel, temuan, keterbatasan, dan research gap",
    },
  ],
  "methodology-checker": [
    { key: "field", label: "Bidang penelitian", type: "text" },
    {
      key: "approach",
      label: "Pendekatan",
      values: [
        "Kuantitatif",
        "Kualitatif",
        "Mixed methods",
        "Tinjauan literatur",
      ],
    },
  ],
  "rubric-checker": [
    {
      key: "rubric",
      label: "Rubrik penilaian",
      type: "textarea",
      hint: "Tempel kriteria dan bobot. Bobot dinormalisasi menjadi 100%.",
    },
  ],
  "originality-checker": [
    {
      key: "focus",
      label: "Fokus tinjauan",
      values: [
        "Sitasi & atribusi",
        "Pengulangan frasa",
        "Kejelasan akademik",
        "Semua aspek",
      ],
    },
  ],
};

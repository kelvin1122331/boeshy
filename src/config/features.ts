export type FeatureId =
  | "chat"
  | "image-generator"
  | "video-generator"
  | "presentation-studio"
  | "deep-search"
  | "book-creator"
  | "academic-research"
  | "notes-summarizer"
  | "paraphrase"
  | "study-exam"
  | "academic-document"
  | "task-manager"
  | "defense-simulator"
  | "career-matcher"
  | "journal-matrix"
  | "methodology-checker"
  | "rubric-checker"
  | "originality-checker";
export type Feature = {
  id: FeatureId;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  hint: string;
  capability: "text" | "image" | "video" | "search" | "academic" | "local";
};
export const categories = [
  "AI Creation",
  "Research & Academic",
  "Learning & Writing",
  "Productivity & Career",
];
export const features: Feature[] = [
  {
    id: "chat",
    name: "AI Chat",
    description: "Ruang untuk pertanyaan besar dan ide berikutnya.",
    category: categories[0],
    icon: "MessageSquare",
    color: "blue",
    hint: "Apa yang ingin kamu pahami hari ini?",
    capability: "text",
  },
  {
    id: "image-generator",
    name: "Image Generator",
    description: "Ubah imajinasi menjadi visual yang berarti.",
    category: categories[0],
    icon: "Image",
    color: "violet",
    hint: "Deskripsikan subjek, suasana, pencahayaan, dan detail visual…",
    capability: "image",
  },
  {
    id: "video-generator",
    name: "Video Generator",
    description: "Ceritakan idemu dalam gambar bergerak.",
    category: categories[0],
    icon: "Video",
    color: "rose",
    hint: "Deskripsikan adegan, gerakan kamera, dan suasana…",
    capability: "video",
  },
  {
    id: "presentation-studio",
    name: "Presentation Studio",
    description: "Dari ide awal ke presentasi yang meyakinkan.",
    category: categories[0],
    icon: "Presentation",
    color: "orange",
    hint: "Topik, tujuan, dan audiens presentasimu…",
    capability: "text",
  },
  {
    id: "book-creator",
    name: "Book Creator",
    description: "Bangun buku, satu bab yang bermakna setiap saat.",
    category: categories[0],
    icon: "BookOpen",
    color: "emerald",
    hint: "Judul, genre, target pembaca, dan tujuan buku…",
    capability: "text",
  },
  {
    id: "deep-search",
    name: "Deep Search",
    description: "Telusuri sumber. Hubungkan fakta. Temukan jawaban.",
    category: categories[1],
    icon: "Globe",
    color: "blue",
    hint: "Pertanyaan penelitian yang ingin kamu telusuri…",
    capability: "search",
  },
  {
    id: "academic-research",
    name: "Academic Research",
    description: "Temukan literatur dengan metadata sumber asli.",
    category: categories[1],
    icon: "GraduationCap",
    color: "emerald",
    hint: "Topik penelitian, kata kunci, atau DOI…",
    capability: "academic",
  },
  {
    id: "journal-matrix",
    name: "Journal Matrix",
    description: "Bandingkan metode, temuan, dan celah penelitian.",
    category: categories[1],
    icon: "Table2",
    color: "violet",
    hint: "Aspek perbandingan jurnal yang ingin ditelusuri…",
    capability: "text",
  },
  {
    id: "methodology-checker",
    name: "Methodology Checker",
    description: "Tinjau landasan dan konsistensi risetmu.",
    category: categories[1],
    icon: "FlaskConical",
    color: "orange",
    hint: "Tempel tujuan, rumusan masalah, dan metodologi penelitian…",
    capability: "text",
  },
  {
    id: "academic-document",
    name: "Academic Document",
    description: "Susun argumen dan dokumen dengan terstruktur.",
    category: categories[1],
    icon: "FileText",
    color: "blue",
    hint: "Judul, jenis dokumen, dan data penelitian yang tersedia…",
    capability: "text",
  },
  {
    id: "notes-summarizer",
    name: "Auto Note-Taker",
    description: "Temukan inti dari setiap halaman yang kamu baca.",
    category: categories[2],
    icon: "NotebookPen",
    color: "orange",
    hint: "Tempel materi atau unggah dokumen untuk dirangkum…",
    capability: "text",
  },
  {
    id: "paraphrase",
    name: "Paraphrase & Tone",
    description: "Sampaikan gagasanmu dengan lebih jernih.",
    category: categories[2],
    icon: "PenLine",
    color: "violet",
    hint: "Tempel tulisan yang ingin kamu perbaiki…",
    capability: "text",
  },
  {
    id: "study-exam",
    name: "Study with AI",
    description: "Belajar aktif, latihan terarah, pemahaman lebih dalam.",
    category: categories[2],
    icon: "Brain",
    color: "emerald",
    hint: "Tempel materi belajar atau unggah catatanmu…",
    capability: "text",
  },
  {
    id: "rubric-checker",
    name: "Rubric Assessment",
    description: "Pahami setiap kriteria sebelum mengumpulkan tugas.",
    category: categories[2],
    icon: "ClipboardCheck",
    color: "blue",
    hint: "Tempel tugas. Tambahkan rubrik di kolom khusus…",
    capability: "text",
  },
  {
    id: "originality-checker",
    name: "Originality Review",
    description: "Perkuat atribusi dan kualitas tulisan akademik.",
    category: categories[2],
    icon: "Fingerprint",
    color: "rose",
    hint: "Tempel tulisan beserta sitasi dan daftar pustaka…",
    capability: "text",
  },
  {
    id: "task-manager",
    name: "Task Manager",
    description: "Rencanakan yang penting. Selesaikan dengan fokus.",
    category: categories[3],
    icon: "CheckSquare",
    color: "blue",
    hint: "Tugas apa yang ingin kamu selesaikan?",
    capability: "local",
  },
  {
    id: "defense-simulator",
    name: "Defense Simulator",
    description: "Latih argumenmu sebelum presentasi sesungguhnya.",
    category: categories[3],
    icon: "Mic",
    color: "rose",
    hint: "Topik, ringkasan, dan metode penelitian untuk simulasi…",
    capability: "text",
  },
  {
    id: "career-matcher",
    name: "Career Matcher",
    description: "Hubungkan kemampuanmu dengan kesempatan nyata.",
    category: categories[3],
    icon: "BriefcaseBusiness",
    color: "emerald",
    hint: "Keahlian, pengalaman, pendidikan, lokasi, dan preferensi kerja…",
    capability: "text",
  },
];
export const findFeature = (id: string) => features.find((f) => f.id === id);
export function routeIntent(text: string): FeatureId {
  const rules: [RegExp, FeatureId][] = [
    [/jurnal|journal|doi|literatur|paper/i, "academic-research"],
    [/ujian|quiz|kuis|soal|belajar|exam/i, "study-exam"],
    [/gambar|image|foto|ilustrasi/i, "image-generator"],
    [/video|film/i, "video-generator"],
    [/slide|presentasi|presentation|ppt/i, "presentation-studio"],
    [/riset|research|carikan|telusuri|berita/i, "deep-search"],
    [/buku|book|novel/i, "book-creator"],
    [/ringkas|summary|catatan/i, "notes-summarizer"],
    [/parafrase|paraphrase|grammar/i, "paraphrase"],
    [/tugas|deadline|jadwal/i, "task-manager"],
    [/kerja|magang|karier|cv/i, "career-matcher"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? "chat";
}

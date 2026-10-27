export const adminSections = [
  {
    group: "",
    id: "overview",
    name: "Overview",
    icon: "LayoutDashboard",
    description: "Kondisi nyata workspace, pemakaian, dan kesiapan integrasi.",
  },
  {
    group: "AI MANAGEMENT",
    id: "ai-providers",
    name: "AI Providers",
    icon: "Network",
    description: "Satu tempat untuk mengatur penyedia dan koneksi AI.",
  },
  {
    group: "AI MANAGEMENT",
    id: "models",
    name: "Model Management",
    icon: "Boxes",
    description: "Daftarkan model yang tersedia dan kemampuan yang didukung.",
  },
  {
    group: "AI MANAGEMENT",
    id: "ai-routing",
    name: "AI Routing",
    icon: "Route",
    description: "Tentukan model utama, cadangan, dan kebijakan per fitur.",
  },
  {
    group: "AI MANAGEMENT",
    id: "api-credentials",
    name: "API Credentials",
    icon: "KeyRound",
    description:
      "Simpan, rotasi, dan cabut kredensial melalui backend terenkripsi.",
  },
  {
    group: "AI MANAGEMENT",
    id: "usage",
    name: "AI Usage & Limits",
    icon: "ChartNoAxesCombined",
    description:
      "Permintaan, token, biaya estimasi, dan batas yang benar-benar tercatat.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/search",
    name: "Search Engines",
    icon: "Search",
    description: "Atur Tavily, Brave, dan prioritas pencarian web.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/academic",
    name: "Academic APIs",
    icon: "GraduationCap",
    description:
      "Metadata akademik dari Crossref, OpenAlex, dan Semantic Scholar.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/image",
    name: "Image Generation",
    icon: "Image",
    description: "Model gambar, rasio, format keluaran, dan batas generasi.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/video",
    name: "Video Generation",
    icon: "Video",
    description: "Konfigurasi generasi video dan pekerjaan asynchronous.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/canva",
    name: "Canva Integration",
    icon: "Presentation",
    description: "Aplikasi OAuth Canva dan koneksi per pengguna.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/google",
    name: "Google Integrations",
    icon: "CalendarDays",
    description: "Persiapkan OAuth untuk Calendar, Drive, Docs, dan Slides.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/jobs",
    name: "Career / Jobs API",
    icon: "BriefcaseBusiness",
    description: "Sumber lowongan, negara yang didukung, dan batas pencarian.",
  },
  {
    group: "INTEGRATIONS",
    id: "integrations/social",
    name: "Social Media APIs",
    icon: "Share2",
    description:
      "Connector resmi dengan batas scope dan akses masing-masing platform.",
  },
  {
    group: "SYSTEM",
    id: "features",
    name: "Feature Management",
    icon: "ToggleLeft",
    description: "Aktifkan fitur, tinjau dependensi, dan pilih modelnya.",
  },
  {
    group: "SYSTEM",
    id: "database",
    name: "Database & Storage",
    icon: "Database",
    description:
      "Kesehatan database, migrasi, dan penyimpanan yang digunakan server.",
  },
  {
    group: "SYSTEM",
    id: "jobs",
    name: "Background Jobs",
    icon: "ListTodo",
    description:
      "Antrean nyata, status pekerjaan, dan kegagalan yang tercatat.",
  },
  {
    group: "SYSTEM",
    id: "health",
    name: "System Health",
    icon: "Activity",
    description:
      "Periksa layanan lokal. Provider eksternal hanya dites atas permintaan admin.",
  },
  {
    group: "SYSTEM",
    id: "errors",
    name: "Error Logs",
    icon: "CircleAlert",
    description: "Kegagalan yang aman ditampilkan, tanpa payload atau rahasia.",
  },
  {
    group: "USERS",
    id: "users",
    name: "User Management",
    icon: "Users",
    description: "Kelola akun, kuota, dan pencabutan sesi.",
  },
  {
    group: "USERS",
    id: "roles",
    name: "Roles & Permissions",
    icon: "ShieldCheck",
    description:
      "Izin dibatasi dan diperiksa kembali oleh server pada setiap permintaan.",
  },
  {
    group: "USERS",
    id: "activity",
    name: "Activity Logs",
    icon: "History",
    description: "Jejak perubahan konfigurasi dan tindakan administratif.",
  },
  {
    group: "SETTINGS",
    id: "settings",
    name: "General Settings",
    icon: "Settings2",
    description: "Pengaturan tersimpan untuk workspace dan operasional.",
  },
  {
    group: "SETTINGS",
    id: "security",
    name: "Security",
    icon: "LockKeyhole",
    description: "MFA opsional, sesi admin, enkripsi, dan perlindungan akses.",
  },
  {
    group: "SETTINGS",
    id: "notifications",
    name: "Notifications",
    icon: "Bell",
    description:
      "Ambang penggunaan dan notifikasi operasional di dalam aplikasi.",
  },
  {
    group: "SETTINGS",
    id: "deployment",
    name: "Deployment Status",
    icon: "Cloud",
    description: "Lingkungan, versi, dan konfigurasi infrastruktur server.",
  },
] as const;
export type AdminSection = (typeof adminSections)[number]["id"];

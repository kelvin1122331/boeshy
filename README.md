# HOLYAI

**One Intelligence. Endless Possibilities.**

Workspace AI berbahasa Indonesia untuk kreasi, riset akademik, pembelajaran, penulisan, produktivitas, dan karier. Dibangun di repository `kelvin1122331/boeshy`.

> Ini adalah implementasi awal yang dapat dijalankan, dengan 18 route fitur dan alur backend nyata. Aktivasi fitur generatif memerlukan kredensial provider. Jangan menyamakan keberhasilan build atau tes lokal dengan sertifikasi keamanan atau kesiapan operasional produksi. Lihat [status dan batasan](docs/FEATURE_STATUS.md) serta [hasil validasi](docs/VALIDATION.md).

## Mulai menjalankan

Prasyarat: Node.js 24 LTS, npm, PostgreSQL 17, Redis 7, dan bucket S3 privat. Docker Compose disediakan untuk layanan lokal.

```sh
git clone https://github.com/kelvin1122331/boeshy.git
cd boeshy
npm ci
cp .env.example .env
# Isi secret unik, konfigurasi database, storage, dan provider yang diperlukan.
docker compose up -d
npm run storage:init
npm run db:migrate
npm run dev
```

Di terminal lain:

```sh
npm run worker
```

Pada PowerShell gunakan `Copy-Item .env.example .env`. Generate secret dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Gunakan nilai berbeda untuk `BETTER_AUTH_SECRET` dan `TOKEN_ENCRYPTION_KEY`.

Daftar akun di `/register`. Secara default email harus diverifikasi; konfigurasi Resend dan domain pengirim terlebih dahulu. **Hanya untuk pengembangan lokal**, `REQUIRE_EMAIL_VERIFICATION=false` memungkinkan pengujian tanpa layanan email. Tidak ada akun atau hasil AI contoh yang disisipkan ke aplikasi.

Jika port 3000 terpakai, jalankan `npm run dev -- --port 3217` dan samakan `APP_URL`, `BETTER_AUTH_URL`, serta redirect OAuth dengan origin yang dipakai.

### Database lokal tanpa Docker (opsional)

`npm run db:local` menjalankan PostgreSQL native khusus pengembangan di `127.0.0.1:54328` dengan data di `.local/postgres-native`. URL pengembangan: `postgresql://postgres:local-qa-password@127.0.0.1:54328/postgres`. Atur `DATABASE_URL` lalu jalankan migrasi. Jangan menggunakan kredensial atau proses ini untuk produksi. Redis dan S3 tetap diperlukan untuk pekerjaan AI serta upload.

## Halaman publik

Beranda `/` memberikan pengantar ringkas. **Kemampuan** dan **Explore Features** menuju `/features`, dengan pencarian dan filter untuk 18 alat. **Cara kerja** menuju `/how-it-works`, sedangkan penjelasan pengelolaan data berada di `/privacy`. Semua halaman ini dapat dibaca tanpa login dan memiliki navigasi desktop serta menu mobile yang sama.

## Arsitektur

- **Frontend:** Next.js App Router, React, TypeScript strict, Tailwind CSS 4, komponen Button bergaya shadcn dengan Radix Slot, Radix Dialog, Lucide, React Hook Form + Zod, dan tema terang/gelap.
- **Backend:** route handler dengan autentikasi, pemeriksaan origin, validasi input, pembatasan ukuran, ownership query, service per domain, dan respons error publik.
- **Akun:** Better Auth + Prisma, email/password, hashing bawaan library, sesi HTTP-only, email verification/reset, optional Google OAuth, sesi perangkat, perubahan password, dan penghapusan akun.
- **Data:** PostgreSQL + Prisma dengan migrasi SQL, foreign keys, indeks ownership, dan UUID. Dokumen disimpan dalam `WorkspaceItem` dengan payload Zod sesuai domain dan versi immutable; percakapan, pesan, ujian, jawaban, tugas, file, jobs, aset, proyek, notifikasi, integrasi, dan penggunaan memiliki tabel tersendiri.
- **Worker:** BullMQ + Redis. Video memakai create/poll provider dan hanya diselesaikan setelah file diunduh dan disimpan. Tidak ada progress persentase buatan.
- **Penyimpanan:** S3-compatible bucket privat, nama objek acak, validasi ekstensi/MIME/signature, pemeriksaan ownership sebelum signed download 60 detik.
- **AI:** adapter Gemini, OpenAI dan Anthropic, prompt khusus domain, OpenAI JSON schema, validasi output Zod, pembatasan konteks/chunking, dan pencatatan penggunaan. Dokumen/sumber diperlakukan sebagai data tidak tepercaya.

Lihat [rencana dan milestone](docs/ARCHITECTURE.md) untuk keputusan desain.

## Integrasi yang perlu dikonfigurasi

| Integrasi | Konfigurasi / kebutuhan |
|---|---|
| Teks Gemini / OpenAI / Anthropic | API Credentials + Model Management + AI Routing di `/admin` |
| Gambar & video | Provider + model di admin, akses model, S3 dan Redis/worker |
| Riset web | Tavily / Brave di admin dan model teks |
| Jurnal | Crossref publik, tanpa API key |
| Lowongan | Arbeitnow publik + provider teks untuk pencocokan |
| Email akun | `RESEND_API_KEY`, `EMAIL_FROM`, domain pengirim terverifikasi |
| Google login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; callback `/api/auth/callback/google` |
| Canva | OAuth client di admin, redirect `/api/integrations/canva/callback`, dan `TOKEN_ENCRYPTION_KEY` 64 hex |
| File privat | `S3_ENDPOINT` opsional, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| Antrean | `REDIS_URL`, proses `npm run worker` yang berjalan terus |

Provider, kredensial terenkripsi, model, routing, dan seluruh fitur dikelola lewat **[Admin Control Center](docs/ADMIN_CONTROL_CENTER.md)** di `/admin`. Infrastruktur tetap memakai environment server. Kapabilitas adapter bukan jaminan akses model di akun provider. Pengguna biasa tidak dapat mengelola atau membaca secret; fitur yang dependensinya belum tersedia menampilkan Configuration Required.

## Perintah

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

E2E membutuhkan database yang sudah dimigrasi dan aplikasi yang sedang berjalan dengan `REQUIRE_EMAIL_VERIFICATION=false` pada lingkungan pengujian terisolasi:

```sh
npx playwright install chromium
npm run test:e2e
```

Set `APP_URL` dan `DATABASE_URL` untuk proses test juga. Suite membuat akun `@holyai.test`, memakai fixture ujian yang secara eksplisit merupakan data QA, dan menghapus akun tersebut setelah test. Jangan jalankan suite di database produksi. CI menjalankan PostgreSQL dan Redis sungguhan.

## Deploy

Lihat [panduan deployment](docs/DEPLOYMENT.md) untuk web process, worker, migrasi, TLS, email, storage, backup/restore, dan administrasi. Jalankan web dan worker sebagai proses terpisah. Tidak ada secret, `.env`, data pengguna, atau output test di Git.

## Referensi implementasi

- [Next.js App Router](https://nextjs.org/docs/app)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [OpenAI Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
- [Canva OAuth PKCE](https://www.canva.dev/docs/apps/rest-apis/authentication/)
- [Canva URL import jobs](https://www.canva.dev/docs/apps/rest-apis/reference/design-imports/create-url-import-job/)
- [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)

Font Noto Sans untuk ekspor PDF didistribusikan menurut lisensi SIL Open Font License di `public/fonts/LICENSE.txt`.

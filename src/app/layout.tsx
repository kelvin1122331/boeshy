import type { Metadata } from "next";
import { Providers } from "@/components/layout/providers";
import "./globals.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
export const metadata: Metadata = {
  title: {
    default: "HOLYAI — One Intelligence. Endless Possibilities.",
    template: "%s · HOLYAI",
  },
  description:
    "Workspace terpadu untuk belajar, berkarya, riset, dan produktivitas dengan AI.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Lewati ke konten
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

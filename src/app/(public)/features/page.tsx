import { Suspense } from "react";
import type { Metadata } from "next";
import {
  PublicPageIntro,
  PublicNextStep,
} from "@/components/marketing/public-shell";
import { FeatureCatalogue } from "@/components/marketing/feature-catalogue";
export const metadata: Metadata = {
  title: "Kemampuan",
  description:
    "Jelajahi 18 kemampuan HOLYAI untuk kreasi, riset, pembelajaran, dan produktivitas.",
};
export default function FeaturesPage() {
  return (
    <div className="marketing-page">
      <PublicPageIntro
        eyebrow="TEMUKAN KEMUNGKINANMU"
        title={
          <>
            Alat yang tepat.
            <br />
            <span>Untuk ide berikutnya.</span>
          </>
        }
        description="Kenali seluruh kemampuan HOLYAI. Pilih berdasarkan kebutuhanmu, lalu mulai di workspace yang sama."
      />
      <Suspense
        fallback={
          <div className="marketing-catalogue-loading" role="status">
            Memuat kemampuan…
          </div>
        }
      >
        <FeatureCatalogue />
      </Suspense>
      <PublicNextStep />
    </div>
  );
}

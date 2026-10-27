import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <Suspense>
      <AuthForm
        mode="register"
        emailConfigured={!!process.env.RESEND_API_KEY}
        googleConfigured={
          !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
        }
      />
    </Suspense>
  );
}

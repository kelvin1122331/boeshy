"use client";
import { adminSections, type AdminSection } from "@/config/admin";
import { ProvidersPage } from "./providers";
import { ModelsPage, FeaturesPage } from "./models-features";
import {
  OverviewPage,
  UsagePage,
  InfrastructurePage,
  JobsPage,
  UsersPage,
  RolesPage,
  LogsPage,
  SettingsForm,
  SecurityPage,
  DeploymentPage,
} from "./operations";
export function AdminWorkspace({
  section,
  role,
}: {
  section: AdminSection;
  role: string;
}) {
  const current = adminSections.find((s) => s.id === section)!;
  return (
    <>
      <header className="acc-page-heading">
        <div>
          <span className="acc-kicker">HOLYAI ADMIN</span>
          <h1>{current.name}</h1>
          <p>{current.description}</p>
        </div>
      </header>
      <div className="acc-page-body">
        {section === "overview" ? (
          <OverviewPage />
        ) : section === "ai-providers" ||
          section === "api-credentials" ||
          section.startsWith("integrations/") ? (
          <ProvidersPage section={section} role={role} />
        ) : section === "models" ? (
          <ModelsPage role={role} />
        ) : section === "features" || section === "ai-routing" ? (
          <FeaturesPage role={role} routing={section === "ai-routing"} />
        ) : section === "usage" ? (
          <UsagePage role={role} />
        ) : section === "database" || section === "health" ? (
          <InfrastructurePage kind={section} />
        ) : section === "jobs" ? (
          <JobsPage role={role} />
        ) : section === "users" ? (
          <UsersPage role={role} />
        ) : section === "roles" ? (
          <RolesPage />
        ) : section === "activity" || section === "errors" ? (
          <LogsPage errors={section === "errors"} />
        ) : section === "security" ? (
          <SecurityPage />
        ) : section === "deployment" ? (
          <DeploymentPage />
        ) : (
          <SettingsForm
            role={role}
            kind={section === "notifications" ? "notifications" : "general"}
          />
        )}
      </div>
    </>
  );
}

"use client";
import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/common";
import { connectionNames, type ProviderDefinition } from "@/config/providers";
export type ModelRow = {
  id: string;
  providerId: string;
  identifier: string;
  name: string;
  capabilities: string[];
  contextLimit: number | null;
  inputType: string;
  outputType: string;
  enabled: boolean;
  inputCostPerMillion: number | null;
  outputCostPerMillion: number | null;
  settings: {
    imageRatios?: string[];
    videoRatios?: string[];
    videoDurations?: number[];
    outputFormats?: string[];
  };
};
export type ProviderRow = {
  id: string;
  authMethod: string;
  endpoint: string;
  enabled: boolean;
  defaultModel: string | null;
  timeoutMs: number;
  retryAttempts: number;
  requestLimit: number;
  priority: number;
  settings: {
    maxResults?: number;
    contactEmail?: string;
    scopes?: string[];
    countries?: string[];
    defaultCountry?: string;
    visionModel?: string;
    concurrency?: number;
    maxDuration?: number;
  };
  revision: number;
  definition: ProviderDefinition;
  status: string;
  configured: boolean;
  canTest: boolean;
  credential: {
    masked: Record<string, string>;
    version: number;
    updatedAt: string;
  } | null;
  checkedAt: string | null;
  latencyMs: number | null;
  safeMessage: string | null;
  errorCode: string | null;
  redirectUri: string | null;
  models: ModelRow[];
};
export type FeatureRow = {
  id: string;
  name: string;
  category: string;
  icon: string;
  capability: string | null;
  status: string;
  dependencies: string[];
  model: { id: string; name: string; providerId: string } | null;
  config: {
    enabled: boolean;
    primaryModelId: string | null;
    secondaryModelId: string | null;
    fallbackEnabled: boolean;
    fallbackConsent: boolean;
    timeoutMs: number;
    retryAttempts: number;
    monthlyLimit: number;
    queueEnabled: boolean;
    lastError: string | null;
  };
};
export async function adminRequest<T = unknown>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const value = await response.json();
  if (!response.ok) {
    if (response.status === 428)
      window.dispatchEvent(new Event("admin-mfa-required"));
    throw new Error(
      value.error || "Permintaan admin belum dapat diselesaikan.",
    );
  }
  return value;
}
export function useAdminData<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setData(await adminRequest<T>(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    let active = true;
    adminRequest<T>(path)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch((error) => {
        if (active) setError((error as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return { data, error, loading, reload, setData };
}
export const dateText = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Belum diperiksa";
export const bytesText = (value: number) =>
  value >= 1073741824
    ? `${(value / 1073741824).toFixed(2)} GB`
    : value >= 1048576
      ? `${(value / 1048576).toFixed(1)} MB`
      : `${(value / 1024).toFixed(1)} KB`;
export function Status({ value }: { value: string }) {
  const names: Record<string, string> = {
    ...connectionNames,
    ready: "Ready",
    configuration_required: "Configuration Required",
    error: "Error",
    enabled: "Enabled",
    queued: "Queued",
    processing: "Processing",
    completed: "Completed",
    pending: "Pending",
    cancelled: "Cancelled",
    unknown: "Unknown",
    applied: "Applied",
    not_configured: "Not Configured",
  };
  return (
    <span className={`acc-status acc-status-${value}`}>
      <i />
      {names[value] || value}
    </span>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`acc-notice${error ? " acc-notice-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <Icon name={error ? "CircleAlert" : "Info"} size={18} />
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  title = "Belum ada data",
  description = "Aktivitas yang tercatat akan muncul di sini.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="acc-empty">
      <Icon name="Inbox" size={29} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="acc-loading" role="status">
      <Icon name="LoaderCircle" />
      Memuat data aktual…
    </div>
  );
}
export function Table({
  headings,
  children,
}: {
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="acc-table-wrap">
      <table className="acc-table">
        <thead>
          <tr>
            {headings.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Metric({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: string;
  detail?: string;
}) {
  return (
    <article className="acc-metric">
      <div>
        <span>{label}</span>
        <Icon name={icon} size={18} />
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

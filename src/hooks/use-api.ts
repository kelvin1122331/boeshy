"use client";
import { useCallback, useEffect, useState } from "react";
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    path.startsWith("/api") ? path : `/api/workspace/${path}`,
    {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || data.message || "Permintaan belum dapat diselesaikan.",
    );
  return data as T;
}
export function useAPI<T>(path: string | null, refreshMs = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!!path);
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const value = await api<T>(path);
      setData(value);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    if (!path) return;
    let active = true;
    api<T>(path)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    if (refreshMs) {
      const t = setInterval(() => void reload(), refreshMs);
      return () => {
        active = false;
        clearInterval(t);
      };
    }
    return () => {
      active = false;
    };
  }, [path, reload, refreshMs]);
  return { data, setData, error, loading, reload };
}
export type Capabilities = {
  canConfigureProviders?: boolean;
  featureStatus?: Record<
    string,
    { enabled: boolean; ready: boolean; status: string }
  >;
  text: boolean;
  image: boolean;
  video: boolean;
  search: boolean;
  academic: boolean;
  local: boolean;
  storage: boolean;
  queue: boolean;
  canva: boolean;
  canvaConnected: boolean;
  email: boolean;
  models: { id: string; name: string }[];
  imageRatios: string[];
  videoRatios: string[];
  videoDurations: number[];
};
export type Item = {
  id: string;
  title: string;
  kind: string;
  data: Record<string, unknown>;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: { id: string; data: Record<string, unknown>; createdAt: string }[];
};
export type GenerationJob = {
  id: string;
  kind: string;
  status: string;
  stage: string;
  error?: string;
  itemId?: string;
  result?: Record<string, unknown>;
  assets: { id: string; mime: string }[];
  createdAt: string;
};

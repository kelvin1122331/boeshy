"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
export function Icon({
  name,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const C =
    (Icons as unknown as Record<string, LucideIcon>)[name] || Icons.Sparkles;
  return <C size={20} strokeWidth={1.7} {...props} />;
}
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/dashboard" className="logo">
      <span className="logo-mark">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 3v18M19 3v18M5 12h14M12 5v14"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <path d="m8 8 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      {!small && (
        <span>
          HOLY<span className="logo-ai">AI</span>
        </span>
      )}
    </Link>
  );
}
export function Alert({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`alert ${error ? "alert-error" : ""}`}
    >
      <Icon name={error ? "CircleAlert" : "Info"} size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  icon = "FolderOpen",
  title,
  description,
  children,
}: {
  icon?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Spinner() {
  return <span className="spinner" aria-label="Memproses" />;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Modal({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content" aria-describedby={undefined}>
          <div className="flex-between">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Tutup">
                <Icon name="X" />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <Icon name={copied ? "Check" : "Copy"} size={15} />
      {copied ? "Disalin" : "Salin"}
    </Button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

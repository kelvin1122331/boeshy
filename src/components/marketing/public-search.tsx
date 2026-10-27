"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/common";
import { features } from "@/config/features";

const aliases: Record<string, string> = {
  "image-generator": "gambar foto ilustrasi",
  "video-generator": "video animasi",
  "presentation-studio": "presentasi slide powerpoint",
  "book-creator": "buku cerita novel",
  "deep-search": "pencarian riset internet",
  "notes-summarizer": "ringkasan rangkum catatan dokumen",
  "study-exam": "ujian latihan soal kuis belajar",
};

export function PublicSearch({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const results = features.filter((feature) =>
    `${feature.name} ${feature.description} ${aliases[feature.id] || ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setQuery("");
      }}
    >
      <Dialog.Trigger
        className="showcase-search-trigger"
        aria-label="Cari fitur HOLYAI"
      >
        <Icon name="Search" size={17} />
        <span>Cari apa pun di HOLYAI...</span>
        <kbd>Ctrl K</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="showcase-search-overlay" />
        <Dialog.Content
          className={`showcase-search-dialog${dark ? " is-dark" : ""}`}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
          }}
        >
          <div className="showcase-search-heading">
            <div>
              <Dialog.Title>Cari kemampuan HOLYAI</Dialog.Title>
              <Dialog.Description>
                Temukan alat yang sesuai dengan idemu.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="showcase-search-close"
              aria-label="Tutup pencarian"
            >
              <Icon name="X" />
            </Dialog.Close>
          </div>
          <div className="showcase-search-field">
            <Icon name="Search" size={19} />
            <input
              ref={input}
              aria-label="Cari fitur"
              placeholder="Coba gambar, presentasi, atau belajar..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="showcase-search-results">
            {results.map((feature) => (
              <Link
                href={`/${feature.id}`}
                key={feature.id}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className={`tool-icon ${feature.color}`}>
                  <Icon name={feature.icon} size={20} />
                </span>
                <div>
                  <strong>{feature.name}</strong>
                  <p>{feature.description}</p>
                </div>
                <Icon name="ArrowUpRight" size={16} />
              </Link>
            ))}
            {results.length === 0 && (
              <p className="showcase-search-empty" role="status">
                Belum ada fitur yang cocok. Coba kata kunci lain.
              </p>
            )}
          </div>
          <div className="showcase-search-footnote">
            {results.length} dari {features.length} fitur{" "}
            <span>Esc untuk menutup</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

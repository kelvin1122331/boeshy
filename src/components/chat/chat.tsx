"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { api, useAPI, type Capabilities } from "@/hooks/use-api";
import {
  Alert,
  Icon,
  CopyButton,
  Modal,
  Field,
  Spinner,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { FileUpload, type Upload } from "@/components/common/file-upload";
type Message = { id: string; role: string; content: string; status: string };
type Conversation = { id: string; title: string; messages: Message[] };
export function Chat({ conversationId }: { conversationId?: string }) {
  const router = useRouter(),
    params = useSearchParams();
  const [prompt, setPrompt] = useState(params.get("prompt") || ""),
    [messages, setMessages] = useState<Message[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [provider, setProvider] = useState(""),
    [web, setWeb] = useState(false),
    [filter, setFilter] = useState(""),
    [files, setFiles] = useState<Upload[]>([]),
    [localId, setLocalId] = useState(conversationId);
  const abort = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const { data: caps } = useAPI<Capabilities>("capabilities");
  const { data: history, reload } = useAPI<Conversation[]>("/api/chat");
  const [convo, setConvo] = useState<Conversation | null>(null);
  useEffect(() => {
    if (conversationId)
      api<Conversation>(`/api/chat?id=${conversationId}`)
        .then((c) => {
          if (c) {
            setConvo(c);
            setMessages(c.messages);
          }
        })
        .catch((e) => setError(e.message));
  }, [conversationId]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);
  async function send(regenerate = false) {
    if (busy || (!prompt.trim() && !regenerate)) return;
    const text = regenerate
      ? messages.filter((m) => m.role === "user").at(-1)?.content || prompt
      : prompt;
    setError("");
    setBusy(true);
    abort.current = new AbortController();
    const prior =
      regenerate && messages.at(-1)?.role === "assistant"
        ? messages.slice(0, -1)
        : messages;
    const next = regenerate
      ? prior
      : [
          ...prior,
          {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            status: "completed",
          },
        ];
    setMessages([
      ...next,
      { id: "stream", role: "assistant", content: "", status: "streaming" },
    ]);
    if (!regenerate) setPrompt("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          conversationId: localId,
          prompt: text,
          provider: provider || caps?.models[0]?.id,
          fileIds: files.map((f) => f.id),
          web,
          regenerate,
        }),
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      const reader = response.body!.getReader(),
        decoder = new TextDecoder();
      let buffer = "",
        answer = "",
        messageId = "stream";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";
        for (const frame of frames) {
          if (!frame.startsWith("data: ")) continue;
          const event = JSON.parse(frame.slice(6));
          if (event.type === "meta") {
            setLocalId(event.conversationId);
            messageId = event.messageId;
          }
          if (event.type === "delta") {
            answer += event.text;
            setMessages([
              ...next,
              {
                id: messageId,
                role: "assistant",
                content: answer,
                status: "streaming",
              },
            ]);
          }
          if (event.type === "error") throw new Error(event.error);
          if (event.type === "done")
            setMessages([
              ...next,
              {
                id: messageId,
                role: "assistant",
                content: answer,
                status: "completed",
              },
            ]);
        }
      }
      setFiles([]);
      await reload();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      setMessages((m) =>
        m.map((x) =>
          x.status === "streaming" ? { ...x, status: "failed" } : x,
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function edit(message: Message, content: string) {
    try {
      await api("/api/chat", {
        method: "PATCH",
        body: JSON.stringify({ id: localId, messageId: message.id, content }),
      });
      const index = messages.findIndex((m) => m.id === message.id);
      setMessages([...messages.slice(0, index), { ...message, content }]);
      setPrompt("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="chat-layout">
      <aside className="chat-history">
        <Button
          onClick={() => {
            setMessages([]);
            setLocalId(undefined);
            router.push("/chat");
          }}
        >
          <Icon name="Plus" size={16} />
          Percakapan baru
        </Button>
        <input
          placeholder="Cari percakapan…"
          aria-label="Cari percakapan"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="chat-history-list">
          {history
            ?.filter((c) =>
              c.title.toLowerCase().includes(filter.toLowerCase()),
            )
            .map((c) => (
              <div
                className={`conversation-row ${localId === c.id ? "selected" : ""}`}
                key={c.id}
              >
                <Link href={`/chat/${c.id}`}>{c.title}</Link>
                <RenameConversation conversation={c} reload={reload} />
                <button
                  aria-label={`Hapus ${c.title}`}
                  onClick={async () => {
                    await api(`/api/chat?id=${c.id}`, { method: "DELETE" });
                    if (c.id === localId) {
                      setLocalId(undefined);
                      setMessages([]);
                      router.push("/chat");
                    }
                    await reload();
                  }}
                >
                  <Icon name="Trash2" size={12} />
                </button>
              </div>
            ))}
        </div>
      </aside>
      <section className="chat-main">
        <header className="chat-title">
          <Icon name="Sparkles" size={18} />
          {convo?.title || "HOLYAI Chat"}
          <span className="badge">
            {caps?.models.length ? "AI workspace" : "Requires Configuration"}
          </span>
        </header>
        <div className="chat-messages">
          {!messages.length ? (
            <div className="chat-welcome">
              <span className="tool-icon blue">
                <Icon name="Sparkles" size={26} />
              </span>
              <h2>Apa yang ada di pikiranmu?</h2>
              <p>Ruang untuk bertanya, memahami, dan mengembangkan ide.</p>
              <div className="chat-starters">
                {[
                  "Jelaskan sebuah konsep dengan sederhana",
                  "Bantu susun rencana penelitian",
                  "Tinjau ide dan beri sudut pandang baru",
                  "Bantu pecahkan masalah kode",
                ].map((s) => (
                  <button key={s} onClick={() => setPrompt(s)}>
                    {s} <Icon name="ArrowUpRight" size={12} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <article className="chat-message" key={m.id}>
                <span className="avatar">
                  {m.role === "user" ? (
                    <Icon name="User" size={14} />
                  ) : (
                    <Icon name="Sparkles" size={14} />
                  )}
                </span>
                <div className="chat-message-body">
                  <div className="chat-message-label">
                    {m.role === "user" ? "Kamu" : "HOLYAI"}
                    {m.status === "failed" && " · respons belum selesai"}
                  </div>
                  <div className="prose">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    >
                      {m.content}
                    </ReactMarkdown>
                    {m.status === "streaming" && !m.content && <Spinner />}
                  </div>
                  <div className="message-actions">
                    <CopyButton text={m.content} />
                    {m.role === "user" && m.id !== "stream" && !busy && (
                      <EditMessage
                        message={m}
                        onSave={(content) => void edit(m, content)}
                      />
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
          <div ref={bottom} />
        </div>
        <div className="chat-composer">
          {error && <Alert error>{error}</Alert>}
          {caps && !caps.text && (
            <Alert>
              Requires Configuration. Hubungkan provider AI di{" "}
              <Link href="/settings/integrations">pengaturan server</Link> untuk
              memulai chat.
            </Alert>
          )}
          <div className="composer-box">
            <textarea
              aria-label="Pesan untuk HOLYAI"
              placeholder="Tanyakan apa saja, atau mulai dengan sebuah ide…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <div className="composer-tools">
              <Modal
                title="Lampirkan materi"
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Lampirkan file"
                  >
                    <Icon name="Paperclip" size={17} />
                  </Button>
                }
              >
                <FileUpload files={files} onChange={setFiles} />
              </Modal>
              <select
                aria-label="Model AI"
                value={provider || caps?.models[0]?.id || ""}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="" disabled>
                  Pilih model
                </option>
                {caps?.models.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={web}
                  disabled={!caps?.search}
                  onChange={(e) => setWeb(e.target.checked)}
                />
                <Icon name="Globe" size={14} />
                Web
              </label>
              {busy ? (
                <Button
                  aria-label="Hentikan respons"
                  variant="secondary"
                  onClick={() => abort.current?.abort()}
                >
                  <Icon name="Square" size={14} />
                </Button>
              ) : (
                <Button
                  aria-label="Kirim pesan"
                  disabled={!caps?.text || !prompt.trim()}
                  onClick={() => void send()}
                >
                  <Icon name="ArrowUp" size={18} />
                </Button>
              )}
            </div>
            {files.length > 0 && (
              <small>{files.length} lampiran terpilih</small>
            )}
          </div>
          <div className="flex-between">
            <small className="composer-disclaimer">
              AI dapat membuat kesalahan. Verifikasi informasi penting.
              Shift+Enter untuk baris baru.
            </small>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void send(true)}
              >
                <Icon name="RefreshCw" size={12} />
                {messages.at(-1)?.role === "user" ? "Jawab pesan" : "Ulangi"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
function EditMessage({
  message,
  onSave,
}: {
  message: Message;
  onSave: (content: string) => void;
}) {
  const [text, setText] = useState(message.content);
  return (
    <Modal
      title="Edit pesan & mulai ulang konteks"
      trigger={
        <Button variant="ghost" size="sm">
          <Icon name="Pencil" size={13} />
          Edit
        </Button>
      }
    >
      <Field label="Isi pesan">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <p style={{ fontSize: 12, marginBottom: 16 }}>
        Pesan setelah bagian ini akan dihapus dari percakapan. Tekan Ulangi
        untuk jawaban baru.
      </p>
      <Button onClick={() => onSave(text)}>Simpan pesan</Button>
    </Modal>
  );
}
function RenameConversation({
  conversation,
  reload,
}: {
  conversation: Conversation;
  reload: () => Promise<void>;
}) {
  const [title, setTitle] = useState(conversation.title);
  return (
    <Modal
      title="Nama percakapan"
      trigger={
        <button aria-label="Ubah nama percakapan">
          <Icon name="Pencil" size={12} />
        </button>
      }
    >
      <Field label="Judul">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Button
        onClick={async () => {
          await api("/api/chat", {
            method: "PATCH",
            body: JSON.stringify({ id: conversation.id, title }),
          });
          await reload();
        }}
      >
        Simpan
      </Button>
    </Modal>
  );
}

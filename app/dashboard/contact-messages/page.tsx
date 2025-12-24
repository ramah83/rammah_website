"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Users, Clock, CheckCircle2, MessageSquare, Send, ArrowRight } from "lucide-react";
import DeveloperFooter from "@/components/DeveloperFooter";

const COLORS = {
  text: "#1D1D1D",
  muted: "#6B6B6B",
  bg: "#EFE6DE",
  card: "#FFFFFF",
  border: "#E7E2DC",
  line: "#E3E3E3",
  soft: "#F6F6F6",
  primary: "#EC1A24",
};

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "responded";
  createdAt: string;
  respondedAt?: string;
  respondedBy?: string;
  response?: string;
};

function buildSessionHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

export default function ContactMessagesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read" | "responded">("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [response, setResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState({ subject: "", message: "" });

  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) {
        router.push("/");
        return;
      }
      const parsed = JSON.parse(s);
      setSession(parsed);
    } catch {
      router.push("/");
    }
  }, [router]);

  const loadMessages = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const url = session.role === "user" 
        ? `/api/contact?myMessages=true&email=${encodeURIComponent(session.email)}`
        : `/api/contact?status=${filter}`;
      
      const res = await fetch(url, {
        headers: buildSessionHeaders(),
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadMessages();
  }, [session, filter]);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/contact", {
        method: "PATCH",
        headers: buildSessionHeaders(),
        body: JSON.stringify({ id, status: "read" }),
      });
      loadMessages();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const sendResponse = async () => {
    if (!selectedMessage || !response.trim()) return;
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "PATCH",
        headers: buildSessionHeaders(),
        body: JSON.stringify({ id: selectedMessage.id, response }),
      });
      setResponse("");
      setSelectedMessage(null);
      loadMessages();
    } catch (error) {
      console.error("Failed to send response:", error);
    } finally {
      setSending(false);
    }
  };

  const sendNewMessage = async () => {
    if (!newMessage.subject.trim() || !newMessage.message.trim()) return;
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: buildSessionHeaders(),
        body: JSON.stringify({
          name: session.name || session.email,
          email: session.email,
          subject: newMessage.subject,
          message: newMessage.message,
        }),
      });
      setNewMessage({ subject: "", message: "" });
      setShowNewMessageModal(false);
      loadMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const isAdmin = session && ["unionSupervisor", "entityManager"].includes(session.role);
  const filteredMessages = isAdmin 
    ? messages.filter((m) => filter === "all" || m.status === filter)
    : messages;
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg }}>
      <HeaderBar />

      <section className="relative z-[1] mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-[28px] p-6 md:p-8 backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(255,255,255,0.98)",
            border: "1px solid rgba(231,226,220,0.8)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
          }}
        >
          <div className="flex items-center gap-4 mb-2">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: "#FFF0F0", border: "2px solid #FFE2E2" }}
            >
              <Mail className="h-8 w-8" color={COLORS.primary} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: COLORS.text }}>
                {isAdmin ? "رسائل التواصل" : "رسائلي"}
              </h1>
              <p className="text-base" style={{ color: COLORS.muted }}>
                {isAdmin ? "إدارة رسائل الدعم والاستفسارات" : "عرض رسائلك والردود عليها"}
              </p>
            </div>
          </div>
          {isAdmin && unreadCount > 0 && (
            <div
              className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm font-semibold mt-4"
              style={{ background: "#FFF0F0", color: COLORS.primary, border: "1px solid #FFE2E2" }}
            >
              <MessageSquare className="h-4 w-4" />
              {unreadCount} رسالة جديدة
            </div>
          )}
        </div>
      </section>

      <main className="relative z-[1] mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        {/* New Message Button - For regular users */}
        {!isAdmin && (
          <div className="mb-6">
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="h-12 px-6 rounded-full font-bold transition-all hover:shadow-lg"
              style={{ background: COLORS.primary, color: "#FFFFFF" }}
            >
              <Send className="h-5 w-5 inline mr-2" />
              إرسال رسالة جديدة
            </button>
          </div>
        )}

        {/* Filters - Only for admins */}
        {isAdmin && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "unread", "read", "responded"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="h-10 px-4 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: filter === f ? COLORS.primary : COLORS.card,
                    color: filter === f ? "#FFFFFF" : COLORS.text,
                    border: `1px solid ${filter === f ? COLORS.primary : COLORS.line}`,
                  }}
                >
                  {f === "all" ? "الكل" : f === "unread" ? "غير مقروءة" : f === "read" ? "مقروءة" : "تم الرد"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: COLORS.soft }} />
            ))}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
          >
            <Mail className="h-16 w-16 mx-auto mb-4" style={{ color: COLORS.muted }} />
            <div className="font-semibold text-lg mb-2" style={{ color: COLORS.text }}>
              لا توجد رسائل
            </div>
            <div className="text-sm" style={{ color: COLORS.muted }}>
              لم يتم استلام أي رسائل بعد
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-2xl p-6 transition-all hover:shadow-2xl"
                style={{
                  background: msg.status === "unread" ? "#FFF8F8" : COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg" style={{ color: COLORS.text }}>
                        {msg.subject}
                      </h3>
                      <StatusBadge status={msg.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: COLORS.muted }}>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {msg.name}
                      </span>
                      <span>{msg.email}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(msg.createdAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: COLORS.text }}>
                    {msg.message}
                  </p>
                </div>

                {msg.response && (
                  <div
                    className="rounded-xl p-4 mb-4"
                    style={{ background: "#E8F7EE", border: "1px solid #CBE9D6" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold" style={{ color: "#0F5132" }}>
                        الرد:
                      </div>
                      {msg.respondedAt && (
                        <div className="text-xs" style={{ color: "#0F5132" }}>
                          {new Date(msg.respondedAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}
                        </div>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#0F5132" }}>
                      {msg.response}
                    </p>
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {msg.status === "unread" && (
                      <button
                        onClick={() => markAsRead(msg.id)}
                        className="h-10 px-4 rounded-full text-sm font-semibold transition-all hover:shadow-lg"
                        style={{ background: COLORS.soft, color: COLORS.text, border: `1px solid ${COLORS.line}` }}
                      >
                        <CheckCircle2 className="h-4 w-4 inline mr-1" />
                        تحديد كمقروءة
                      </button>
                    )}
                    {msg.status !== "responded" && (
                      <button
                        onClick={() => setSelectedMessage(msg)}
                        className="h-10 px-4 rounded-full text-sm font-semibold transition-all hover:shadow-lg"
                        style={{ background: COLORS.primary, color: "#FFFFFF" }}
                      >
                        <Send className="h-4 w-4 inline mr-1" />
                        الرد على الرسالة
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Message Modal - For regular users */}
      {showNewMessageModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewMessageModal(false)} />
          <div
            className="relative z-10 w-full max-w-2xl rounded-2xl p-6"
            style={{ background: COLORS.card, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
              إرسال رسالة جديدة
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
                الموضوع
              </label>
              <input
                type="text"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder="موضوع الرسالة"
                className="w-full rounded-xl px-4 py-3"
                style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
                الرسالة
              </label>
              <textarea
                value={newMessage.message}
                onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                placeholder="اكتب رسالتك هنا..."
                className="w-full rounded-xl px-4 py-3 resize-none"
                style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text, minHeight: "150px" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={sendNewMessage}
                disabled={sending || !newMessage.subject.trim() || !newMessage.message.trim()}
                className="h-11 px-6 rounded-full font-bold transition-all disabled:opacity-50"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}
              >
                {sending ? "جاري الإرسال..." : "إرسال"}
              </button>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="h-11 px-6 rounded-full font-semibold"
                style={{ background: COLORS.soft, color: COLORS.text }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedMessage(null)} />
          <div
            className="relative z-10 w-full max-w-2xl rounded-2xl p-6"
            style={{ background: COLORS.card, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
              الرد على: {selectedMessage.subject}
            </h3>
            <div
              className="rounded-xl p-3 mb-4 flex items-start gap-2"
              style={{ background: "#E8F7EE", border: "1px solid #CBE9D6" }}
            >
              <Mail className="h-5 w-5 mt-0.5" style={{ color: "#0F5132" }} />
              <div className="text-sm" style={{ color: "#0F5132" }}>
                <strong>سيتم إرسال الرد على البريد الإلكتروني:</strong> {selectedMessage.email}
              </div>
            </div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="اكتب ردك هنا..."
              className="w-full rounded-xl px-4 py-3 mb-4 resize-none"
              style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text, minHeight: "150px" }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={sendResponse}
                disabled={sending || !response.trim()}
                className="h-11 px-6 rounded-full font-bold transition-all disabled:opacity-50"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}
              >
                {sending ? "جاري الإرسال..." : "إرسال الرد"}
              </button>
              <button
                onClick={() => setSelectedMessage(null)}
                className="h-11 px-6 rounded-full font-semibold"
                style={{ background: COLORS.soft, color: COLORS.text }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <DeveloperFooter />
    </div>
  );
}

function HeaderBar() {
  return (
    <header className="relative z-[100001]">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}
            >
              <Users className="h-5 w-5" color={COLORS.text} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: COLORS.text }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full font-semibold transition-all hover:shadow-lg"
            style={{ background: COLORS.primary, color: "#FFFFFF" }}
          >
            <ArrowRight className="h-4 w-4" />
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    </header>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    unread: { bg: "#FFF0F0", border: "#FFE2E2", color: "#EC1A24", label: "جديدة" },
    read: { bg: "#FFF8E8", border: "#F2E7C6", color: "#6B5400", label: "مقروءة" },
    responded: { bg: "#E8F7EE", border: "#CBE9D6", color: "#0F5132", label: "تم الرد" },
  };
  const c = config[status as keyof typeof config] || config.unread;
  return (
    <span
      className="inline-flex items-center h-6 px-3 rounded-full text-xs font-semibold"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
    >
      {c.label}
    </span>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Bell, X, Check, CheckCheck, 
  UserPlus, UserMinus, UserCheck, UserX,
  Calendar, CalendarCheck, CalendarX, Trash2,
  Shield, ShieldCheck, ShieldX,
  FileText, FileCheck, FileX,
  AlertCircle, CheckCircle2
} from "lucide-react";

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

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
};

function withSession(init: RequestInit = {}): RequestInit {
  const h = new Headers(init.headers || {});
  try {
    const raw = localStorage.getItem("session") || "";
    const b64 = raw ? btoa(unescape(encodeURIComponent(raw))) : "";
    if (b64) h.set("x-session-b64", b64);
  } catch {}
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData))
    h.set("Content-Type", "application/json");
  return { ...init, headers: h, credentials: "include", cache: "no-store" };
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", withSession());
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount?.count || 0);
      
      // تشغيل صوت إذا كان هناك إشعارات جديدة غير مقروءة
      if (data.unreadCount?.count > unreadCount && unreadCount > 0) {
        playNotificationSound();
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  }, [unreadCount]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        ...withSession(),
        method: "PATCH",
        body: JSON.stringify({ notificationId }),
      });
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        ...withSession(),
        method: "PATCH",
        body: JSON.stringify({ markAllAsRead: true }),
      });
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        ...withSession(),
        method: "DELETE",
      });
      loadNotifications();
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // كل 30 ثانية
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "الآن";
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      if (days < 7) return `منذ ${days} يوم`;
      return date.toLocaleDateString("ar-EG");
    } catch {
      return dateStr;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "join_request": return <UserPlus className="h-5 w-5" style={{ color: COLORS.primary }} />;
      case "join_approved": return <UserCheck className="h-5 w-5" style={{ color: "#0F5132" }} />;
      case "join_rejected": return <UserX className="h-5 w-5" style={{ color: "#7A0010" }} />;
      case "leave_request": return <UserMinus className="h-5 w-5" style={{ color: COLORS.primary }} />;
      case "leave_approved": return <CheckCircle2 className="h-5 w-5" style={{ color: "#0F5132" }} />;
      case "leave_rejected": return <AlertCircle className="h-5 w-5" style={{ color: "#7A0010" }} />;
      case "event_created": return <Calendar className="h-5 w-5" style={{ color: COLORS.primary }} />;
      case "event_approved": return <CalendarCheck className="h-5 w-5" style={{ color: "#0F5132" }} />;
      case "event_rejected": return <CalendarX className="h-5 w-5" style={{ color: "#7A0010" }} />;
      case "event_deleted": return <Trash2 className="h-5 w-5" style={{ color: "#7A0010" }} />;
      case "iso_submitted": return <Shield className="h-5 w-5" style={{ color: COLORS.primary }} />;
      case "iso_approved": return <ShieldCheck className="h-5 w-5" style={{ color: "#0F5132" }} />;
      case "iso_rejected": return <ShieldX className="h-5 w-5" style={{ color: "#7A0010" }} />;
      case "governance_submitted": return <FileText className="h-5 w-5" style={{ color: COLORS.primary }} />;
      case "governance_approved": return <FileCheck className="h-5 w-5" style={{ color: "#0F5132" }} />;
      case "governance_rejected": return <FileX className="h-5 w-5" style={{ color: "#7A0010" }} />;
      default: return <Bell className="h-5 w-5" style={{ color: COLORS.primary }} />;
    }
  };

  return (
    <div className="relative z-[9999]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 w-10 rounded-full grid place-items-center transition-all duration-200 hover:bg-opacity-80"
        style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}
      >
        <Bell className="h-5 w-5" style={{ color: COLORS.text }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold grid place-items-center text-white animate-pulse"
            style={{ background: COLORS.primary }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl z-[9999] max-h-[80vh] overflow-hidden flex flex-col"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: COLORS.line }}>
              <h3 className="font-bold text-lg" style={{ color: COLORS.text }}>
                الإشعارات
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs px-3 py-1 rounded-full transition-all duration-200 hover:opacity-80"
                    style={{ background: COLORS.soft, color: COLORS.text }}
                  >
                    <CheckCheck className="h-3 w-3 inline mr-1" />
                    تحديد الكل كمقروء
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 hover:bg-opacity-80"
                  style={{ background: COLORS.soft }}
                >
                  <X className="h-4 w-4" style={{ color: COLORS.text }} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-sm" style={{ color: COLORS.muted }}>
                    جاري التحميل...
                  </div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-3" style={{ color: COLORS.muted }} />
                  <div className="font-semibold mb-1" style={{ color: COLORS.text }}>
                    لا توجد إشعارات
                  </div>
                  <div className="text-sm" style={{ color: COLORS.muted }}>
                    ستظهر هنا جميع الإشعارات الجديدة
                  </div>
                </div>
              ) : (
                <ul>
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className="border-b transition-all duration-200"
                      style={{
                        borderColor: COLORS.line,
                        background: notification.isRead ? "transparent" : COLORS.soft,
                      }}
                    >
                      <a
                        href={notification.link || "#"}
                        onClick={() => {
                          if (!notification.isRead) markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                        className="block p-4 hover:bg-opacity-50 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                               style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm mb-1" style={{ color: COLORS.text }}>
                              {notification.title}
                            </div>
                            <div className="text-sm mb-2 leading-relaxed" style={{ color: COLORS.muted }}>
                              {notification.message}
                            </div>
                            <div className="text-xs" style={{ color: COLORS.muted }}>
                              {formatDate(notification.createdAt)}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 hover:bg-opacity-80"
                                style={{ background: COLORS.soft }}
                                title="تحديد كمقروء"
                              >
                                <Check className="h-4 w-4" style={{ color: COLORS.primary }} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="h-8 w-8 rounded-full grid place-items-center transition-all duration-200 hover:bg-opacity-80"
                              style={{ background: COLORS.soft }}
                              title="حذف"
                            >
                              <X className="h-4 w-4" style={{ color: COLORS.text }} />
                            </button>
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase";
import { LogOut, UserCircle, ChevronDown } from "lucide-react";

export default function AuthBar() {
  const { user, loading, signOutUser } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isFirebaseConfigured() || loading || !user) {
    return null;
  }

  const label = user.isAnonymous
    ? "Guest"
    : user.displayName || user.email || "Signed in";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 backdrop-blur-md shadow-lg transition-colors hover:brightness-110"
        style={{
          background: "var(--pill-bg, rgba(255,255,255,0.08))",
          border: "1px solid var(--pill-border, rgba(255,255,255,0.1))",
        }}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-5 h-5 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <UserCircle className="w-4 h-4 shrink-0" style={{ color: "var(--panel-text-muted)" }} />
        )}
        <span
          className="text-xs max-w-[120px] truncate hidden sm:inline"
          style={{ color: "var(--pill-text, #ccc)" }}
          title={label}
        >
          {label}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--panel-text-muted)" }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full right-0 mb-2 w-48 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md z-[999]"
            style={{ background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}
          >
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--panel-border)" }}>
              <p className="text-xs font-medium truncate" style={{ color: "var(--panel-text)" }}>
                {label}
              </p>
              {user.email && !user.isAnonymous && (
                <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--panel-text-muted)" }}>
                  {user.email}
                </p>
              )}
            </div>
            <button
              onClick={() => { setOpen(false); void signOutUser(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

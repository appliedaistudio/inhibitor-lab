"use client";

import { signIn, signOut, useSession } from "next-auth/react";

import { useAuthAvailability } from "./auth-provider";
import { showDialog } from "./ui/dialog";

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function AuthEnabledSettingsButton({ className }: { className?: string }) {
  const { data: session } = useSession();

  function handleClick() {
    if (session?.user) {
      showDialog({
        variant: "confirm",
        title: "Sign out?",
        body: `Sign out${session.user.email ? ` of ${session.user.email}` : ""}.`,
        confirmLabel: "Sign out",
        danger: true,
        onConfirm: () => {
          void signOut();
        }
      });
      return;
    }

    showDialog({
      variant: "confirm",
      title: "Sign in with Google?",
      body: "Use Google auth for synced identity and account-linked workspace features.",
      confirmLabel: "Sign in",
      cancelLabel: "Not now",
      onConfirm: () => {
        void signIn("google", { callbackUrl: "/" });
      }
    });
  }

  return (
    <button className={className} type="button" title="Settings" aria-label="Settings" onClick={handleClick}>
      <GearIcon />
    </button>
  );
}

export function SettingsButton({ className }: { className?: string }) {
  const authEnabled = useAuthAvailability();

  if (!authEnabled) {
    return (
      <button
        className={className}
        type="button"
        title="Settings"
        aria-label="Settings"
        onClick={() =>
          showDialog({
            variant: "alert",
            title: "Google auth not configured",
            body: "Set the Google auth environment variables to enable sign-in here.",
            onConfirm: () => undefined
          })
        }
      >
        <GearIcon />
      </button>
    );
  }

  return <AuthEnabledSettingsButton className={className} />;
}

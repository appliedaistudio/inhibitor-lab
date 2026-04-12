"use client";

import { signIn, useSession } from "next-auth/react";

import { useAuthAvailability } from "./auth-provider";

function UserAvatar({
  image,
  fallback
}: {
  image?: string | null;
  fallback: string;
}) {
  return (
    <div className="user-avatar-wrap">
      {image ? (
        <img src={image} alt="User avatar" className="user-avatar" referrerPolicy="no-referrer" />
      ) : (
        <div className="user-avatar-fallback">{fallback}</div>
      )}
    </div>
  );
}

function AuthenticatedUserProfile({ collapsed }: { collapsed?: boolean }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className={`user-profile-container loading ${collapsed ? "collapsed" : ""}`}>
        <div className="user-profile-skeleton" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className={`user-profile-container auth-active ${collapsed ? "collapsed" : ""}`}>
        <div className="user-profile-bubble">
          <UserAvatar
            image={session.user.image}
            fallback={session.user.name?.[0] ?? session.user.email?.[0] ?? "?"}
          />
          {!collapsed && (
            <div className="user-info">
              <h3 className="user-name">{session.user.name || "Student"}</h3>
              <p className="user-email">{session.user.email || "Signed in"}</p>
            </div>
          )}
          {!collapsed && <div className="user-status-dot" />}
        </div>
      </div>
    );
  }

  return (
    <div className={`user-profile-container ${collapsed ? "collapsed" : ""}`}>
      <button
        className="user-profile-bubble user-profile-bubble--action"
        onClick={() => void signIn("google", { callbackUrl: "/" })}
        type="button"
        title={collapsed ? "Sign in with Google" : undefined}
      >
        <UserAvatar fallback="G" />
        {!collapsed && (
          <div className="user-info">
            <h3 className="user-name">Sign in with Google</h3>
            <p className="user-email">Enable account-linked workspace features</p>
          </div>
        )}
      </button>
    </div>
  );
}

export function UserProfile({ collapsed }: { collapsed?: boolean }) {
  const authEnabled = useAuthAvailability();

  if (!authEnabled) {
    if (collapsed) return null;
    return (
      <div className="user-profile-container">
        <div className="user-profile-bubble user-profile-bubble--disabled">
          <UserAvatar fallback="?" />
          <div className="user-info">
            <h3 className="user-name">Google auth unavailable</h3>
            <p className="user-email">Configure env locally to enable sign-in</p>
          </div>
        </div>
      </div>
    );
  }

  return <AuthenticatedUserProfile collapsed={collapsed} />;
}

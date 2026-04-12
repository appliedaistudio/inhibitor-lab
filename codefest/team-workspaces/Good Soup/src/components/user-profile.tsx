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
        <img src={image} alt="User avatar" className="user-avatar" />
      ) : (
        <div className="user-avatar-fallback">{fallback}</div>
      )}
    </div>
  );
}

function AuthenticatedUserProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="user-profile-container loading">
        <div className="user-profile-skeleton" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="user-profile-container auth-active">
        <div className="user-profile-bubble">
          <UserAvatar
            image={session.user.image}
            fallback={session.user.name?.[0] ?? session.user.email?.[0] ?? "?"}
          />
          <div className="user-info">
            <h3 className="user-name">{session.user.name || "Student"}</h3>
            <p className="user-email">{session.user.email || "Signed in"}</p>
          </div>
          <div className="user-status-dot" />
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <button
        className="user-profile-bubble user-profile-bubble--action"
        onClick={() => void signIn("google", { callbackUrl: "/" })}
        type="button"
      >
        <UserAvatar fallback="G" />
        <div className="user-info">
          <h3 className="user-name">Sign in with Google</h3>
          <p className="user-email">Enable account-linked workspace features</p>
        </div>
      </button>
    </div>
  );
}

export function UserProfile() {
  const authEnabled = useAuthAvailability();

  if (!authEnabled) {
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

  return <AuthenticatedUserProfile />;
}

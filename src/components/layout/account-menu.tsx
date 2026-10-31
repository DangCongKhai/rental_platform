"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { CurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/account/notification-bell";
import type { InboxNotification } from "@/components/account/notification-list";
import { previewNavbarAccount } from "@/server/notifications/inbox";
import { GuestActions } from "./guest-actions";
import { UserMenu } from "./user-menu";

/** Survives remounts. Undefined means this browser tab has not checked yet. */
let remembered: CurrentUser | null | undefined;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return letters.toUpperCase();
}

function fromSession(user: User): CurrentUser | null {
  if (!user.email) return null;
  const fullName = user.user_metadata?.full_name;
  const name =
    typeof fullName === "string" && fullName.trim()
      ? fullName.trim()
      : user.email.split("@")[0];
  return { id: user.id, email: user.email, name, initials: initialsOf(name) };
}

export function AccountMenu() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(remembered);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const userId = user?.id;

  const remember = useCallback((next: CurrentUser | null) => {
    remembered = next;
    setUser(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await previewNavbarAccount();
      remember(result.user);
      setNotifications(result.notifications);
    } catch {
      setNotifications([]);
    }
  }, [remember]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      remember(data.session?.user ? fromSession(data.session.user) : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      remember(session?.user ? fromSession(session.user) : null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [remember]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    previewNavbarAccount()
      .then((result) => {
        if (cancelled) return;
        remember(result.user);
        setNotifications(result.notifications);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, [remember, userId]);

  if (user === undefined) {
    return <span className="inline-block h-11 w-36" aria-hidden="true" />;
  }
  if (!user) return <GuestActions />;
  return (
    <>
      <NotificationBell notifications={notifications} onUpdated={refresh} />
      <UserMenu user={user} />
    </>
  );
}

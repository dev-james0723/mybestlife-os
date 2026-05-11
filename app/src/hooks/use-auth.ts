"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearDevLoginBypassCookie,
  hasDevLoginBypassCookie,
  setDevLoginBypassCookie,
} from "@/lib/dev-login-bypass";
import type { User } from "@supabase/supabase-js";
import { ensureError } from "@/lib/utils/ensure-error";
import { buildGoogleCalendarOAuthOptions } from "@/lib/google-calendar/oauth-options";
import { useAppStore } from "@/stores/app-store";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";

function userHasGoogleIdentity(user: User | null): boolean {
  return !!user?.identities?.some((i) => i.provider === "google");
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [devBypassSession, setDevBypassSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        clearDevLoginBypassCookie();
        setDevBypassSession(false);
      } else {
        setDevBypassSession(hasDevLoginBypassCookie());
      }
      setUser(user);
      setIsLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        clearDevLoginBypassCookie();
        setDevBypassSession(false);
      } else {
        setDevBypassSession(hasDevLoginBypassCookie());
      }
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) throw ensureError(error);
  };

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) throw ensureError(error);
  };

  const signInWithMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) throw ensureError(error);
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) throw ensureError(error);
  };

  const signInDevBypass = () => {
    setDevLoginBypassCookie();
    const lang = useAppStore.getState().language;
    window.location.href = withAppLocalePrefix(lang, "/dashboard");
  };

  /**
   * Email + password sign-up. If the project requires email confirmation, `session` is null
   * until the user opens the link in their inbox (sent via Supabase; configure Resend as SMTP).
   */
  const signUpWithEmail = async (email: string, password: string) => {
    const redirect = `${window.location.origin}/callback`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirect },
    });
    if (error) throw ensureError(error);
    return { session: data.session, user: data.user };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw ensureError(error);
    const lang = useAppStore.getState().language;
    window.location.href = withAppLocalePrefix(lang, "/dashboard");
  };

  const signOut = async () => {
    clearDevLoginBypassCookie();
    const lang = useAppStore.getState().language;
    await supabase.auth.signOut();
    window.location.href = withAppLocalePrefix(lang, "/login");
  };

  /**
   * Opens Google OAuth with Calendar event scope. If the user already has a Google identity,
   * re-consents on the same account; otherwise links Google to the current session (e.g. Apple sign-in).
   */
  const startGoogleCalendarAccessFlow = async () => {
    const {
      data: { user: current },
    } = await supabase.auth.getUser();
    if (!current) {
      throw new Error("You must be signed in to connect Google Calendar.");
    }
    const options = buildGoogleCalendarOAuthOptions(window.location.origin);
    if (userHasGoogleIdentity(current)) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options,
      });
      if (error) throw ensureError(error);
      return;
    }
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options,
    });
    if (error) throw ensureError(error);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user || devBypassSession,
    signInWithGoogle,
    signInWithApple,
    signInWithMicrosoft,
    signInWithFacebook,
    signInWithEmail,
    signUpWithEmail,
    signInDevBypass,
    signOut,
    startGoogleCalendarAccessFlow,
  };
}

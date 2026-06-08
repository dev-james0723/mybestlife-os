"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Brain, Mail } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clearDevLoginBypassCookie,
  isDevLoginBypassFeatureEnabled,
} from "@/lib/dev-login-bypass";
import { useAuth } from "@/hooks/use-auth";
import {
  AppleBrandIcon,
  FacebookBrandIcon,
  GoogleBrandIcon,
  MicrosoftBrandIcon,
} from "@/components/auth/oauth-brand-icons";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { useLocalizedPath } from "@/hooks/use-locale-slug";

export function LoginForm() {
  const language = useAppStore((s) => s.language);
  const dashboardHref = useLocalizedPath("/dashboard");
  const ui = getMiscUiCopy(language).authLogin;
  const searchParams = useSearchParams();
  const {
    signInWithGoogle,
    signInWithApple,
    signInWithMicrosoft,
    signInWithFacebook,
    signInWithEmail,
    signUpWithEmail,
    signInDevBypass,
  } = useAuth();
  const showDevBypass = isDevLoginBypassFeatureEnabled();

  const [emailTab, setEmailTab] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState<
    "google" | "apple" | "microsoft" | "facebook" | null
  >(null);

  useEffect(() => {
    if (searchParams.get("error") === "auth_failed") {
      toast.error(ui.toastAuthFailed);
    }
  }, [searchParams, ui.toastAuthFailed]);

  useEffect(() => {
    if (!showDevBypass) clearDevLoginBypassCookie();
  }, [showDevBypass]);

  const runOAuth = async (provider: "google" | "apple" | "microsoft" | "facebook") => {
    setOauthBusy(provider);
    try {
      if (provider === "google") await signInWithGoogle();
      else if (provider === "apple") await signInWithApple();
      else if (provider === "microsoft") await signInWithMicrosoft();
      else await signInWithFacebook();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ui.toastCouldNotStartSignIn;
      toast.error(message);
    } finally {
      setOauthBusy(null);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(ui.toastEnterEmailPassword);
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ui.toastCouldNotSignIn;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(ui.toastEnterEmailPassword);
      return;
    }
    if (password.length < 6) {
      toast.error(ui.toastPasswordMin);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(ui.toastPasswordsMismatch);
      return;
    }
    setSubmitting(true);
    setVerificationSentTo(null);
    try {
      const { session } = await signUpWithEmail(email, password);
      if (session) {
        toast.success(ui.toastAccountReady);
        window.location.href = dashboardHref;
        return;
      }
      setVerificationSentTo(email.trim());
      toast.success(ui.toastCheckEmail);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ui.toastCouldNotCreateAccount;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Reveal scroll={false} className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center">
                <Brain className="h-9 w-9 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">{ui.heading}</CardTitle>
              <CardDescription className="mt-2">
                {ui.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 text-base gap-3"
              type="button"
              disabled={oauthBusy !== null}
              onClick={() => void runOAuth("google")}
            >
              <GoogleBrandIcon />
              {oauthBusy === "google" ? ui.redirecting : ui.continueWithGoogle}
            </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            type="button"
            disabled={oauthBusy !== null}
            onClick={() => void runOAuth("apple")}
          >
            <AppleBrandIcon />
            {oauthBusy === "apple" ? ui.redirecting : ui.continueWithApple}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            type="button"
            disabled={oauthBusy !== null}
            onClick={() => void runOAuth("microsoft")}
          >
            <MicrosoftBrandIcon />
            {oauthBusy === "microsoft" ? ui.redirecting : ui.continueWithMicrosoft}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            type="button"
            disabled={oauthBusy !== null}
            onClick={() => void runOAuth("facebook")}
          >
            <FacebookBrandIcon />
            {oauthBusy === "facebook" ? ui.redirecting : ui.continueWithFacebook}
          </Button>

          <div className="relative py-2">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              {ui.orEmail}
            </span>
          </div>

          {verificationSentTo ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-3 text-sm text-center space-y-2">
              <div className="flex justify-center">
                <Mail className="h-8 w-8 text-muted-foreground" aria-hidden />
              </div>
              <p className="font-medium text-foreground">{ui.confirmEmailTitle}</p>
              <p className="text-muted-foreground">
                {ui.confirmEmailBody(verificationSentTo)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => {
                  setVerificationSentTo(null);
                  setEmailTab("sign-in");
                }}
              >
                {ui.backToSignIn}
              </Button>
            </div>
          ) : (
            <Tabs
              value={emailTab}
              onValueChange={(v) => {
                if (v === "sign-in" || v === "sign-up") setEmailTab(v);
              }}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="sign-in">{ui.signInTab}</TabsTrigger>
                <TabsTrigger value="sign-up">{ui.createAccountTab}</TabsTrigger>
              </TabsList>
              <TabsContent value="sign-in" className="space-y-3 pt-3">
                <form onSubmit={(e) => void handleSignIn(e)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email-in">{ui.emailLabel}</Label>
                    <Input
                      id="email-in"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={ui.emailPlaceholder}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-in">{ui.passwordLabel}</Label>
                    <Input
                      id="password-in"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={submitting}>
                    {submitting ? ui.signingIn : ui.signInWithEmail}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="sign-up" className="space-y-3 pt-3">
                <form onSubmit={(e) => void handleSignUp(e)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email-up">{ui.emailLabel}</Label>
                    <Input
                      id="email-up"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={ui.emailPlaceholder}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-up">{ui.passwordLabel}</Label>
                    <Input
                      id="password-up"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                    />
                    <p className="text-xs text-muted-foreground">{ui.passwordHint}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-up2">{ui.confirmPasswordLabel}</Label>
                    <Input
                      id="password-up2"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={submitting}>
                    {submitting ? ui.creatingAccount : ui.createAccount}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {showDevBypass ? (
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="w-full h-12 text-base"
                onClick={signInDevBypass}
              >
                {ui.devBypassCta}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {ui.devBypassDescription}
                {process.env.NODE_ENV === "development" ? ui.devBypassLocalOnlySuffix : ""} To hide on Vercel, set{" "}
                <code className="text-[0.7rem] bg-muted px-1 py-0.5 rounded">
                  NEXT_PUBLIC_HIDE_DEV_LOGIN_BYPASS=true
                </code>
                .
              </p>
            </div>
          ) : null}

          <p className="text-xs text-center text-muted-foreground pt-4">
            {ui.termsNotice}
          </p>
        </CardContent>
      </Card>
      </Reveal>
    </div>
  );
}

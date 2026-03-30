import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { AUTH_NETWORK_TIMEOUT_MS, withTimeout } from "@/lib/authTimeout";

export async function completeOAuthRedirect(resultUrl: string): Promise<{ error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(resultUrl);
  } catch {
    return { error: "Invalid redirect from sign-in." };
  }

  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const queryParams = parsed.searchParams;
  const code = queryParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { error: error.message };
    return {};
  }

  const access_token =
    hashParams.get("access_token") ?? queryParams.get("access_token") ?? undefined;
  const refresh_token =
    hashParams.get("refresh_token") ?? queryParams.get("refresh_token") ?? undefined;

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) return { error: error.message };
    return {};
  }

  const errDesc = queryParams.get("error_description") ?? queryParams.get("error");
  if (errDesc) {
    try {
      return { error: decodeURIComponent(errDesc.replace(/\+/g, " ")) };
    } catch {
      return { error: errDesc };
    }
  }

  return { error: "Could not complete sign-in from the redirect." };
}

export async function signInWithOAuthExpo(
  provider: "google" | "apple",
): Promise<{ error?: string; status?: number; code?: string }> {
  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
    return {};
  }

  const redirectTo = Linking.createURL("(auth)/welcome");

  const { data, error } = await withTimeout(
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    }),
    AUTH_NETWORK_TIMEOUT_MS,
    `signInWithOAuth(${provider})`,
  );

  if (error) return { error: error.message, status: (error as any).status, code: (error as any).code };
  if (!data?.url) return { error: "Could not start sign-in." };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success" || !result.url) {
    if (result.type === "cancel" || result.type === "dismiss") {
      return { error: "Sign-in was cancelled." };
    }
    return { error: "Sign-in was not completed." };
  }

  return completeOAuthRedirect(result.url);
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = "google" | "kakao" | "naver";

export type SocialLoginResponse = {
  userId?: number;
  newUser?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

const PENDING_KEY = "social_login_pending_v1";
let pendingSocialLogin = false;
let processingSocialLogin = false;
const pendingListeners = new Set<(value: boolean) => void>();
const processingListeners = new Set<(value: boolean) => void>();

const persistPending = async (value: boolean) => {
  try {
    if (value) {
      await AsyncStorage.setItem(PENDING_KEY, "1");
    } else {
      await AsyncStorage.removeItem(PENDING_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
};

export const setSocialLoginPending = (value: boolean) => {
  pendingSocialLogin = value;
  pendingListeners.forEach((listener) => listener(value));
  void persistPending(value);
};

export const getSocialLoginPending = () => pendingSocialLogin;

export const subscribeSocialLoginPending = (listener: (value: boolean) => void) => {
  pendingListeners.add(listener);
  return () => {
    pendingListeners.delete(listener);
  };
};

export const loadSocialLoginPending = async () => {
  try {
    const stored = await AsyncStorage.getItem(PENDING_KEY);
    const value = stored === "1";
    pendingSocialLogin = value;
    pendingListeners.forEach((listener) => listener(value));
    return value;
  } catch {
    return pendingSocialLogin;
  }
};

export const setSocialLoginProcessing = (value: boolean) => {
  processingSocialLogin = value;
  processingListeners.forEach((listener) => listener(value));
};

export const getSocialLoginProcessing = () => processingSocialLogin;

export const subscribeSocialLoginProcessing = (
  listener: (value: boolean) => void
) => {
  processingListeners.add(listener);
  return () => {
    processingListeners.delete(listener);
  };
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const parseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    return data.message ?? data.error ?? null;
  } catch {
    return null;
  }
};

export const startSocialLogin = async (provider: SocialProvider) => {
  const redirectUrl = Linking.createURL("auth");
  const authorizeUrl = `${API_BASE_URL}/api/v1/login/${provider}/authorize?platform=app&redirect_uri=${encodeURIComponent(
    redirectUrl
  )}`;
  const callbackUrl = `${API_BASE_URL}/api/v1/login/${provider}/callback`;

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);
  if (result.type !== "success" || !result.url) {
    throw new Error("濡쒓렇?몄쓣 ?꾨즺?섏? 紐삵뻽?듬땲??");
  }

  const resultUrl = new URL(result.url);
  const accessToken = resultUrl.searchParams.get("accessToken");
  const refreshToken = resultUrl.searchParams.get("refreshToken");
  const tokenType = resultUrl.searchParams.get("tokenType");
  const userId = resultUrl.searchParams.get("userId");
  const expiresIn = resultUrl.searchParams.get("expiresIn");

  if (accessToken) {
    return {
      accessToken,
      refreshToken: refreshToken ?? undefined,
      tokenType: tokenType ?? undefined,
      userId: userId ? Number(userId) : undefined,
      expiresIn: expiresIn ? Number(expiresIn) : undefined,
    };
  }

  const code = resultUrl.searchParams.get("code");
  const state = resultUrl.searchParams.get("state");
  if (!code) {
    throw new Error("濡쒓렇??肄붾뱶瑜?諛쏆? 紐삵뻽?듬땲??");
  }

  const callback = new URL(callbackUrl);
  callback.searchParams.set("code", code);
  if (state) {
    callback.searchParams.set("state", state);
  }
  callback.searchParams.set("format", "json");

  const response = await fetch(callback.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message ?? "?뚯뀥 濡쒓렇?몄뿉 ?ㅽ뙣?덉뒿?덈떎.");
  }

  const data = (await response.json()) as SocialLoginResponse;
  if (!data.accessToken) {
    throw new Error("濡쒓렇???좏겙??諛쏆? 紐삵뻽?듬땲??");
  }

  return data;
};

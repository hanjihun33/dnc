import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

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
  const authorizeUrl = `${API_BASE_URL}/api/v1/login/${provider}/authorize`;
  const callbackUrl = `${API_BASE_URL}/api/v1/login/${provider}/callback`;
  const redirectUrl = Linking.createURL("auth");

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);
  if (result.type !== "success" || !result.url) {
    throw new Error("로그인을 완료하지 못했습니다.");
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
    throw new Error("로그인 코드를 받지 못했습니다.");
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
    throw new Error(message ?? "소셜 로그인에 실패했습니다.");
  }

  const data = (await response.json()) as SocialLoginResponse;
  if (!data.accessToken) {
    throw new Error("로그인 토큰을 받지 못했습니다.");
  }

  return data;
};

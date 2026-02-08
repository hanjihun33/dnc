import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthSession = {
  accessToken: string | null;
  tokenType: string;
  userId: number | null;
};

const SESSION_KEY = "auth_session_v1";

let session: AuthSession = {
  accessToken: null,
  tokenType: "Bearer",
  userId: null,
};

let profileRevision = 0;
const profileListeners = new Set<() => void>();

const listeners = new Set<(session: AuthSession) => void>();

export const loadAuthSession = async () => {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AuthSession>;
      session = { ...session, ...parsed };
      listeners.forEach((listener) => listener(session));
    }
  } catch {
    // Ignore storage errors.
  }
};

const persistSession = async () => {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors.
  }
};

export const setAuthSession = async (patch: Partial<AuthSession>) => {
  session = { ...session, ...patch };
  listeners.forEach((listener) => listener(session));
  await persistSession();
};

export const getAuthSession = () => session;

export const subscribeAuthSession = (listener: (session: AuthSession) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const clearAuthSession = async () => {
  session = {
    accessToken: null,
    tokenType: "Bearer",
    userId: null,
  };
  listeners.forEach((listener) => listener(session));
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage errors.
  }
};

export const getAuthHeaders = () => {
  const headers: Record<string, string> = {};
  if (session.accessToken) {
    const type = session.tokenType || "Bearer";
    headers.Authorization = `${type} ${session.accessToken}`;
  }
  if (session.userId) {
    headers["X-User-Id"] = String(session.userId);
  }
  return headers;
};

export const bumpProfileRevision = () => {
  profileRevision += 1;
  profileListeners.forEach((listener) => listener());
};

export const subscribeProfileRevision = (listener: () => void) => {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
};

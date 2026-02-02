import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuthHeaders, getAuthSession, loadAuthSession } from "./session";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const isExpoGo = Constants.appOwnership === "expo";

let handlerReady = false;

const getNotifications = async () => import("expo-notifications");

const ensureNotificationHandler = async () => {
  if (handlerReady) return;
  const Notifications = await getNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerReady = true;
};

const ensureNotificationChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }
  const Notifications = await getNotifications();
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.HIGH,
  });
};

const getDevicePushToken = async () => {
  if (isExpoGo) {
    return null;
  }
  const allowAndroidEmulator = Platform.OS === "android";
  if (!Device.isDevice && !allowAndroidEmulator) {
    return null;
  }

  const Notifications = await getNotifications();
  await ensureNotificationHandler();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  await ensureNotificationChannel();

  const token = await Notifications.getDevicePushTokenAsync();
  return token?.data ?? null;
};

export const registerPushTokenWithServer = async () => {
  try {
    if (isExpoGo) {
      return;
    }
    await loadAuthSession();
    const session = getAuthSession();
    if (!session.accessToken) {
      return;
    }

    const token = await getDevicePushToken();
    if (!token) {
      return;
    }

    await fetch(`${API_BASE_URL}/api/v1/users/me/push-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });
  } catch {
    // Ignore push registration errors.
  }
};

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getAuthHeaders, getAuthSession, loadAuthSession } from "./session";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ensureNotificationChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.HIGH,
  });
};

const getDevicePushToken = async () => {
  const allowAndroidEmulator = Platform.OS === "android";
  if (!Device.isDevice && !allowAndroidEmulator) {
    return null;
  }

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

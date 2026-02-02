import { loadAuthSession, getAuthHeaders } from "./session";
import { AlertKey, AlertSetting } from "./alert-store";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type AlertSettingResponse = {
  type: AlertKey;
  thresholdValue: number | null;
  rateThreshold?: number | null;
  intervalMinutes: number;
  enabled: boolean;
};

export const fetchAlertSettings = async (): Promise<AlertSettingResponse[]> => {
  await loadAuthSession();
  const response = await fetch(`${API_BASE_URL}/api/v1/users/me/alert-settings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to load alert settings");
  }
  return (await response.json()) as AlertSettingResponse[];
};

export const updateAlertSetting = async (
  type: AlertKey,
  patch: Partial<AlertSetting>
): Promise<AlertSettingResponse> => {
  await loadAuthSession();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/users/me/alert-settings/${type}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        thresholdValue: patch.thresholdValue,
        intervalMinutes: patch.intervalMinutes,
        enabled: patch.enabled,
      }),
    }
  );
  if (!response.ok) {
    throw new Error("Failed to update alert setting");
  }
  return (await response.json()) as AlertSettingResponse;
};

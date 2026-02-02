import { alertConfig, AlertType } from "./alert-config";

export type AlertKey = AlertType | "rapid-rise";

export type AlertSetting = {
  enabled: boolean;
  thresholdValue: number | null;
  intervalMinutes: number;
};

const defaultSettings: Record<AlertKey, AlertSetting> = {
  high: {
    enabled: true,
    thresholdValue: alertConfig.high.defaultValue,
    intervalMinutes: 15,
  },
  low: {
    enabled: true,
    thresholdValue: alertConfig.low.defaultValue,
    intervalMinutes: 15,
  },
  "very-low": {
    enabled: true,
    thresholdValue: alertConfig["very-low"].defaultValue,
    intervalMinutes: 15,
  },
  "urgent-low": {
    enabled: true,
    thresholdValue: alertConfig["urgent-low"].defaultValue,
    intervalMinutes: 15,
  },
  "rapid-rise": {
    enabled: true,
    thresholdValue: null,
    intervalMinutes: 15,
  },
};

let alertSettings: Record<AlertKey, AlertSetting> = { ...defaultSettings };

export const getAlertSetting = (type: AlertKey) => alertSettings[type];

export const setAlertSetting = (type: AlertKey, patch: Partial<AlertSetting>) => {
  alertSettings[type] = { ...alertSettings[type], ...patch };
};

export const setAlertSettings = (
  next: Partial<Record<AlertKey, AlertSetting>>
) => {
  alertSettings = { ...alertSettings, ...next };
};

export const getAlertSettings = () => ({ ...alertSettings });

export const getAlertValues = () => {
  const values: Record<AlertType, number> = {
    high: alertSettings.high.thresholdValue ?? alertConfig.high.defaultValue,
    low: alertSettings.low.thresholdValue ?? alertConfig.low.defaultValue,
    "very-low":
      alertSettings["very-low"].thresholdValue ??
      alertConfig["very-low"].defaultValue,
    "urgent-low":
      alertSettings["urgent-low"].thresholdValue ??
      alertConfig["urgent-low"].defaultValue,
  };
  return values;
};

export const getAlertValue = (type: AlertType) =>
  getAlertSetting(type).thresholdValue ?? alertConfig[type].defaultValue;

export const setAlertValue = (type: AlertType, value: number) => {
  setAlertSetting(type, { thresholdValue: value });
};

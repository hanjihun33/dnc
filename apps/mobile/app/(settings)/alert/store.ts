import { alertConfig, AlertType } from "./config";

const alertValues: Record<AlertType, number> = {
  high: alertConfig.high.defaultValue,
  low: alertConfig.low.defaultValue,
  "very-low": alertConfig["very-low"].defaultValue,
  "urgent-low": alertConfig["urgent-low"].defaultValue,
};

export const getAlertValue = (type: AlertType) => alertValues[type];

export const setAlertValue = (type: AlertType, value: number) => {
  alertValues[type] = value;
};

export const getAlertValues = () => ({ ...alertValues });

export const alertConfig = {
  high: {
    title: "높음",
    min: 140,
    max: 400,
    step: 5,
    defaultValue: 140,
    display: (value: number) => `${value}mg/dL 이상`,
  },
  low: {
    title: "낮음",
    min: 70,
    max: 90,
    step: 1,
    defaultValue: 70,
    display: (value: number) => `${value}mg/dL 미만`,
  },
  "very-low": {
    title: "매우 낮음",
    min: 54,
    max: 60,
    step: 1,
    defaultValue: 54,
    display: (value: number) => `${value}mg/dL 미만`,
  },
  "urgent-low": {
    title: "곧 저혈당",
    min: 90,
    max: 140,
    step: 1,
    defaultValue: 90,
    display: (value: number) =>
      `${value}mg/dL 미만에서 분당 3mg/dL로 하강 시`,
  },
} as const;

export type AlertType = keyof typeof alertConfig;

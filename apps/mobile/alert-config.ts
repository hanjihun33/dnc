export const alertConfig = {
  high: {
    title: "고혈당",
    min: 140,
    max: 400,
    step: 5,
    defaultValue: 140,
    display: (value: number) => `${value}mg/dL 이상`,
  },
  low: {
    title: "저혈당",
    min: 70,
    max: 90,
    step: 1,
    defaultValue: 70,
    display: (value: number) => `${value}mg/dL 미만`,
  },
  "very-low": {
    title: "매우 저혈당",
    min: 54,
    max: 60,
    step: 1,
    defaultValue: 54,
    display: (value: number) => `${value}mg/dL 미만`,
  },
  "urgent-low": {
    title: "급성 저혈당",
    min: 90,
    max: 140,
    step: 1,
    defaultValue: 90,
    display: (value: number) =>
      `${value}mg/dL 미만에서 분당 3mg/dL로 하락 중`,
  },
} as const;

export type AlertType = keyof typeof alertConfig;

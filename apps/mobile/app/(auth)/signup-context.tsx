import React, { createContext, useContext, useMemo, useState } from "react";

export type SignupDraft = {
  name: string;
  nickname: string;
  email: string;
  password: string;
  diabetesStatus: "none" | "prediabetes" | "type1" | "type2";
  diagnosisYear: number;
  diagnosisMonth: number;
  height: string;
  weight: string;
  gender: "male" | "female" | "none";
  birthDate: Date | null;
};

type SignupDraftContextValue = {
  draft: SignupDraft;
  updateDraft: (patch: Partial<SignupDraft>) => void;
  resetDraft: () => void;
};

const createDefaultDraft = (): SignupDraft => {
  const now = new Date();
  return {
    name: "",
    nickname: "",
    email: "",
    password: "",
    diabetesStatus: "none",
    diagnosisYear: now.getFullYear(),
    diagnosisMonth: now.getMonth() + 1,
    height: "",
    weight: "",
    gender: "none",
    birthDate: null,
  };
};

const SignupDraftContext = createContext<SignupDraftContextValue | undefined>(
  undefined
);

export function SignupDraftProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<SignupDraft>(createDefaultDraft);

  const updateDraft = (patch: Partial<SignupDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const resetDraft = () => {
    setDraft(createDefaultDraft());
  };

  const value = useMemo(
    () => ({
      draft,
      updateDraft,
      resetDraft,
    }),
    [draft]
  );

  return (
    <SignupDraftContext.Provider value={value}>
      {children}
    </SignupDraftContext.Provider>
  );
}

export function useSignupDraft() {
  const context = useContext(SignupDraftContext);
  if (!context) {
    throw new Error("useSignupDraft must be used within SignupDraftProvider");
  }
  return context;
}

import React from "react";
import { Stack } from "expo-router";

import { SignupDraftProvider } from "./_signup-context";

export default function AuthLayout() {
  return (
    <SignupDraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SignupDraftProvider>
  );
}

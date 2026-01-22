import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <Text style={styles.pageTitle}>더보기</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  page: { padding: 20, paddingTop: 40 },
  pageTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
});

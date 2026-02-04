import React from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { alertConfig, AlertType } from "@/alert-config";
import { updateAlertSetting } from "@/alert-api";
import {
  getAlertSetting,
  getAlertValue,
  setAlertSetting,
  setAlertValue,
} from "@/alert-store";

const palette = {
  background: "#FAF8F0",
  card: "#F6F1E3",
  border: "#E7E0CC",
  text: "#1F241F",
  textMuted: "#6B7466",
  accent: "#7FAF7B",
  accentInk: "#1F2A1F",
};

const ITEM_HEIGHT = 52;
const DEFAULT_INTERVAL_MINUTES = 15;

const formatInterval = (minutes: number) =>
  minutes === 60 ? "1시간" : `${minutes}분`;

export default function AlertDetailScreen() {
  const router = useRouter();
  const { type, interval } = useLocalSearchParams<{
    type?: string;
    interval?: string;
  }>();

  const routeType =
    typeof type === "string" && type in alertConfig
      ? (type as AlertType)
      : "high";
  const config = alertConfig[routeType];

  const [enabled, setEnabled] = React.useState(true);
  const [value, setValue] = React.useState(() => getAlertValue(routeType));
  const [intervalMinutes, setIntervalMinutes] =
    React.useState(DEFAULT_INTERVAL_MINUTES);
  const listRef = React.useRef<FlatList<number>>(null);

  const values = React.useMemo(() => {
    const count = Math.floor((config.max - config.min) / config.step) + 1;
    return Array.from({ length: count }, (_, index) =>
      Number((config.min + index * config.step).toFixed(2))
    );
  }, [config]);

  React.useEffect(() => {
    const storedValue = getAlertValue(routeType);
    const storedSetting = getAlertSetting(routeType);
    setEnabled(storedSetting.enabled);
    setIntervalMinutes(storedSetting.intervalMinutes);
    setValue(storedValue);
    const index = values.indexOf(storedValue);
    if (index >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: false });
      });
    }
  }, [routeType, values]);

  React.useEffect(() => {
    if (typeof interval === "string" && interval.length > 0) {
      const nextInterval = Number(interval);
      if (!Number.isNaN(nextInterval)) {
        setIntervalMinutes(nextInterval);
        setAlertSetting(routeType, { intervalMinutes: nextInterval });
        void updateAlertSetting(routeType, { intervalMinutes: nextInterval });
      }
    }
  }, [interval]);

  const currentType = routeType;
  const maxIndex = values.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.title}>{config.title}</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>알림</Text>
          <Switch
            value={enabled}
            onValueChange={(next) => {
              setEnabled(next);
              setAlertSetting(routeType, { enabled: next });
              void updateAlertSetting(routeType, { enabled: next });
            }}
            trackColor={{ false: "#E7E0CC", true: palette.accent }}
            thumbColor={enabled ? palette.accentInk : "#F6F1E3"}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>알림 혈당값</Text>
          <Text style={styles.rowValue}>{config.display(value)}</Text>
        </View>

        <View style={styles.pickerCard}>
          <View style={styles.pickerOverlay} pointerEvents="none" />
          <FlatList
            ref={listRef}
            data={values}
            keyExtractor={(item) => item.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            bounces={false}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            contentContainerStyle={styles.pickerContent}
            onMomentumScrollEnd={(event) => {
              const index = Math.min(
                maxIndex,
                Math.max(
                  0,
                  Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT)
                )
              );
              const next = values[index] ?? config.defaultValue;
              setValue(next);
              setAlertValue(routeType, next);
              void updateAlertSetting(routeType, { thresholdValue: next });
            }}
            renderItem={({ item }) => {
              const isActive = item === value;
              return (
                <View style={styles.pickerItem}>
                  <Text
                    style={[
                      styles.pickerText,
                      isActive && styles.pickerTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              );
            }}
          />
        </View>

        <View style={styles.listCard}>
          <Pressable
            style={styles.listRow}
            onPress={() =>
              router.push({
                pathname: "/(settings)/alert/interval",
                params: { type: currentType, interval: String(intervalMinutes) },
              })
            }
          >
            <Text style={styles.listTitle}>상태 지속 시 알림 간격</Text>
            <View style={styles.listValue}>
              <Text style={styles.listValueText}>
                {formatInterval(intervalMinutes)}마다
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  container: { padding: 20, paddingBottom: 40 },

  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  backIcon: { fontSize: 20, color: palette.text },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rowLabel: { color: palette.textMuted, fontSize: 14, fontWeight: "600" },
  rowValue: { color: palette.text, fontSize: 16, fontWeight: "600" },

  pickerCard: {
    marginTop: 18,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginBottom: 18,
    height: ITEM_HEIGHT * 5,
    overflow: "hidden",
  },
  pickerContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerText: {
    color: "#9BA28F",
    fontSize: 18,
    fontWeight: "600",
  },
  pickerTextActive: {
    color: "#1E293B",
    fontSize: 26,
    fontWeight: "700",
  },
  pickerOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderRadius: 16,
    backgroundColor: "rgba(31, 36, 31, 0.08)",
  },

  listCard: {
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 6,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  listTitle: { color: palette.text, fontSize: 15, fontWeight: "600" },
  listValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  listValueText: { color: palette.textMuted, fontSize: 13, marginRight: 6 },
  chevron: { color: palette.textMuted, fontSize: 18 },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: 10,
  },
});

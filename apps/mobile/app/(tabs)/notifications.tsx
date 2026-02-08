import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuthHeaders, loadAuthSession } from "@/session";

const palette = {
  background: "#F4E8D6",
  card: "#F8F0E1",
  text: "#2F3B30",
  textMuted: "#6F7A6A",
  border: "#E6DCC6",
  accent: "#2F6B4F",
  ink: "#233327",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type NotificationItem = {
  notificationId: number;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
};

const formatNotificationTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true); // Initial load
  const [isLoadingMore, setIsLoadingMore] = React.useState(false); // Pagination load
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);

  const fetchNotifications = React.useCallback(async (targetPage: number, isRefresh = false) => {
    if (!isRefresh && targetPage === 0) {
      setIsLoading(true);
    }
    if (targetPage > 0) {
      setIsLoadingMore(true);
    }
    setErrorMessage(null);
    try {
      await loadAuthSession();
      // Assuming backend supports ?page=0&size=20
      const response = await fetch(
        `${API_BASE_URL}/api/v1/users/me/notifications?page=${targetPage}&size=20`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        throw new Error("알림을 불러오지 못했어요.");
      }
      const data = (await response.json()) as NotificationItem[];

      if (data.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setItems((prev) => {
        if (isRefresh || targetPage === 0) return data;
        // Simple de-duplication based on ID
        const existingIds = new Set(prev.map(i => i.notificationId));
        const newItems = data.filter(i => !existingIds.has(i.notificationId));
        return [...prev, ...newItems];
      });
      setPage(targetPage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알림을 불러오지 못했어요.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Reset and load first page on focus
      setPage(0);
      setHasMore(true);
      void fetchNotifications(0, true);
    }, [fetchNotifications])
  );

  const handleRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    void fetchNotifications(0, true);
  }, [fetchNotifications]);

  const loadMore = React.useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    void fetchNotifications(page + 1);
  }, [fetchNotifications, hasMore, isLoadingMore, isLoading, page]);

  const handleMarkRead = React.useCallback(async (item: NotificationItem) => {
    if (item.readAt) {
      return;
    }
    try {
      await loadAuthSession();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/users/me/notifications/${item.notificationId}/read`,
        { method: "PATCH", headers: getAuthHeaders() }
      );
      if (!response.ok) {
        throw new Error("읽음 처리에 실패했어요.");
      }
      const updated = (await response.json()) as NotificationItem;
      setItems((prev) =>
        prev.map((entry) =>
          entry.notificationId === item.notificationId
            ? {
              ...entry,
              readAt: updated.readAt ?? new Date().toISOString(),
            }
            : entry
        )
      );
    } catch {
      // Ignore read errors for now.
    }
  }, []);

  const handleMarkAllRead = React.useCallback(async () => {
    if (isMarkingAll) {
      return;
    }
    const hasUnread = items.some((item) => !item.readAt);
    if (!hasUnread) {
      return;
    }
    setIsMarkingAll(true);
    try {
      await loadAuthSession();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/users/me/notifications/read-all`,
        { method: "PATCH", headers: getAuthHeaders() }
      );
      if (!response.ok) {
        throw new Error("읽음 처리에 실패했어요.");
      }
      const nowIso = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          readAt: item.readAt ?? nowIso,
        }))
      );
    } catch {
      // Ignore errors for now.
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, items]);

  const unreadCount = React.useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items]
  );

  const headerTop = Math.max(12, insets.top + 8);

  const renderItem = React.useCallback(
    ({ item }: { item: NotificationItem }) => {
      const isUnread = !item.readAt;
      return (
        <TouchableOpacity
          style={[styles.card, isUnread && styles.cardUnread]}
          onPress={() => handleMarkRead(item)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title ?? "알림"}</Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.cardDesc}>{item.body ?? ""}</Text>
          <Text style={styles.cardTime}>
            {formatNotificationTime(item.createdAt)}
          </Text>
        </TouchableOpacity>
      );
    },
    [handleMarkRead]
  );

  const ListEmptyComponent = React.useMemo(() => {
    if (isLoading) return null;
    if (errorMessage) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      );
    }
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>아직 받은 알림이 없어요</Text>
        <Text style={styles.cardDesc}>
          혈당 측정, 식단 기록 등 중요한 업데이트가 생기면 알려드릴게요.
        </Text>
      </View>
    );
  }, [isLoading, errorMessage]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: headerTop, paddingHorizontal: 20 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.title}>알림 센터</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllRead}
              disabled={isMarkingAll}
            >
              <Text style={styles.markAllText}>모두 읽음</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && page === 0 ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color={palette.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.notificationId)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={palette.accent}
            />
          }
          ListEmptyComponent={ListEmptyComponent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={palette.accent} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12, // Gap support for FlatList (React Native 0.71+)
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(127, 175, 123, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: palette.text },
  headerActions: {
    minWidth: 72,
    alignItems: "flex-end",
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(127, 175, 123, 0.2)",
  },
  markAllText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardUnread: {
    borderColor: "rgba(47, 107, 79, 0.45)",
    backgroundColor: "#F3EBDD",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.accent,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
    flex: 1,
    marginRight: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: palette.textMuted,
    lineHeight: 18,
  },
  cardTime: {
    marginTop: 10,
    fontSize: 12,
    color: palette.textMuted,
  },
  stateBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#B4534B",
    fontSize: 13,
  },
});

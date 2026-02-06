import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const palette = {
    panel: '#F8F0E1',
    card: '#F1E8D8',
    text: '#1F241F',
    textMuted: '#6B7466',
    border: '#E5D9C4',
};

interface TimelineModalProps {
    visible: boolean;
    onClose: () => void;
    history: any[]; // DailyReportResponse[]
}

export const TimelineHistoryModal = ({ visible, onClose, history }: TimelineModalProps) => {
    const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());
    const slideAnim = useRef(new Animated.Value(600)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                friction: 8,
                tension: 40
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 600,
                duration: 250,
                useNativeDriver: true
            }).start();
        }
    }, [visible, slideAnim]);

    const toggleExpand = (id: number) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>지난 리포트 기록</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={palette.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Report List */}
                    <FlatList
                        data={history}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item, index }) => {
                            const date = new Date(item.targetDate);
                            const dateStr = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
                            const isExpanded = expandedItems.has(item.id);

                            // 센서 기준 일차 계산 (최신이 1일차)
                            const dayNumber = history.length - index;

                            // 점수에 따른 색상
                            const getScoreColor = (score: number) => {
                                if (score >= 80) return '#22C55E'; // Green
                                if (score >= 60) return '#FACC15'; // Yellow
                                return '#F87171'; // Red
                            };

                            return (
                                <View style={styles.cardItem}>
                                    {/* Header Row: Score + Date + Expand Button */}
                                    <View style={styles.itemHeader}>
                                        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.healthScore) }]}>
                                            <Text style={styles.scoreText}>{item.healthScore}점</Text>
                                        </View>

                                        <View style={styles.dateContainer}>
                                            <Text style={styles.itemDate}>{dateStr} 요약</Text>
                                            <Text style={styles.dayCounter}>{dayNumber}일차</Text>
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => toggleExpand(item.id)}
                                            style={styles.expandBtn}
                                        >
                                            <Text style={styles.expandText}>
                                                {isExpanded ? '접기' : '더보기'}
                                            </Text>
                                            <Ionicons
                                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                size={14}
                                                color={palette.textMuted}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Summary (only shown when expanded) */}
                                    {isExpanded && (
                                        <Text style={styles.itemSummary}>
                                            {item.summaryText}
                                        </Text>
                                    )}
                                </View>
                            );
                        }}
                    />
                </Animated.View>
            </View>
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(31,36,31,0.38)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: palette.panel,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingTop: 24,
        borderWidth: 1,
        borderColor: palette.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        paddingBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: palette.text,
    },
    closeBtn: {
        padding: 4,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    cardItem: {
        backgroundColor: palette.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: palette.border,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    scoreBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    scoreText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dateContainer: {
        flexDirection: 'column',
        flex: 1,
    },
    itemDate: {
        fontSize: 14,
        fontWeight: '700',
        color: palette.text,
    },
    dayCounter: {
        fontSize: 12,
        fontWeight: '600',
        color: palette.textMuted,
        marginTop: 2,
    },
    itemSummary: {
        fontSize: 14,
        color: palette.text,
        lineHeight: 20,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: palette.border,
    },
    expandBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    expandText: {
        fontSize: 12,
        color: palette.textMuted,
        fontWeight: '600',
    },
});

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimelineModalProps {
    visible: boolean;
    onClose: () => void;
    history: any[]; // DailyReportResponse[]
}

export const TimelineHistoryModal = ({ visible, onClose, history }: TimelineModalProps) => {
    const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());

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
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>지난 리포트 기록</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
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
                                                color="#64748B"
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
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingTop: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    closeBtn: {
        padding: 4,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    cardItem: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
        color: '#475569',
    },
    dayCounter: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 2,
    },
    itemSummary: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
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
        color: '#64748B',
        fontWeight: '600',
    },
});

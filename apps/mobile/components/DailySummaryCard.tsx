import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const palette = {
    card: '#F8F0E1',
    border: '#E5D9C4',
    text: '#1F241F',
    textMuted: '#6B7466',
    contentBg: '#F1E8D8',
};

interface DailyReportProps {
    report: {
        healthScore: number;
        summaryText: string;
        targetDate: string;
        reportType: string;
        dayCount?: number;
    };
    onPressHistory: () => void;
}

export const DailySummaryCard = ({ report, onPressHistory }: DailyReportProps) => {
    if (!report) return null;

    // 점수에 따른 색상/이모지
    const getScoreInfo = (score: number) => {
        if (score >= 80) return { color: '#22C55E', icon: 'happy', label: '훌륭해요!' }; // Green
        if (score >= 60) return { color: '#FACC15', icon: 'navigate', label: '좋아요' };   // Yellow
        return { color: '#F87171', icon: 'warning', label: '노력필요' };        // Red
    };

    const scoreInfo = getScoreInfo(report.healthScore);
    const dateStr = new Date(report.targetDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

    return (
        <View style={styles.card}>
            {/* Header: Score & Date */}
            <View style={styles.header}>
                <View style={styles.scoreContainer}>
                    <View style={[styles.scoreBadge, { backgroundColor: scoreInfo.color }]}>
                        <Ionicons name={scoreInfo.icon as any} size={16} color="#fff" />
                        <Text style={styles.scoreText}>{report.healthScore}점</Text>
                    </View>
                    <Text style={styles.dateText}>{dateStr} 요약</Text>
                    <Text style={styles.dayCounter}>{report.dayCount ? `${report.dayCount}일차` : '1일차'}</Text>
                </View>
                <TouchableOpacity onPress={onPressHistory} style={styles.moreBtn}>
                    <Text style={styles.moreText}>더보기</Text>
                    <Ionicons name="chevron-forward" size={14} color={palette.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Content: Summary */}
            <View style={styles.content}>
                <Text style={styles.summaryText}>
                    {report.summaryText}
                </Text>
            </View>

            {/* AI Disclaimer Footer */}
            <View style={styles.aiFooter}>
                <View style={styles.aiPulse} />
                <Text style={styles.aiFooterText}>
                    AI가 생성한 개인 맞춤 가이드입니다.
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: palette.card,
        borderRadius: 20,
        padding: 20,
        marginVertical: 10,
        shadowColor: "#1F241F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: palette.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        gap: 4,
    },
    scoreText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    dateText: {
        fontSize: 15,
        fontWeight: '600',
        color: palette.text,
    },
    dayCounter: {
        fontSize: 13,
        fontWeight: '600',
        color: palette.textMuted,
    },
    moreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    moreText: {
        fontSize: 13,
        color: palette.textMuted,
        marginRight: 2,
    },
    content: {
        backgroundColor: palette.contentBg,
        padding: 16,
        borderRadius: 12,
    },
    summaryText: {
        fontSize: 15,
        color: palette.text,
        lineHeight: 24,
    },
    aiFooter: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },
    aiPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4E7C5B',
        shadowColor: '#4E7C5B',
        shadowOpacity: 0.8,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
    },
    aiFooterText: {
        color: 'rgba(107, 116, 102, 0.9)',
        fontSize: 12,
        fontWeight: '600',
    },
});

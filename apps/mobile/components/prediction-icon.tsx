import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

export const PredictionIcon = () => {
  const [dataPoints] = React.useState([50, 55, 58, 62, 68, 70, 75, 78, 82]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const createPath = () => {
    let path = `M 30 ${90 - dataPoints[0] * 0.6}`;
    for (let i = 1; i < dataPoints.length; i++) {
      const x = 30 + (i * 11);
      const y = 90 - dataPoints[i] * 0.6;
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  return (
    <View style={styles.container}>
      <Svg width={140} height={140} viewBox="0 0 140 140">
        <Defs>
          <LinearGradient id="predGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FFC107" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FF9800" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FF5722" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="predAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFC107" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#FF5722" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* 차트 배경 */}
        <Rect 
          x="15" y="25" width="110" height="70" 
          rx="8" 
          fill="#FFFFFF" 
          stroke="#FFE0B2" 
          strokeWidth="2" 
        />

        {/* 그리드 */}
        <Line x1="20" y1="40" x2="120" y2="40" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.5" />
        <Line x1="20" y1="55" x2="120" y2="55" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.5" />
        <Line x1="20" y1="70" x2="120" y2="70" stroke="#FF9800" strokeWidth="1" opacity="0.3" />
        <Line x1="20" y1="85" x2="120" y2="85" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.5" />

        {/* 세로 그리드 */}
        <Line x1="40" y1="30" x2="40" y2="90" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.3" />
        <Line x1="60" y1="30" x2="60" y2="90" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.3" />
        <Line x1="80" y1="30" x2="80" y2="90" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.3" />
        <Line x1="100" y1="30" x2="100" y2="90" stroke="#FFE0B2" strokeWidth="0.5" opacity="0.3" />

        {/* 예측 영역 */}
        <Path
          d={createPath() + ` L 120 90 L 30 90 Z`}
          fill="url(#predAreaGrad)"
        />

        {/* 예측 라인 */}
        <Path
          d={createPath()}
          stroke="url(#predGrad)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 예측 포인트 (마지막) */}
        <Circle
          cx={30 + (dataPoints.length - 1) * 11}
          cy={90 - dataPoints[dataPoints.length - 1] * 0.6}
          r="5"
          fill="#FF5722"
          opacity="1"
        />
        <Circle
          cx={30 + (dataPoints.length - 1) * 11}
          cy={90 - dataPoints[dataPoints.length - 1] * 0.6}
          r="8"
          fill="none"
          stroke="#FF5722"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* 화살표 (상승 트렌드) */}
        <Path
          d="M 95 32 L 95 42"
          stroke="#FF5722"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Path
          d="M 95 32 L 90 37"
          stroke="#FF5722"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <Path
          d="M 95 32 L 100 37"
          stroke="#FF5722"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
});

export default PredictionIcon;

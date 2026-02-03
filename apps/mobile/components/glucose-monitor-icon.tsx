import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';

export const GlucoseMonitorIcon = () => {
  const [dataPoints, setDataPoints] = useState<number[]>([55, 52, 58, 50, 54, 60, 55, 52, 58]);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 스크롤 애니메이션
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // 데이터 포인트 업데이트
    const interval = setInterval(() => {
      setDataPoints(prev => {
        const newPoints = [...prev.slice(1)];
        newPoints.push(45 + Math.random() * 20);
        return newPoints;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [scrollX]);

  // 경로 생성
  const createPath = () => {
    let path = `M 30 ${dataPoints[0]}`;
    for (let i = 1; i < dataPoints.length; i++) {
      const x = 30 + (i * 10);
      const y = dataPoints[i];
      path += ` L ${x} ${y}`;
    }
    return path;
  };

  return (
    <View style={styles.container}>
      <Svg width={200} height={200} viewBox="0 0 140 140">
        <Defs>
          <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#00E676" stopOpacity="1" />
            <Stop offset="50%" stopColor="#00BCD4" stopOpacity="1" />
            <Stop offset="100%" stopColor="#1E88E5" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#00E676" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#1E88E5" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* 차트 배경 틀 */}
        <Rect 
          x="15" y="25" width="110" height="90" 
          rx="8" 
          fill="#FFFFFF" 
          stroke="#E3F2FD" 
          strokeWidth="2" 
        />

        {/* 그리드 배경 (연한) */}
        <Line x1="20" y1="40" x2="120" y2="40" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.5" />
        <Line x1="20" y1="55" x2="120" y2="55" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.5" />
        <Line x1="20" y1="70" x2="120" y2="70" stroke="#1E88E5" strokeWidth="1" opacity="0.3" />
        <Line x1="20" y1="85" x2="120" y2="85" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.5" />
        <Line x1="20" y1="100" x2="120" y2="100" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.5" />

        {/* 세로 그리드 */}
        <Line x1="40" y1="30" x2="40" y2="110" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.3" />
        <Line x1="60" y1="30" x2="60" y2="110" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.3" />
        <Line x1="80" y1="30" x2="80" y2="110" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.3" />
        <Line x1="100" y1="30" x2="100" y2="110" stroke="#E3F2FD" strokeWidth="0.5" opacity="0.3" />

        {/* 라인 아래 그라디언트 영역 */}
        <Path
          d={createPath() + ` L 120 110 L 30 110 Z`}
          fill="url(#areaGrad)"
        />

        {/* 혈당 라인 (메인) */}
        <Path
          d={createPath()}
          stroke="url(#lineGrad)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 펄스 포인트 (마지막 점) */}
        <Circle
          cx={30 + (dataPoints.length - 1) * 10}
          cy={dataPoints[dataPoints.length - 1]}
          r="4"
          fill="#00E676"
          opacity="1"
        />
        <Circle
          cx={30 + (dataPoints.length - 1) * 10}
          cy={dataPoints[dataPoints.length - 1]}
          r="7"
          fill="none"
          stroke="#00E676"
          strokeWidth="2"
          opacity="0.4"
        />
        <Circle
          cx={30 + (dataPoints.length - 1) * 10}
          cy={dataPoints[dataPoints.length - 1]}
          r="10"
          fill="none"
          stroke="#00E676"
          strokeWidth="1"
          opacity="0.2"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
});

export default GlucoseMonitorIcon;

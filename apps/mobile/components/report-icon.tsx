import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

export const ReportIcon = () => {
  const [animationStep, setAnimationStep] = useState(0);
  const [lineProgress, setLineProgress] = useState(0);
  const [barProgress, setBarProgress] = useState(0);

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    
    const runAnimation = () => {
      // Clear any existing timeouts
      timeouts.forEach(t => clearTimeout(t));
      timeouts = [];
      
      // Reset
      setAnimationStep(0);
      setLineProgress(0);
      setBarProgress(0);
      
      // Document appears
      timeouts.push(setTimeout(() => setAnimationStep(1), 200));
      
      // Lines appear one by one
      timeouts.push(setTimeout(() => setLineProgress(1), 800));
      timeouts.push(setTimeout(() => setLineProgress(2), 1300));
      timeouts.push(setTimeout(() => setLineProgress(3), 1800));
      
      // Chart appears
      timeouts.push(setTimeout(() => setAnimationStep(2), 2200));
      
      // Bars appear one by one
      timeouts.push(setTimeout(() => setBarProgress(1), 2400));
      timeouts.push(setTimeout(() => setBarProgress(2), 2550));
      timeouts.push(setTimeout(() => setBarProgress(3), 2700));
      timeouts.push(setTimeout(() => setBarProgress(4), 2850));
      timeouts.push(setTimeout(() => setBarProgress(5), 3000));
      
      // Check mark appears
      timeouts.push(setTimeout(() => setAnimationStep(3), 3700));
      
      // Restart animation
      timeouts.push(setTimeout(() => runAnimation(), 5200));
    };
    
    runAnimation();
    
    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, []);

  const barHeights = [30, 40, 35, 50, 45];
  const documentVisible = animationStep >= 1;
  const chartVisible = animationStep >= 2;
  const checkVisible = animationStep >= 3;

  return (
    <View style={styles.container}>
      <View style={{ 
        opacity: documentVisible ? 1 : 0,
        transform: [{ scale: documentVisible ? 1 : 0.8 }]
      }}>
        <Svg width={200} height={200} viewBox="0 0 140 140">
          <Defs>
            <LinearGradient id="docGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="100%" stopColor="#F5F7FA" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#1E88E5" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0D47A1" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Document/Paper */}
          <Rect 
            x="25" y="20" width="90" height="100" 
            rx="6" 
            fill="url(#docGrad)" 
            stroke="#E3F2FD"
            strokeWidth="2"
          />
          
          {/* Document fold corner */}
          <Path 
            d="M 115 20 L 115 32 L 103 20 Z" 
            fill="#E3F2FD" 
          />
          
          {/* Header bar */}
          <Rect 
            x="25" y="20" width="90" height="20" 
            rx="6" 
            fill="#0D47A1"
          />
          <Rect 
            x="25" y="30" width="90" height="10" 
            fill="#0D47A1"
          />

          {/* Text lines with typing effect */}
          {lineProgress >= 1 && (
            <Rect 
              x="32" 
              y="48" 
              width="60"
              height="3" 
              fill="#616161"
              opacity="0.5"
            />
          )}
          {lineProgress >= 2 && (
            <Rect 
              x="32" 
              y="55" 
              width="70"
              height="3" 
              fill="#616161"
              opacity="0.5"
            />
          )}
          {lineProgress >= 3 && (
            <Rect 
              x="32" 
              y="62" 
              width="50"
              height="3" 
              fill="#616161"
              opacity="0.5"
            />
          )}

          {/* Chart area */}
          {chartVisible && (
            <>
              {/* Chart background */}
              <Rect 
                x="32" y="72" width="76" height="38" 
                rx="4" 
                fill="#F5F7FA"
                stroke="#E0E0E0"
                strokeWidth="1"
              />
              
              {/* Baseline */}
              <Line x1="35" y1="106" x2="105" y2="106" stroke="#BDBDBD" strokeWidth="1" />
              
              {/* Bars */}
              {barHeights.map((height, index) => {
                const x = 38 + index * 14;
                const visible = barProgress > index;
                const animatedHeight = visible ? height : 0;
                
                return (
                  <Rect
                    key={index}
                    x={x}
                    y={106 - animatedHeight}
                    width="10"
                    height={animatedHeight}
                    rx="2"
                    fill="url(#barGrad)"
                  />
                );
              })}
            </>
          )}

          {/* Check mark (completion) */}
          {checkVisible && (
            <>
              {/* Circle background */}
              <Circle 
                cx="70" 
                cy="90" 
                r="12" 
                fill="#4CAF50"
              />
              {/* Check mark */}
              <Path 
                d="M 65 90 L 68 93 L 75 86" 
                stroke="#FFFFFF" 
                strokeWidth="3" 
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </>
          )}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReportIcon;

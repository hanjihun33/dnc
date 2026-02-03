import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect, Circle, Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

export const FoodLensIcon = () => {
  // Animation Values
  const foodOpacity = useRef(new Animated.Value(0)).current;
  const foodScale = useRef(new Animated.Value(0.5)).current;
  
  const flashOpacity = useRef(new Animated.Value(0)).current;
  
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.8)).current;

  const focusScale = useRef(new Animated.Value(1.3)).current;
  const focusOpacity = useRef(new Animated.Value(0)).current;
  
  // Chart progress state (0-7 for 7 data points)
  const [chartProgress, setChartProgress] = useState(0);

  useEffect(() => {
    const sequence = Animated.sequence([
      // 1. Reset
      Animated.parallel([
        Animated.timing(foodOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(resultOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(focusOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
      Animated.delay(200),

      // 2. Food Enters (Bounce)
      Animated.parallel([
        Animated.timing(foodOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(foodScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      
      Animated.delay(800),

      // 3. Focus/Scan (Camera locking on)
      Animated.parallel([
        Animated.timing(focusOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(focusScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),

      Animated.delay(400),

      // 4. Flash / Snap
      Animated.parallel([
        // Flash Effect
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.9, duration: 150, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        // Transition: Food Out, Result In
        Animated.sequence([
             Animated.delay(200),
             Animated.parallel([
                Animated.timing(foodOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(focusOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(resultOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.spring(resultScale, { toValue: 1, friction: 9, useNativeDriver: true }),
             ])
        ])
      ]),

      // 5. Show Result Chart
      Animated.delay(2100),
      
      // 6. Fade Out Result
       Animated.timing(resultOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
       
       Animated.delay(100),
    ]);

    Animated.loop(sequence).start();
  }, [foodOpacity, foodScale, focusOpacity, focusScale, flashOpacity, resultOpacity, resultScale]);
  
  // Chart animation triggered by resultOpacity
  useEffect(() => {
    let chartTimer: ReturnType<typeof setTimeout> | null = null;
    let isAnimating = false;
    
    const listener = resultOpacity.addListener(({ value }) => {
      // Start chart animation when result is fully visible
      if (value > 0.95 && !isAnimating) {
        isAnimating = true;
        setChartProgress(0);
        
        let count = 0;
        chartTimer = setInterval(() => {
          count++;
          setChartProgress(count);
          if (count >= 7) {
            if (chartTimer) clearInterval(chartTimer);
            chartTimer = null;
          }
        }, 200);
      }
      // Reset when result fades out
      else if (value < 0.05 && isAnimating) {
        isAnimating = false;
        if (chartTimer) {
          clearInterval(chartTimer);
          chartTimer = null;
        }
        setChartProgress(0);
      }
    });
    
    return () => {
      resultOpacity.removeListener(listener);
      if (chartTimer) clearInterval(chartTimer);
    };
  }, [resultOpacity]);

  return (
    <View style={styles.container}>
      {/* Layer 1: Food Icon (Burger) */}
      <Animated.View style={[styles.layer, { opacity: foodOpacity, transform: [{ scale: foodScale }] }]}>
        <Svg width={200} height={200} viewBox="0 0 140 140">
          <Defs>
            <LinearGradient id="bunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFB74D" stopOpacity="1" />
              <Stop offset="100%" stopColor="#F57C00" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="pattyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#8D6E63" stopOpacity="1" />
              <Stop offset="100%" stopColor="#5D4037" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          {/* Bottom Bun */}
          <Path d="M35 85 Q70 100 105 85 L105 80 L35 80 Z" fill="url(#bunGrad)" />
          
          {/* Patty */}
          <Rect x="35" y="72" width="70" height="10" rx="3" fill="url(#pattyGrad)" />
          
          {/* Cheese */}
          <Path d="M35 72 L105 72 L105 76 L90 80 L70 76 L50 80 L35 76 Z" fill="#FFC107" />
          
          {/* Lettuce */}
          <Path d="M30 68 Q40 64 50 68 T70 68 T90 68 T110 68 L110 72 L30 72 Z" fill="#66BB6A" />
          
          {/* Tomato */}
          <Rect x="40" y="60" width="60" height="8" rx="2" fill="#FF5252" />
          
          {/* Top Bun */}
          <Path d="M35 60 Q70 30 105 60 Z" fill="url(#bunGrad)" />
          
          {/* Seeds */}
          <Circle cx="55" cy="48" r="1.5" fill="#FFE0B2" />
          <Circle cx="70" cy="42" r="1.5" fill="#FFE0B2" />
          <Circle cx="85" cy="48" r="1.5" fill="#FFE0B2" />
          <Circle cx="65" cy="52" r="1.5" fill="#FFE0B2" />
          <Circle cx="75" cy="52" r="1.5" fill="#FFE0B2" />
        </Svg>
      </Animated.View>

      {/* Layer 2: Camera Focus Overlay */}
      <Animated.View style={[styles.layer, { opacity: focusOpacity, transform: [{ scale: focusScale }] }]}>
        <Svg width={200} height={200} viewBox="0 0 140 140">
           {/* Camera Frame Border */}
           <Rect 
             x="25" y="25" width="90" height="90" 
             rx="4"
             fill="none"
             stroke="#212121" 
             strokeWidth="2.5"
             opacity="0.8"
           />
           
           {/* Focus Corners */}
           {/* Top Left */}
           <Path d="M30 50 L30 30 L50 30" stroke="#212121" strokeWidth="3" fill="none" />
           {/* Top Right */}
           <Path d="M110 50 L110 30 L90 30" stroke="#212121" strokeWidth="3" fill="none" />
           {/* Bottom Left */}
           <Path d="M30 90 L30 110 L50 110" stroke="#212121" strokeWidth="3" fill="none" />
           {/* Bottom Right */}
           <Path d="M110 90 L110 110 L90 110" stroke="#212121" strokeWidth="3" fill="none" />
           
           {/* Center Crosshair */}
           <Line x1="60" y1="70" x2="80" y2="70" stroke="#212121" strokeWidth="2" />
           <Line x1="70" y1="60" x2="70" y2="80" stroke="#212121" strokeWidth="2" />
           <Circle cx="70" cy="70" r="15" fill="none" stroke="#212121" strokeWidth="1.5" />
        </Svg>
      </Animated.View>

      {/* Layer 3: Result Prediction Chart */}
      <Animated.View style={[styles.layer, { opacity: resultOpacity, transform: [{ scale: resultScale }] }]}>
         <Svg width={200} height={200} viewBox="0 0 140 140">
            <Defs>
              <LinearGradient id="predGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#00E676" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#00E676" stopOpacity="0.1" />
              </LinearGradient>
            </Defs>

            {/* Background Card */}
            <Rect 
              x="20" y="30" width="100" height="80" 
              rx="8" 
              fill="#FFFFFF" 
              stroke="#E3F2FD"
              strokeWidth="2"
            />
            
            {/* Chart Grid */}
            <Line x1="25" y1="90" x2="115" y2="90" stroke="#E0E0E0" strokeWidth="1" />
            <Line x1="25" y1="70" x2="115" y2="70" stroke="#F5F5F5" strokeWidth="1" />
            <Line x1="25" y1="50" x2="115" y2="50" stroke="#F5F5F5" strokeWidth="1" />

            {/* Progressive Prediction Area */}
            {chartProgress >= 2 && (
              <Path 
                d={getProgressivePath(chartProgress, true)} 
                fill="url(#predGrad)" 
              />
            )}
            
            {/* Progressive Prediction Line */}
            {chartProgress >= 2 && (
              <Path 
                d={getProgressivePath(chartProgress, false)} 
                stroke="#00C853" 
                strokeWidth="3" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            )}

            {/* Indicator Dot - only show when complete */}
            {chartProgress >= 7 && (
              <Circle cx="115" cy="45" r="4" fill="#00C853" stroke="white" strokeWidth="1.5" />
            )}
         </Svg>
      </Animated.View>

      {/* Layer 4: Flash Effect */}
      <Animated.View 
        style={[
          styles.layer, 
          styles.flash, 
          { opacity: flashOpacity }
        ]} 
      />
    </View>
  );
};

// Helper function to generate progressive path based on chartProgress (0-7)
const getProgressivePath = (progress: number, isArea: boolean): string => {
  const points = [
    { x: 25, y: 90 },
    { x: 40, y: 85 },
    { x: 55, y: 70 },
    { x: 70, y: 60 },
    { x: 85, y: 65 },
    { x: 100, y: 50 },
    { x: 115, y: 45 }
  ];
  
  const visiblePoints = points.slice(0, Math.min(progress, 7));
  
  if (visiblePoints.length < 2) return "";
  
  let path = `M${visiblePoints[0].x} ${visiblePoints[0].y}`;
  
  for (let i = 1; i < visiblePoints.length; i++) {
    path += ` L${visiblePoints[i].x} ${visiblePoints[i].y}`;
  }
  
  // Add closing path for area
  if (isArea && visiblePoints.length > 0) {
    const lastPoint = visiblePoints[visiblePoints.length - 1];
    path += ` L${lastPoint.x} 90 Z`;
  }
  
  return path;
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flash: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    height: '100%',
  }
});

export default FoodLensIcon;

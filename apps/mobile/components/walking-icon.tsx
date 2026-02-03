import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export const WalkingIcon = () => {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [legState, setLegState] = useState(0); // -1, 0, 1 for leg positions

  useEffect(() => {
    // Walking position animation using setInterval
    const walkInterval = setInterval(() => {
      setPosition(prev => {
        const newPos = prev + direction * 2;
        if (newPos >= 80) {
          setDirection(-1);
          return 80;
        }
        if (newPos <= 0) {
          setDirection(1);
          return 0;
        }
        return newPos;
      });
    }, 50);

    // Leg animation
    const legInterval = setInterval(() => {
      setLegState(prev => {
        if (prev === 0) return 1;
        if (prev === 1) return -1;
        return 0;
      });
    }, 400);

    return () => {
      clearInterval(walkInterval);
      clearInterval(legInterval);
    };
  }, [direction]);

  return (
    <View style={styles.container}>
      {/* Background scene */}
      <Svg width={200} height={200} viewBox="0 0 140 140">
        <Defs>
          <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#E3F2FD" stopOpacity="1" />
            <Stop offset="100%" stopColor="#BBDEFB" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Sky background */}
        <Rect x="0" y="0" width="140" height="100" fill="url(#skyGrad)" />
        
        {/* Ground */}
        <Rect x="0" y="100" width="140" height="40" fill="#81C784" />
        <Rect x="0" y="95" width="140" height="5" fill="#66BB6A" />
        
        {/* Path/Road */}
        <Path 
          d="M 0 110 L 140 110" 
          stroke="#8D6E63" 
          strokeWidth="15" 
          strokeLinecap="round"
        />
        <Path 
          d="M 0 110 L 140 110" 
          stroke="#A1887F" 
          strokeWidth="12" 
          strokeLinecap="round"
        />
        
        {/* Dashed line on road */}
        <Path 
          d="M 10 110 L 30 110 M 50 110 L 70 110 M 90 110 L 110 110" 
          stroke="#FFFFFF" 
          strokeWidth="2" 
          strokeLinecap="round"
          opacity="0.6"
        />
        
        {/* Sun */}
        <Circle cx="120" cy="20" r="12" fill="#FFC107" opacity="0.9" />
        
        {/* Clouds */}
        <Circle cx="30" cy="25" r="8" fill="#FFFFFF" opacity="0.7" />
        <Circle cx="38" cy="25" r="10" fill="#FFFFFF" opacity="0.7" />
        <Circle cx="45" cy="25" r="8" fill="#FFFFFF" opacity="0.7" />
        
        <Circle cx="80" cy="35" r="6" fill="#FFFFFF" opacity="0.6" />
        <Circle cx="86" cy="35" r="8" fill="#FFFFFF" opacity="0.6" />
        <Circle cx="92" cy="35" r="6" fill="#FFFFFF" opacity="0.6" />
        
        {/* Walking character */}
        <Svg x={30 + position} y={90} width={40} height={60} viewBox="0 0 40 60">
          {/* Head */}
          <Circle cx="20" cy="12" r="8" fill="#FFB74D" />
          
          {/* Body */}
          <Rect x="16" y="20" width="8" height="20" rx="3" fill="#0D47A1" />
          
          {/* Arms */}
          <Rect 
            x="12" 
            y="22" 
            width="4" 
            height="14" 
            rx="2" 
            fill="#1565C0"
            transform={legState === 1 ? "rotate(-15 14 22)" : legState === -1 ? "rotate(15 14 22)" : ""}
          />
          <Rect 
            x="24" 
            y="22" 
            width="4" 
            height="14" 
            rx="2" 
            fill="#1565C0"
            transform={legState === 1 ? "rotate(15 26 22)" : legState === -1 ? "rotate(-15 26 22)" : ""}
          />
          
          {/* Legs */}
          <Rect 
            x="16" 
            y="40" 
            width="4" 
            height="18" 
            rx="2" 
            fill="#424242"
            transform={legState === 1 ? "rotate(15 18 40)" : legState === -1 ? "rotate(-15 18 40)" : ""}
          />
          <Rect 
            x="20" 
            y="40" 
            width="4" 
            height="18" 
            rx="2" 
            fill="#424242"
            transform={legState === 1 ? "rotate(-15 22 40)" : legState === -1 ? "rotate(15 22 40)" : ""}
          />
        </Svg>
      </Svg>
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

export default WalkingIcon;

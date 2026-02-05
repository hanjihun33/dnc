import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GlucoseMonitorIcon } from "@/components/glucose-monitor-icon";
import { FoodLensIcon } from "@/components/food-lens-icon";
import { PredictionIcon } from "@/components/prediction-icon";
import { ReportIcon } from "@/components/report-icon";

const { width } = Dimensions.get("window");

const palette = {
  background: "#FAF8F0",
  card: "#F6F1E3",
  text: "#1F241F",
  textMuted: "#6B7466",
  border: "#E7E0CC",
  accent: "#4E7C5B",
  accentSoft: "#7FAF7B",
  ink: "#1F2A1F",
};

const waveFrames = [
  require("@/assets/images/dnc1.png"),
  require("@/assets/images/dnc2.png"),
  require("@/assets/images/dnc3.png"),
];

const OnboardingScreen = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [waveFrame, setWaveFrame] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    if (activeIndex !== 0) {
      setWaveFrame(0);
      return;
    }
    const timer = setInterval(() => {
      setWaveFrame((prev) => (prev + 1) % waveFrames.length);
    }, 400);
    return () => clearInterval(timer);
  }, [activeIndex]);

  const saveOnboardingComplete = async () => {
    const currentVersion = Constants.expoConfig?.version ?? "1.0.0";
    await AsyncStorage.multiSet([
      ["onboarding_completed", "true"],
      ["onboarding_version", currentVersion],
    ]);
  };

  const slides = [
    {
      id: 1,
      title: "환영합니다!",
      description: "건강한 혈당 관리를 위한 모든 것을\n당낭콩에서 시작하세요",
      icon: waveFrames[waveFrame],
      useImage: true,
      buttonText: "다음",
    },
    {
      id: 2,
      title: "CGM 연동 모니터링",
      description: "24시간 혈당을 관찰하고\n안정적인 관리를 시작하세요",
      icon: null,
      useImage: false,
      componentType: "glucose",
      buttonText: "다음",
    },
    {
      id: 3,
      title: "AI 식단 분석",
      description: "사진 한 장으로 영양 정보를\n확인하고 분석하세요",
      icon: null,
      useImage: false,
      componentType: "food",
      buttonText: "다음",
    },
    {
      id: 4,
      title: "건강 리포트",
      description: "일별, 주별, 월별 통계로\n나의 혈당 패턴을 한눈에",
      icon: null,
      useImage: false,
      componentType: "report",
      buttonText: "시작하기",
    },
  ];

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  const handleNext = async () => {
    if (activeIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (activeIndex + 1),
        animated: true,
      });
    } else {
      await saveOnboardingComplete();
      router.replace("/(auth)");
    }
  };

  const handleSkip = async () => {
    await saveOnboardingComplete();
    router.replace("/(auth)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide) => (
          <View
            key={slide.id}
            style={[
              styles.slide,
              {
                backgroundColor:
                  activeIndex === slide.id - 1
                    ? palette.background
                    : palette.card,
              },
            ]}
          >
            <View style={styles.content}>
              {slide.componentType === "glucose" ? (
                <GlucoseMonitorIcon />
              ) : slide.componentType === "food" ? (
                <FoodLensIcon />
              ) : slide.componentType === "prediction" ? (
                <PredictionIcon />
              ) : slide.componentType === "report" ? (
                <ReportIcon />
              ) : slide.useImage ? (
                <Image
                  source={slide.icon}
                  style={styles.icon}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.emojiIcon}>{slide.icon}</Text>
              )}
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === activeIndex ? palette.accent : palette.border,
                  width: index === activeIndex ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {slides[activeIndex].buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  skipContainer: {
    paddingRight: 20,
    paddingTop: 40,
    alignItems: "flex-end",
  },
  skipText: {
    fontSize: 14,
    color: palette.accent,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 350,
    height: 120,
    marginBottom: 28,
  },
  emojiIcon: {
    fontSize: 100,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: palette.accent,
    marginBottom: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: palette.textMuted,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 20,
  },
  bottomContainer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    backgroundColor: palette.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OnboardingScreen;

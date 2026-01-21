import React, { useState } from "react";
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LineChart } from "react-native-chart-kit";

// Mock data structure for AI prediction
interface PredictionData {
  graphData: {
    labels: string[];
    datasets: { data: number[] }[];
  };
  guide: string;
}

export default function MealScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(
    null
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      // Simulate AI prediction
      setPredictionData({
        graphData: {
          labels: ["0분", "30분", "60분", "90분", "120분"],
          datasets: [
            {
              data: [
                Math.floor(Math.random() * 20) + 100,
                Math.floor(Math.random() * 30) + 120,
                Math.floor(Math.random() * 40) + 140,
                Math.floor(Math.random() * 30) + 130,
                Math.floor(Math.random() * 20) + 110,
              ],
            },
          ],
        },
        guide:
          "이 음식은 혈당을 다소 빠르게 올릴 수 있습니다. 식사 후 20분 뒤 가벼운 산책을 하면 혈당 스파이크를 완화하는 데 도움이 됩니다. 예상 최고 혈당은 175mg/dL 입니다.",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.page}
      >
        <Text style={styles.pageTitle}>식단 & 시뮬레이션</Text>
        {!selectedImage && (
          <TouchableOpacity style={styles.simButton} onPress={pickImage}>
            <Text style={styles.simButtonText}>
              📸 음식 사진 선택 후 결과 예측
            </Text>
          </TouchableOpacity>
        )}

        {selectedImage && (
          <View style={styles.resultsContainer}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.imagePreview}
            />
            {predictionData && (
              <>
                <Text style={styles.sectionTitle}>AI 예측 혈당 그래프</Text>
                <LineChart
                  data={predictionData.graphData}
                  width={Dimensions.get("window").width - 40}
                  height={220}
                  yAxisSuffix="mg/dL"
                  yAxisInterval={1}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.graphStyle}
                />
                <Text style={styles.sectionTitle}>AI 기반 음식 섭취 가이드</Text>
                <View style={styles.guideCard}>
                  <Text style={styles.guideText}>{predictionData.guide}</Text>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundColor: "#e26a00",
  backgroundGradientFrom: "#4F46E5",
  backgroundGradientTo: "#818CF8",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: "#C7D2FE",
  },
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { flex: 1 },
  page: { padding: 20, paddingTop: Platform.OS === "android" ? 40 : 20 },
  pageTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  simButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 2,
    borderColor: "#C7D2FE",
    borderStyle: "dashed",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
  },
  simButtonText: { color: "#4F46E5", fontWeight: "bold", fontSize: 16 },
  resultsContainer: {
    marginTop: 20,
  },
  imagePreview: {
    width: "100%",
    height: 250,
    borderRadius: 20,
    resizeMode: "cover",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 25,
    marginBottom: 15,
  },
  graphStyle: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  guideCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  guideText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 24,
  },
});

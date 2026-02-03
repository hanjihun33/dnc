import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View } from "react-native";

type Props = {
  text: string;
  textStyle?: StyleProp<TextStyle>;
};

export default function AiGuideText({ text, textStyle }: Props) {
  if (!text) {
    return null;
  }

  const normalize = text.replace(/\r\n/g, "\n");
  const withPunctBreaks = normalize.replace(/([.!?])\s+/g, "$1\n");
  const withEndingBreaks = withPunctBreaks.replace(
    /(습니다|합니다|됩니다|했어요|해요|하세요|입니다|예요|이에요|네요|까요|죠|군요|겠어요|다|요)(?=\s)/g,
    "$1\n"
  );
  const lines = withEndingBreaks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <View>
      <Text style={[styles.text, textStyle]}>{lines.join("\n")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
});

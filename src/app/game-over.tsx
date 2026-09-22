import { theme } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function GameOverScreen() {
  const router = useRouter();
  const { score } = useLocalSearchParams<{ score: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Game Over!</Text>
      <Text style={styles.score}>Score: {score ?? 0}</Text>
      <View style={styles.buttons}>
        <Button onPress={() => router.replace("/playing")} color={theme.colors.primary}>
          <Text style={styles.buttonText}>Replay</Text>
        </Button>
        <Button onPress={() => router.replace("/")} color={theme.colors.secondary}>
          <Text style={styles.buttonText}>Home</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 48,
    color: theme.errorColors.error,
    fontFamily: theme.fonts.heading,
    margin: 4,
    padding: 4,
  },
  score: {
    fontSize: 28,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 16,
  },
  buttonText: {
    fontSize: 19,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
  },
});

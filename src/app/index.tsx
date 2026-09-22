import { theme } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function StartScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome!</Text>
      <Button onPress={() => router.replace("/playing")} color={theme.colors.primary}>
        <Text style={styles.buttonText}>Start</Text>
      </Button>
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
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    margin: 4,
    padding: 4,
  },
  buttonText: {
    fontSize: 19,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
  },
});

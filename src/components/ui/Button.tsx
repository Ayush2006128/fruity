import { theme } from "@/constants/theme";
import { useFX } from "@/hooks/audio";
import { Pressable, StyleSheet, View } from "react-native";

export function Button({ children, onPress, color }: { children: React.ReactNode; onPress: () => void; color: string }) {
  const woodClick = useFX(require("@/assets/audio/fx/wood_click.wav"));

  const handlePress = () => {
    void woodClick.play();
    onPress();
  };

  return (
    <Pressable style={[styles.button, { backgroundColor: color }]} onPress={handlePress}>
      <View style={styles.buttonContent}>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContent: {
    alignItems: "center",
  },
});
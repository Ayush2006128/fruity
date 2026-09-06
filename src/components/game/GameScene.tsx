import { theme } from "@/constants/theme";
import { Canvas } from "@shopify/react-native-skia";
import { StyleSheet, View } from "react-native";

export function GameCanvas({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>{children}</Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  canvas: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
});
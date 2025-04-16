import { View, Text, StyleSheet } from "react-native"
import { MotiView } from "moti"

export default function AdminHeader() {
  return (
    <MotiView
      style={styles.header}
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500 }}
    >
      <Text style={styles.title}>Admin Dashboard</Text>
      <View style={styles.headerDecoration} />
    </MotiView>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "#007AFF",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    position: "relative",
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerDecoration: {
    position: "absolute",
    bottom: 0,
    width: 60,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 2,
    marginTop: 8,
  },
})

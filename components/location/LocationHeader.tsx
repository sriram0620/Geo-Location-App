import type React from "react"
import { Text, StyleSheet } from "react-native"
import { MotiView } from "moti"

const LocationHeader: React.FC = () => {
  return (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500 }}
      style={styles.header}
    >
      <Text style={styles.headerTitle}>Location</Text>
      <Text style={styles.headerSubtitle}>Track your office presence</Text>
    </MotiView>
  )
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
})

export default LocationHeader

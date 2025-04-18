import type React from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6C63FF" />
      <Text style={styles.loadingText}>Getting your location...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9fb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6C63FF",
    fontWeight: "500",
  },
})

export default LoadingScreen

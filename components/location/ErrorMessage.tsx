import type React from "react"
import { Text, StyleSheet } from "react-native"
import { AlertCircle } from "lucide-react-native"
import { MotiView } from "moti"
import { useLocation } from "./LocationContext"

const ErrorMessage: React.FC = () => {
  const { errorMsg } = useLocation()

  if (!errorMsg) return null

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      style={styles.errorContainer}
    >
      <AlertCircle size={24} color="#FF3B30" />
      <Text style={styles.errorText}>{errorMsg}</Text>
    </MotiView>
  )
}

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    marginLeft: 12,
    color: "#FF3B30",
    fontSize: 16,
    flex: 1,
  },
})

export default ErrorMessage

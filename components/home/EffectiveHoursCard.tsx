import { View, Text, StyleSheet } from "react-native"
import { Clock } from "lucide-react-native"

type EffectiveHoursCardProps = {
  effectiveHours: number
}

export const EffectiveHoursCard = ({ effectiveHours }: EffectiveHoursCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Clock size={20} color="#6C63FF" />
          <Text style={styles.cardTitle}>Today's Working Hours</Text>
        </View>
      </View>

      <View style={styles.hoursContainer}>
        <View style={styles.hoursStat}>
          <Text style={styles.hoursValue}>{effectiveHours.toFixed(2)}</Text>
          <Text style={styles.hoursLabel}>Hours</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((effectiveHours / 8) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {effectiveHours >= 8
              ? "Daily target achieved!"
              : `${((8 - effectiveHours) * 60).toFixed(0)} minutes remaining to target`}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212529",
    marginLeft: 8,
  },
  hoursContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  hoursStat: {
    alignItems: "center",
    marginRight: 20,
  },
  hoursValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6C63FF",
  },
  hoursLabel: {
    fontSize: 14,
    color: "#6C757D",
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6C757D",
  },
})

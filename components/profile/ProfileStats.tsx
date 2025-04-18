import { View, Text, StyleSheet } from "react-native"
import { formatDistanceToNow } from "date-fns"

type ProfileStatsProps = {
  userData: any
  attendanceData: any[]
  effectiveHours: string
}

export const ProfileStats = ({ userData, attendanceData, effectiveHours }: ProfileStatsProps) => {
  // Calculate stats from real data
  const checkIns = attendanceData.filter((a) => a.type === "check-in").length || 0
  const checkOuts = attendanceData.filter((a) => a.type === "check-out").length || 0
  const completedPairs = attendanceData.filter((a) => a.type === "check-in" && a.paired).length || 0

  // Format last active time
  const formatLastActive = () => {
    if (!userData) return "N/A"

    const lastActivity =
      userData.lastCheckIn && userData.lastCheckOut
        ? new Date(userData.lastCheckIn) > new Date(userData.lastCheckOut)
          ? userData.lastCheckIn
          : userData.lastCheckOut
        : userData.lastCheckIn || userData.lastCheckOut

    if (!lastActivity) return "No recent activity"

    try {
      return formatDistanceToNow(new Date(lastActivity), { addSuffix: true })
    } catch (error) {
      return "Unknown"
    }
  }

  return (
    <View style={styles.profileStats}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{checkIns}</Text>
        <Text style={styles.statLabel}>Check-ins</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{effectiveHours}</Text>
        <Text style={styles.statLabel}>Total Hours</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{completedPairs}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
})

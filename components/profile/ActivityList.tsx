import { View, Text, StyleSheet } from "react-native"
import { LogIn, LogOut, MapPin } from "lucide-react-native"

type ActivityListProps = {
  activities: any[]
  formatDate: (timestamp: string) => string
  formatTime: (timestamp: string) => string
}

export const ActivityList = ({ activities, formatDate, formatTime }: ActivityListProps) => {
  if (!activities || activities.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No recent activity available</Text>
      </View>
    )
  }

  return (
    <View style={styles.activityList}>
      {activities.slice(0, 10).map((activity, index) => (
        <View key={activity.id || index} style={styles.activityItem}>
          <View
            style={[
              styles.activityTypeIndicator,
              {
                backgroundColor: activity.type === "check-in" ? "#E5F9F6" : "#FFE8E8",
              },
            ]}
          >
            {activity.type === "check-in" ? <LogIn size={16} color="#34C759" /> : <LogOut size={16} color="#FF3B30" />}
          </View>
          <View style={styles.activityDetails}>
            <Text style={styles.activityType}>{activity.type === "check-in" ? "Checked In" : "Checked Out"}</Text>
            <Text style={styles.activityTime}>
              {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
            </Text>
            {activity.type === "check-out" && activity.durationMinutes && (
              <Text style={styles.activityDuration}>
                Duration: {Math.floor(activity.durationMinutes / 60)}h {activity.durationMinutes % 60}m
              </Text>
            )}
            {activity.type === "check-in" && (
              <Text style={styles.activityStatus}>Status: {activity.paired ? "Completed" : "Active"}</Text>
            )}
          </View>
          {activity.location && (
            <View style={styles.activityLocation}>
              <MapPin size={14} color="#6C757D" />
              <Text style={styles.activityLocationText}>Office</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  activityList: {
    marginTop: 10,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  activityTypeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  activityDuration: {
    fontSize: 12,
    color: "#6C63FF",
    fontWeight: "500",
  },
  activityStatus: {
    fontSize: 12,
    color: "#34C759",
    fontWeight: "500",
  },
  activityLocation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activityLocationText: {
    fontSize: 12,
    color: "#6C757D",
    marginLeft: 4,
  },
  noDataContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
  },
})

import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { MotiView } from "moti"
import { Clock, LogIn, LogOut } from "lucide-react-native"
import { useLocation } from "./LocationContext"

const RecentActivityCard: React.FC = () => {
  const { recentActivity, formatTime, formatDate, formatRelativeTime } = useLocation()

  if (!recentActivity || recentActivity.length === 0) return null

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 400 }}
      style={styles.recentActivityCard}
    >
      <View style={styles.recentActivityHeader}>
        <Clock size={20} color="#6C63FF" />
        <Text style={styles.recentActivityTitle}>Recent Activity</Text>
      </View>

      <View style={styles.recentActivityContent}>
        {recentActivity.map((activity, index) => (
          <View key={activity.id || index} style={styles.activityItem}>
            <View
              style={[
                styles.activityTypeIndicator,
                {
                  backgroundColor: activity.type === "check-in" ? "#E5F9F6" : "#FFE8E8",
                },
              ]}
            >
              {activity.type === "check-in" ? (
                <LogIn size={16} color="#34C759" />
              ) : (
                <LogOut size={16} color="#FF3B30" />
              )}
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityType}>{activity.type === "check-in" ? "Checked In" : "Checked Out"}</Text>
              <Text style={styles.activityTime}>
                {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
              </Text>
              <Text style={styles.activityTimeAgo}>{formatRelativeTime(activity.timestamp)}</Text>
              {activity.automatic && (
                <View style={styles.activityBadge}>
                  <Text style={styles.activityBadgeText}>Automatic</Text>
                </View>
              )}
              {activity.manual && (
                <View style={[styles.activityBadge, { backgroundColor: "#E5F9F6" }]}>
                  <Text style={[styles.activityBadgeText, { color: "#20C997" }]}>Manual</Text>
                </View>
              )}
              {activity.type === "check-out" && activity.durationMinutes && (
                <Text style={styles.activityDuration}>
                  Duration: {Math.floor(activity.durationMinutes / 60)}h {activity.durationMinutes % 60}m
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </MotiView>
  )
}

const styles = StyleSheet.create({
  recentActivityCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recentActivityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  recentActivityTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  recentActivityContent: {
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    marginBottom: 2,
  },
  activityTimeAgo: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
  },
  activityDuration: {
    fontSize: 11,
    color: "#6C63FF",
    fontWeight: "500",
    marginTop: 2,
  },
  activityBadge: {
    backgroundColor: "#FFF4E5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  activityBadgeText: {
    fontSize: 10,
    color: "#FD7E14",
    fontWeight: "500",
  },
})

export default RecentActivityCard

import { View, Text, StyleSheet } from "react-native"
import { Clock, MapPin, CheckCircle, XCircle } from "lucide-react-native"

type RecentActivityCardProps = {
  activities: any[]
  formatDate: (timestamp: string | null) => string
  formatTime: (timestamp: string | null) => string
}

export const RecentActivityCard = ({ activities, formatDate, formatTime }: RecentActivityCardProps) => {
  if (!activities || activities.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Clock size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Recent Activity</Text>
          </View>
        </View>
        <Text style={styles.noActivityText}>No recent activities</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Clock size={20} color="#6C63FF" />
          <Text style={styles.cardTitle}>Recent Activity</Text>
        </View>
      </View>

      {activities.map((activity, index) => (
        <View key={index} style={styles.activityItem}>
          <View
            style={[
              styles.activityIconContainer,
              { backgroundColor: activity.type === "check-in" ? "#E5F9F6" : "#FFE8E8" },
            ]}
          >
            {activity.type === "check-in" ? (
              <CheckCircle size={16} color="#20C997" />
            ) : (
              <XCircle size={16} color="#FF6B6B" />
            )}
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>{activity.type === "check-in" ? "Checked In" : "Checked Out"}</Text>
            <Text style={styles.activityTime}>
              {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
            </Text>
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
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212529",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#6C757D",
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
  noActivityText: {
    fontSize: 14,
    color: "#6C757D",
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
  },
})

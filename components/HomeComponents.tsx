import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native"
import { Clock, Calendar, MapPin, CheckCircle2, XCircle, ArrowRight } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"

const { width } = Dimensions.get("window")

// Component for the attendance summary card
export const AttendanceCard = ({ totalHours, daysPresent, avgCheckIn }) => {
  return (
    <View style={styles.attendanceCard}>
      <Text style={styles.attendanceCardTitle}>This Week's Summary</Text>

      <View style={styles.attendanceStatsContainer}>
        <View style={styles.attendanceStat}>
          <View style={[styles.attendanceStatIcon, { backgroundColor: "#E8F3FF" }]}>
            <Clock size={16} color="#6C63FF" />
          </View>
          <View>
            <Text style={styles.attendanceStatValue}>{totalHours}</Text>
            <Text style={styles.attendanceStatLabel}>Total Hours</Text>
          </View>
        </View>

        <View style={styles.attendanceStat}>
          <View style={[styles.attendanceStatIcon, { backgroundColor: "#E5F9F6" }]}>
            <Calendar size={16} color="#20C997" />
          </View>
          <View>
            <Text style={styles.attendanceStatValue}>{daysPresent}</Text>
            <Text style={styles.attendanceStatLabel}>Days Present</Text>
          </View>
        </View>

        <View style={styles.attendanceStat}>
          <View style={[styles.attendanceStatIcon, { backgroundColor: "#FFF4E5" }]}>
            <MapPin size={16} color="#FD7E14" />
          </View>
          <View>
            <Text style={styles.attendanceStatValue}>{avgCheckIn}</Text>
            <Text style={styles.attendanceStatLabel}>Avg. Check-in</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// Component for the upcoming schedule card
export const UpcomingScheduleCard = ({ schedules }) => {
  return (
    <View style={styles.scheduleCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Calendar size={20} color="#6C63FF" />
          <Text style={styles.cardTitle}>Upcoming Schedule</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {schedules.map((schedule, index) => (
        <View key={index} style={styles.scheduleItem}>
          <View style={[styles.scheduleIconContainer, { backgroundColor: schedule.color }]}>
            <Text style={styles.scheduleIconText}>{schedule.day}</Text>
          </View>
          <View style={styles.scheduleContent}>
            <Text style={styles.scheduleTitle}>{schedule.title}</Text>
            <Text style={styles.scheduleTime}>{schedule.time}</Text>
          </View>
          <TouchableOpacity style={styles.scheduleActionButton}>
            <ArrowRight size={16} color="#6C63FF" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}

// Component for the check-in status card
export const CheckInStatusCard = ({ isCheckedIn, lastCheckIn, lastCheckOut, onPress }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <LinearGradient
      colors={isCheckedIn ? ["#6C63FF", "#5A52CC"] : ["#F8F9FA", "#F1F3F5"]}
      style={styles.checkInStatusCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.checkInStatusContent}>
        <View style={styles.checkInStatusIconContainer}>
          {isCheckedIn ? (
            <CheckCircle2 size={32} color="#fff" />
          ) : (
            <XCircle size={32} color={isCheckedIn ? "#fff" : "#FF6B6B"} />
          )}
        </View>
        <View style={styles.checkInStatusTextContainer}>
          <Text style={[styles.checkInStatusTitle, isCheckedIn && styles.checkInStatusTitleActive]}>
            {isCheckedIn ? "Currently Checked In" : "Not Checked In"}
          </Text>
          <Text style={[styles.checkInStatusSubtitle, isCheckedIn && styles.checkInStatusSubtitleActive]}>
            {isCheckedIn
              ? `Since ${formatTime(lastCheckIn)}`
              : lastCheckOut
                ? `Last checkout: ${formatTime(lastCheckOut)}`
                : "No recent check-in records"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.checkInStatusButton, isCheckedIn && styles.checkInStatusButtonActive]}
        onPress={onPress}
      >
        <Text style={[styles.checkInStatusButtonText, isCheckedIn && styles.checkInStatusButtonTextActive]}>
          {isCheckedIn ? "View Details" : "Check In Now"}
        </Text>
        <ArrowRight size={16} color={isCheckedIn ? "#fff" : "#6C63FF"} />
      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  // Attendance card styles
  attendanceCard: {
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
  attendanceCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
  },
  attendanceStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attendanceStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendanceStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  attendanceStatValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#212529",
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: "#6C757D",
  },

  // Schedule card styles
  scheduleCard: {
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
  viewAllText: {
    fontSize: 14,
    color: "#6C63FF",
    fontWeight: "500",
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  scheduleIconText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212529",
    marginBottom: 2,
  },
  scheduleTime: {
    fontSize: 12,
    color: "#6C757D",
  },
  scheduleActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },

  // Check-in status card styles
  checkInStatusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  checkInStatusContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkInStatusIconContainer: {
    marginRight: 16,
  },
  checkInStatusTextContainer: {
    flex: 1,
  },
  checkInStatusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 4,
  },
  checkInStatusTitleActive: {
    color: "#fff",
  },
  checkInStatusSubtitle: {
    fontSize: 14,
    color: "#6C757D",
  },
  checkInStatusSubtitleActive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  checkInStatusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  checkInStatusButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  checkInStatusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C63FF",
    marginRight: 8,
  },
  checkInStatusButtonTextActive: {
    color: "#fff",
  },
})

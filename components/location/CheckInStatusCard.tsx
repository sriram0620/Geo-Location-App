import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { MotiView } from "moti"
import { Clock, CheckCircle, XCircle, LogIn, LogOut } from "lucide-react-native"
import { useLocation } from "./LocationContext"

const CheckInStatusCard: React.FC = () => {
  const {
    checkedIn,
    lastCheckIn,
    lastCheckOut,
    checkInTime,
    elapsedTime,
    isInOffice,
    loading,
    handleCheckIn,
    handleCheckOut,
    calculateEffectiveHours,
    formatTime,
  } = useLocation()

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 200 }}
      style={styles.checkInStatusCard}
    >
      <View style={styles.checkInStatusHeader}>
        <Clock size={20} color="#6C63FF" />
        <Text style={styles.checkInStatusTitle}>Attendance Status</Text>
      </View>

      <View style={styles.checkInStatusContent}>
        <View style={styles.checkInStatusInfo}>
          <Text style={styles.checkInStatusLabel}>Current Status:</Text>
          <View style={styles.checkInStatusValue}>
            {checkedIn ? (
              <View style={styles.statusBadgeActive}>
                <CheckCircle size={16} color="#fff" />
                <Text style={styles.statusBadgeTextActive}>Checked In</Text>
              </View>
            ) : (
              <View style={styles.statusBadgeInactive}>
                <XCircle size={16} color="#fff" />
                <Text style={styles.statusBadgeTextInactive}>Checked Out</Text>
              </View>
            )}
          </View>
        </View>

        {checkedIn && checkInTime && (
          <View style={styles.checkInStatusInfo}>
            <Text style={styles.checkInStatusLabel}>Elapsed Time:</Text>
            <Text style={styles.checkInStatusTimeValue}>{elapsedTime}</Text>
          </View>
        )}

        <View style={styles.checkInStatusInfo}>
          <Text style={styles.checkInStatusLabel}>Last Check-in:</Text>
          <Text style={styles.checkInStatusTimeValue}>{lastCheckIn ? formatTime(lastCheckIn) : "N/A"}</Text>
        </View>

        <View style={styles.checkInStatusInfo}>
          <Text style={styles.checkInStatusLabel}>Last Check-out:</Text>
          <Text style={styles.checkInStatusTimeValue}>{lastCheckOut ? formatTime(lastCheckOut) : "N/A"}</Text>
        </View>

        <View style={styles.checkInStatusInfo}>
          <Text style={styles.checkInStatusLabel}>Effective Hours:</Text>
          <Text style={styles.checkInStatusTimeValue}>{calculateEffectiveHours()}</Text>
        </View>
      </View>

      <View style={styles.autoCheckContainer}>
        <Text style={styles.autoCheckLabel}>Automatic Check-in/out:</Text>
        <View style={styles.autoCheckToggle}>
          <Text style={styles.autoCheckStatus}>Enabled</Text>
          <View style={styles.autoCheckIndicator} />
        </View>
      </View>

      <View style={styles.checkInButtonContainer}>
        {!checkedIn ? (
          <TouchableOpacity
            style={[styles.checkInButton, (!isInOffice || loading) && styles.buttonDisabled]}
            onPress={handleCheckIn}
            disabled={!isInOffice || loading}
            activeOpacity={0.8}
          >
            <LogIn size={20} color="white" />
            <Text style={styles.checkInButtonText}>Check In</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.checkOutButton, loading && styles.buttonDisabled]}
            onPress={handleCheckOut}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LogOut size={20} color="white" />
            <Text style={styles.checkInButtonText}>Check Out</Text>
          </TouchableOpacity>
        )}
      </View>
    </MotiView>
  )
}

const styles = StyleSheet.create({
  checkInStatusCard: {
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
  checkInStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  checkInStatusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  checkInStatusContent: {
    marginBottom: 20,
  },
  checkInStatusInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  checkInStatusLabel: {
    fontSize: 14,
    color: "#666",
  },
  checkInStatusValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkInStatusTimeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  statusBadgeActive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#34C759",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeInactive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeTextActive: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  statusBadgeTextInactive: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  checkInButtonContainer: {
    marginTop: 8,
  },
  checkInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34C759",
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  checkInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  autoCheckContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  autoCheckLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  autoCheckToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  autoCheckStatus: {
    fontSize: 14,
    color: "#34C759",
    fontWeight: "600",
    marginRight: 6,
  },
  autoCheckIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#34C759",
  },
})

export default CheckInStatusCard

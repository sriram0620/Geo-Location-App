"use client"

import { useState } from "react"
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import { User as UserIcon, ChevronRight, Clock, Calendar, Shield, Smartphone, Search } from "lucide-react-native"
import { MotiView } from "moti"
import { formatDuration } from "../../utils/adminDataService"
import type { User, ProcessedAttendanceRecord, UserStats } from "../../app/types"
import { getAuth } from "firebase/auth"

interface UsersTabProps {
  users: User[]
  selectedUser: string | null
  setSelectedUser: (userId: string | null) => void
  processedAttendance: ProcessedAttendanceRecord[]
  userStats: Record<string, UserStats>
  refreshing: boolean
  onRefresh: () => Promise<void>
}

export default function UsersTab({
  users,
  selectedUser,
  setSelectedUser,
  processedAttendance,
  userStats,
  refreshing,
  onRefresh,
}: UsersTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const auth = getAuth()

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.id !== auth.currentUser?.uid && // Filter out current admin
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  if (selectedUser) {
    // User detail screen
    const user = users.find((u) => u.id === selectedUser)
    if (!user)
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
        >
          <Text style={styles.noRecords}>User not found</Text>
        </ScrollView>
      )

    const userAttendance = processedAttendance.filter((record) => record.userId === selectedUser)
    const stats = userStats[selectedUser] || { totalHoursToday: 0, totalHoursAllTime: 0 }

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <MotiView
          from={{ opacity: 0, translateX: -20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: "timing", duration: 300 }}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedUser(null)} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← Back to Users List</Text>
          </TouchableOpacity>
        </MotiView>

        {/* User profile */}
        <MotiView
          style={styles.card}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 100 }}
        >
          <View style={styles.cardHeader}>
            <UserIcon size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>User Profile</Text>
          </View>

          <View style={styles.userProfileContainer}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>{user.name ? user.name.charAt(0).toUpperCase() : "U"}</Text>
            </View>

            <Text style={styles.userDetailName}>{user.name || "Unknown"}</Text>
            <Text style={styles.userDetailEmail}>{user.email || "No email"}</Text>

            <View style={styles.userDetailStats}>
              <View style={styles.userDetailStat}>
                <Clock size={16} color="#007AFF" />
                <Text style={styles.userDetailStatLabel}>Today:</Text>
                <Text style={styles.userDetailStatValue}>{stats.totalHoursToday.toFixed(1)} hrs</Text>
              </View>

              <View style={styles.userDetailStat}>
                <Calendar size={16} color="#007AFF" />
                <Text style={styles.userDetailStatLabel}>All Time:</Text>
                <Text style={styles.userDetailStatValue}>{stats.totalHoursAllTime.toFixed(1)} hrs</Text>
              </View>

              <View style={styles.userDetailStat}>
                <Shield size={16} color="#007AFF" />
                <Text style={styles.userDetailStatLabel}>Role:</Text>
                <Text style={styles.userDetailStatValue}>{user.isAdmin ? "Admin" : "User"}</Text>
              </View>
            </View>
          </View>
        </MotiView>

        {/* Device info */}
        <MotiView
          style={styles.card}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 200 }}
        >
          <View style={styles.cardHeader}>
            <Smartphone size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Device Information</Text>
          </View>

          {user.deviceInfo ? (
            <View style={styles.deviceInfoContainer}>
              <View style={styles.deviceInfoRow}>
                <Text style={styles.deviceInfoLabel}>Device:</Text>
                <Text style={styles.deviceInfoValue}>
                  {user.deviceInfo.brand} {user.deviceInfo.modelName}
                </Text>
              </View>

              <View style={styles.deviceInfoRow}>
                <Text style={styles.deviceInfoLabel}>OS:</Text>
                <Text style={styles.deviceInfoValue}>
                  {user.deviceInfo.osName} {user.deviceInfo.osVersion}
                </Text>
              </View>

              <View style={styles.deviceInfoRow}>
                <Text style={styles.deviceInfoLabel}>IMEI/ID:</Text>
                <Text style={styles.deviceInfoValue}>
                  {user.deviceInfo.imei || user.deviceInfo.deviceId || "Unknown"}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noRecords}>No device information available</Text>
          )}
        </MotiView>

        {/* Attendance history */}
        <MotiView
          style={styles.card}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 300 }}
        >
          <View style={styles.cardHeader}>
            <Calendar size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>Attendance History</Text>
          </View>

          {userAttendance.length > 0 ? (
            <View>
              {/* Group attendance by date */}
              {Array.from(new Set(userAttendance.map((record) => record.date)))
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                .map((date, dateIndex) => {
                  // Get all records for this date
                  const dayRecords = userAttendance.filter((record) => record.date === date)

                  // Calculate total minutes for the day
                  const dayTotalMinutes = dayRecords.reduce((total, record) => total + (record.duration || 0), 0)

                  // Get complete sessions only (check-in/out pairs)
                  const completeSessions = dayRecords.filter((record) => record.checkIn && record.checkOut)

                  // Get active session (checked in but not out)
                  const activeSession = dayRecords.find((record) => record.checkIn && !record.checkOut)

                  return (
                    <MotiView
                      key={date}
                      style={styles.attendanceDateGroup}
                      from={{ opacity: 0, translateY: 20 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: "timing", duration: 300, delay: 400 + dateIndex * 100 }}
                    >
                      <View style={styles.attendanceDateHeader}>
                        <Text style={styles.attendanceDateText}>
                          {new Date(date).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </Text>
                        <Text style={styles.attendanceDateTotal}>Total: {formatDuration(dayTotalMinutes)}</Text>
                      </View>

                      <View style={styles.attendanceTableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Check In</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Check Out</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Duration</Text>
                      </View>

                      {/* Completed sessions */}
                      {completeSessions.map((record, index) => (
                        <View key={`complete-${index}`} style={styles.attendanceTableRow}>
                          <View style={[styles.tableCell, { flex: 1.5 }]}>
                            <Text style={[styles.tableCellTime, { color: "#34C759" }]}>
                              {record.checkIn
                                ? new Date(record.checkIn.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </Text>
                          </View>

                          <View style={[styles.tableCell, { flex: 1.5 }]}>
                            <Text style={[styles.tableCellTime, { color: "#FF3B30" }]}>
                              {record.checkOut
                                ? new Date(record.checkOut.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </Text>
                          </View>

                          <View style={[styles.tableCell, { flex: 1 }]}>
                            <Text style={styles.tableCellDuration}>
                              {record.duration ? formatDuration(record.duration) : "—"}
                            </Text>
                          </View>
                        </View>
                      ))}

                      {/* Active session */}
                      {activeSession && (
                        <View style={[styles.attendanceTableRow, { backgroundColor: "#f8fff8" }]}>
                          <View style={[styles.tableCell, { flex: 1.5 }]}>
                            <Text style={[styles.tableCellTime, { color: "#34C759" }]}>
                              {activeSession.checkIn
                                ? new Date(activeSession.checkIn.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </Text>
                          </View>

                          <View style={[styles.tableCell, { flex: 1.5 }]}>
                            <View style={styles.statusBadge}>
                              <Text style={styles.statusBadgeText}>Active</Text>
                            </View>
                            <Text style={styles.activeTimeText}>
                              since{" "}
                              {new Date(activeSession.checkIn?.timestamp || "").toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </View>

                          <View style={[styles.tableCell, { flex: 1 }]}>
                            <Text style={styles.tableCellDuration}>—</Text>
                          </View>
                        </View>
                      )}
                    </MotiView>
                  )
                })}
            </View>
          ) : (
            <Text style={styles.noRecords}>No attendance records found</Text>
          )}
        </MotiView>
      </ScrollView>
    )
  }

  // Users list
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        style={styles.searchContainer}
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 300 }}
      >
        <Search size={18} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8E8E93"
        />
      </MotiView>

      <MotiView
        style={styles.card}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 100 }}
      >
        <View style={styles.cardHeader}>
          <UserIcon size={20} color="#007AFF" />
          <Text style={styles.cardTitle}>All Users</Text>
        </View>

        {filteredUsers.length > 0 ? (
          filteredUsers.map((user, index) => (
            <MotiView
              key={user.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: 200 + index * 50 }}
            >
              <TouchableOpacity
                style={styles.userListItem}
                onPress={() => setSelectedUser(user.id)}
                activeOpacity={0.7}
              >
                <View style={styles.userListAvatarContainer}>
                  <View style={styles.userListAvatar}>
                    <Text style={styles.userListInitials}>{user.name ? user.name.charAt(0).toUpperCase() : "U"}</Text>
                  </View>
                </View>

                <View style={styles.userListInfo}>
                  <Text style={styles.userListName}>{user.name || "Unknown"}</Text>
                  <Text style={styles.userListEmail}>{user.email || "No email"}</Text>
                  <View style={styles.userStatusContainer}>
                    <View
                      style={[styles.statusIndicator, { backgroundColor: user.checkedIn ? "#34C759" : "#FF3B30" }]}
                    />
                    <Text style={[styles.userListStatus, { color: user.checkedIn ? "#34C759" : "#FF3B30" }]}>
                      {user.checkedIn ? "Checked In" : "Checked Out"}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={20} color="#8E8E93" />
              </TouchableOpacity>
            </MotiView>
          ))
        ) : (
          <Text style={styles.noRecords}>No users found</Text>
        )}
      </MotiView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cardTitle: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userListAvatarContainer: {
    marginRight: 15,
  },
  userListAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e1f0ff",
    alignItems: "center",
    justifyContent: "center",
  },
  userListInitials: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  userListInfo: {
    flex: 1,
  },
  userListName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  userListEmail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 3,
  },
  userStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userListStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  backButton: {
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 5,
  },
  userProfileContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  userAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e1f0ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInitials: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#007AFF",
  },
  userDetailName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  userDetailEmail: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
  },
  userDetailStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    justifyContent: "center",
    width: "100%",
  },
  userDetailStat: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 120,
  },
  userDetailStatLabel: {
    fontSize: 13,
    color: "#666",
    marginLeft: 5,
    marginRight: 5,
  },
  userDetailStatValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  deviceInfoContainer: {
    paddingVertical: 10,
  },
  deviceInfoRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  deviceInfoLabel: {
    width: 80,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  deviceInfoValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  attendanceDateGroup: {
    marginBottom: 20,
  },
  attendanceDateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#f0f8ff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  attendanceDateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  attendanceDateTotal: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
  },
  attendanceTableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 5,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  attendanceTableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tableCell: {
    justifyContent: "center",
  },
  tableCellTime: {
    fontSize: 14,
    fontWeight: "500",
  },
  tableCellDuration: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  noRecords: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    padding: 15,
  },
  statusBadge: {
    backgroundColor: "#34C759",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTimeText: {
    fontSize: 10,
    color: "#666",
    marginTop: 3,
  },
})

import type React from "react"
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from "react-native"
import { MapPin, Users, Clock, Calendar, BarChart3, ExternalLink, ChevronRight } from "lucide-react-native"
import { MotiView } from "moti"
import { formatDateTime, formatDuration } from "../../utils/adminDataService"
import type { DashboardStats, ProcessedAttendanceRecord, UserStats, OnsiteRequest } from "../../app/types"

interface DashboardTabProps {
  dashboardStats: DashboardStats
  processedAttendance: ProcessedAttendanceRecord[]
  userStats: Record<string, UserStats>
  onsiteRequests: OnsiteRequest[]
  refreshing: boolean
  onRefresh: () => Promise<void>
  onSelectRequest: (request: OnsiteRequest) => void
}

export default function DashboardTab({
  dashboardStats,
  processedAttendance,
  userStats,
  onsiteRequests,
  refreshing,
  onRefresh,
  onSelectRequest,
}: DashboardTabProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Dashboard stats */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={dashboardStats.totalUsers}
          icon={<Users size={24} color="#007AFF" />}
          delay={100}
        />
        <StatCard
          title="Checked In"
          value={dashboardStats.checkedInUsers}
          icon={<MapPin size={24} color="#34C759" />}
          delay={200}
        />
        <StatCard
          title="Today's Attendance"
          value={dashboardStats.todayAttendance}
          icon={<Calendar size={24} color="#FF9500" />}
          delay={300}
        />
        <StatCard
          title="Avg Hours Today"
          value={dashboardStats.avgHoursToday}
          icon={<Clock size={24} color="#FF2D55" />}
          delay={400}
          isDecimal
        />
      </View>

      {/* Pending Requests */}
      <Card title="Pending Onsite Work Requests" icon={<ExternalLink size={20} color="#007AFF" />} delay={500}>
        {onsiteRequests.filter((req) => req.status === "pending").length > 0 ? (
          <View>
            {onsiteRequests
              .filter((req) => req.status === "pending")
              .map((request, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.requestItem}
                  onPress={() => onSelectRequest(request)}
                  activeOpacity={0.7}
                >
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestUser}>{request.userName}</Text>
                    <Text style={styles.requestReason}>{request.reason}</Text>
                    <Text style={styles.requestDate}>
                      {formatDateTime(request.startDateTime)} - {formatDateTime(request.endDateTime)}
                    </Text>
                  </View>
                  <View style={styles.requestStatus}>
                    <Text style={styles.pendingStatusText}>Pending</Text>
                    <ChevronRight size={16} color="#999" />
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        ) : (
          <Text style={styles.noRecords}>No pending requests</Text>
        )}
      </Card>

      {/* Today's Attendance */}
      <Card title="Today's Attendance" icon={<Calendar size={20} color="#007AFF" />} delay={600}>
        {processedAttendance.filter((record) => record.date === new Date().toLocaleDateString()).length > 0 ? (
          <View>
            <View style={styles.attendanceTableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>User</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Check In</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Check Out</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Duration</Text>
            </View>

            {/* Group attendance records by user for today */}
            {Object.values(
              processedAttendance
                .filter((record) => record.date === new Date().toLocaleDateString())
                .reduce(
                  (acc, record) => {
                    // For each user, only keep their most recent attendance record
                    if (
                      !acc[record.userId] ||
                      new Date(record.checkIn?.timestamp || 0).getTime() >
                        new Date(acc[record.userId].checkIn?.timestamp || 0).getTime()
                    ) {
                      acc[record.userId] = record
                    }
                    return acc
                  },
                  {} as Record<string, ProcessedAttendanceRecord>,
                ),
            ).map((record: ProcessedAttendanceRecord, index) => (
              <MotiView
                key={index}
                style={[styles.attendanceTableRow, !record.checkOut && { backgroundColor: "#f8fff8" }]}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 300, delay: 700 + index * 100 }}
              >
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text style={styles.tableCellName}>{record.userName}</Text>
                  <Text style={styles.userEmail}>{record.userEmail}</Text>
                </View>

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
                  {record.checkOut ? (
                    <Text style={[styles.tableCellTime, { color: "#FF3B30" }]}>
                      {new Date(record.checkOut.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : (
                    <View>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>Active</Text>
                      </View>
                      <Text style={styles.activeTimeText}>
                        since{" "}
                        {new Date(record.checkIn?.timestamp || "").toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.tableCell, { flex: 1 }]}>
                  <Text style={styles.tableCellDuration}>
                    {record.duration ? formatDuration(record.duration) : "—"}
                  </Text>
                </View>
              </MotiView>
            ))}
          </View>
        ) : (
          <Text style={styles.noRecords}>No attendance records for today</Text>
        )}
      </Card>

      {/* User Productivity */}
      <Card title="User Productivity (Today)" icon={<BarChart3 size={20} color="#007AFF" />} delay={700}>
        {Object.values(userStats).some((user) => user.totalMinutesToday > 0) ? (
          <View>
            <View style={styles.attendanceTableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>User</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Hours</Text>
            </View>

            {Object.entries(userStats)
              .filter(([_, user]) => user.totalMinutesToday > 0)
              .sort(([_, a], [__, b]) => b.totalMinutesToday - a.totalMinutesToday)
              .map(([userId, user], index) => (
                <MotiView
                  key={userId}
                  style={styles.attendanceTableRow}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "timing", duration: 300, delay: 800 + index * 100 }}
                >
                  <View style={[styles.tableCell, { flex: 2 }]}>
                    <Text style={styles.tableCellName}>{user.name}</Text>
                  </View>

                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={styles.tableCellDuration}>{formatDuration(user.totalMinutesToday)}</Text>
                  </View>
                </MotiView>
              ))}
          </View>
        ) : (
          <Text style={styles.noRecords}>No productivity data for today</Text>
        )}
      </Card>
    </ScrollView>
  )
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  delay: number
  isDecimal?: boolean
}

function StatCard({ title, value, icon, delay, isDecimal = false }: StatCardProps) {
  return (
    <MotiView
      style={styles.statsCard}
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 500, delay }}
    >
      {icon}
      <Text style={styles.statsValue}>{isDecimal ? value.toFixed(1) : value}</Text>
      <Text style={styles.statsLabel}>{title}</Text>
    </MotiView>
  )
}

interface CardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  delay: number
}

function Card({ title, icon, children, delay }: CardProps) {
  return (
    <MotiView
      style={styles.card}
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay }}
    >
      <View style={styles.cardHeader}>
        {icon}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </MotiView>
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    justifyContent: "space-between",
  },
  statsCard: {
    width: "48%",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 130,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  statsLabel: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
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
  tableCellName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
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
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa",
    paddingHorizontal: 12,
  },
  requestInfo: {
    flex: 1,
    paddingRight: 10,
  },
  requestUser: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  requestReason: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: "#777",
  },
  requestStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff8e1",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pendingStatusText: {
    fontSize: 12,
    color: "#FF9800",
    fontWeight: "600",
    marginRight: 5,
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

"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native"
import { useRouter } from "expo-router"
import { signOut } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { auth, db } from "../config/firebase"
import {
  User,
  LogOut,
  Clock,
  Calendar,
  BarChart3,
  ChevronRight,
  Shield,
  Smartphone,
  Mail,
  Phone,
  LogIn, // Added LogIn import
} from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MotiView } from "moti"
import { LineChart, BarChart, PieChart } from "react-native-chart-kit"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns"

const { width } = Dimensions.get("window")

export default function ProfileScreen() {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [weeklyStats, setWeeklyStats] = useState<any>({
    labels: [],
    datasets: [{ data: [] }],
  })
  const [monthlyStats, setMonthlyStats] = useState<any>({
    labels: [],
    datasets: [{ data: [] }],
  })
  const [attendanceDistribution, setAttendanceDistribution] = useState<any>({
    labels: [],
    data: [],
  })
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const router = useRouter()
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Fetch user data and attendance records
  const fetchUserData = async () => {
    if (!auth.currentUser) return

    try {
      setLoading(true)

      // Get user document
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
      if (userDoc.exists()) {
        setUserData(userDoc.data())
      }

      // Get attendance records
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc"),
        limit(50),
      )

      const attendanceSnapshot = await getDocs(attendanceQuery)
      const attendanceRecords: any[] = []
      attendanceSnapshot.forEach((doc) => {
        attendanceRecords.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      setAttendanceData(attendanceRecords)

      // Process data for charts
      processAttendanceData(attendanceRecords)
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Process attendance data for charts
  const processAttendanceData = (records: any[]) => {
    if (!records.length) return

    // Process weekly data
    const today = new Date()
    const startOfWeekDate = startOfWeek(today)
    const endOfWeekDate = endOfWeek(today)
    const daysOfWeek = eachDayOfInterval({ start: startOfWeekDate, end: endOfWeekDate })

    const weekLabels = daysOfWeek.map((date) => format(date, "EEE"))
    const weekData = daysOfWeek.map((day) => {
      const dayRecords = records.filter((record) => {
        const recordDate = new Date(record.timestamp)
        return isSameDay(recordDate, day) && record.type === "check-in"
      })
      return dayRecords.length
    })

    setWeeklyStats({
      labels: weekLabels,
      datasets: [
        {
          data: weekData,
          color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
        },
      ],
    })

    // Process monthly data (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date
    }).reverse()

    const monthLabels = last7Days.map((date) => format(date, "dd"))
    const monthData = last7Days.map((day) => {
      let hoursWorked = 0
      const dayRecords = records.filter((record) => {
        const recordDate = new Date(record.timestamp)
        return isSameDay(recordDate, day)
      })

      // Calculate hours worked
      const checkIns = dayRecords.filter((record) => record.type === "check-in")
      const checkOuts = dayRecords.filter((record) => record.type === "check-out")

      checkIns.forEach((checkIn) => {
        const matchingCheckOut = checkOuts.find(
          (checkOut) => new Date(checkOut.timestamp).getTime() > new Date(checkIn.timestamp).getTime(),
        )
        if (matchingCheckOut) {
          const duration =
            (new Date(matchingCheckOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime()) / (1000 * 60 * 60)
          hoursWorked += duration
        }
      })

      return Math.round(hoursWorked * 10) / 10 // Round to 1 decimal place
    })

    setMonthlyStats({
      labels: monthLabels,
      datasets: [
        {
          data: monthData,
          color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
        },
      ],
    })

    // Process attendance distribution
    const checkIns = records.filter((record) => record.type === "check-in").length
    const checkOuts = records.filter((record) => record.type === "check-out").length
    const totalRecords = checkIns + checkOuts

    setAttendanceDistribution({
      labels: ["Check-ins", "Check-outs"],
      data: [checkIns / totalRecords || 0, checkOuts / totalRecords || 0],
      colors: ["#4CAF50", "#F44336"],
      legendFontColor: "#7F7F7F",
      legendFontSize: 12,
    })
  }

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.replace("/(auth)/login")
    } catch (error: any) {
      console.error("Error signing out:", error)
    }
  }

  // Format date for display
  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Format time for display
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Calculate total hours worked
  const calculateTotalHours = () => {
    if (!attendanceData.length) return "0h"

    const checkIns = attendanceData.filter((record) => record.type === "check-in")
    const checkOuts = attendanceData.filter((record) => record.type === "check-out")

    let totalMinutes = 0
    checkIns.forEach((checkIn) => {
      const matchingCheckOut = checkOuts.find(
        (checkOut) => new Date(checkOut.timestamp).getTime() > new Date(checkIn.timestamp).getTime(),
      )
      if (matchingCheckOut) {
        const duration =
          (new Date(matchingCheckOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime()) / (1000 * 60)
        totalMinutes += duration
      }
    })

    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.round(totalMinutes % 60)
    return `${hours}h ${minutes}m`
  }

  // Calculate average hours per day
  const calculateAverageHours = () => {
    if (!attendanceData.length) return "0h"

    const checkIns = attendanceData.filter((record) => record.type === "check-in")
    const checkOuts = attendanceData.filter((record) => record.type === "check-out")

    let totalMinutes = 0
    const daysWorked = new Set()

    checkIns.forEach((checkIn) => {
      const checkInDate = new Date(checkIn.timestamp)
      const dateString = checkInDate.toDateString()
      daysWorked.add(dateString)

      const matchingCheckOut = checkOuts.find(
        (checkOut) => new Date(checkOut.timestamp).getTime() > checkInDate.getTime(),
      )
      if (matchingCheckOut) {
        const duration = (new Date(matchingCheckOut.timestamp).getTime() - checkInDate.getTime()) / (1000 * 60)
        totalMinutes += duration
      }
    })

    const totalDays = daysWorked.size || 1
    const avgMinutesPerDay = totalMinutes / totalDays
    const hours = Math.floor(avgMinutesPerDay / 60)
    const minutes = Math.round(avgMinutesPerDay % 60)
    return `${hours}h ${minutes}m`
  }

  // Toggle section expansion
  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null)
    } else {
      setExpandedSection(section)

      // Animate scroll to expanded section
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start()
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchUserData()
  }, [])

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true)
    fetchUserData()
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Profile Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500 }}
      >
        <LinearGradient
          colors={["#6C63FF", "#8F87FF"]}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileHeaderContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={40} color="#fff" />
              </View>
              {userData?.isAdmin && (
                <View style={styles.adminBadge}>
                  <Shield size={12} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData?.name || "User"}</Text>
              <Text style={styles.profileEmail}>{userData?.email || ""}</Text>
              {userData?.checkedIn && (
                <View style={styles.statusBadge}>
                  <View style={styles.statusIndicator} />
                  <Text style={styles.statusText}>Currently Checked In</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{attendanceData.filter((a) => a.type === "check-in").length || 0}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{calculateTotalHours()}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{calculateAverageHours()}</Text>
              <Text style={styles.statLabel}>Avg. Daily</Text>
            </View>
          </View>
        </LinearGradient>
      </MotiView>

      {/* User Information */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 100 }}
        style={styles.card}
      >
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection("userInfo")} activeOpacity={0.7}>
          <View style={styles.cardTitleContainer}>
            <User size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          <ChevronRight
            size={20}
            color="#6C63FF"
            style={{
              transform: [
                {
                  rotate: expandedSection === "userInfo" ? "90deg" : "0deg",
                },
              ],
            }}
          />
        </TouchableOpacity>

        {expandedSection === "userInfo" && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.cardContent}
          >
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <User size={18} color="#6C63FF" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{userData?.name || "Not provided"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Mail size={18} color="#6C63FF" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{userData?.email || "Not provided"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Phone size={18} color="#6C63FF" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{userData?.phone || "Not provided"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Calendar size={18} color="#6C63FF" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Joined On</Text>
                <Text style={styles.infoValue}>{formatDate(userData?.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Smartphone size={18} color="#6C63FF" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Device</Text>
                <Text style={styles.infoValue}>
                  {userData?.deviceInfo ? `${userData.deviceInfo.brand} ${userData.deviceInfo.modelName}` : "Unknown"}
                </Text>
              </View>
            </View>
          </MotiView>
        )}
      </MotiView>

      {/* Weekly Attendance */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 200 }}
        style={styles.card}
      >
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleSection("weeklyAttendance")}
          activeOpacity={0.7}
        >
          <View style={styles.cardTitleContainer}>
            <Calendar size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Weekly Attendance</Text>
          </View>
          <ChevronRight
            size={20}
            color="#6C63FF"
            style={{
              transform: [
                {
                  rotate: expandedSection === "weeklyAttendance" ? "90deg" : "0deg",
                },
              ],
            }}
          />
        </TouchableOpacity>

        {expandedSection === "weeklyAttendance" && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.cardContent}
          >
            {weeklyStats.datasets[0].data.some((value: number) => value > 0) ? (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Check-ins per Day</Text>
                <BarChart
                  data={weeklyStats}
                  width={width - 60}
                  height={220}
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    barPercentage: 0.7,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                />
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No attendance data available for this week</Text>
              </View>
            )}
          </MotiView>
        )}
      </MotiView>

      {/* Working Hours */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 300 }}
        style={styles.card}
      >
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection("workingHours")} activeOpacity={0.7}>
          <View style={styles.cardTitleContainer}>
            <Clock size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Working Hours</Text>
          </View>
          <ChevronRight
            size={20}
            color="#6C63FF"
            style={{
              transform: [
                {
                  rotate: expandedSection === "workingHours" ? "90deg" : "0deg",
                },
              ],
            }}
          />
        </TouchableOpacity>

        {expandedSection === "workingHours" && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.cardContent}
          >
            {monthlyStats.datasets[0].data.some((value: number) => value > 0) ? (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Hours Worked (Last 7 Days)</Text>
                <LineChart
                  data={monthlyStats}
                  width={width - 60}
                  height={220}
                  yAxisSuffix="h"
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: "#6C63FF",
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No working hours data available</Text>
              </View>
            )}
          </MotiView>
        )}
      </MotiView>

      {/* Attendance Distribution */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 400 }}
        style={styles.card}
      >
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleSection("attendanceDistribution")}
          activeOpacity={0.7}
        >
          <View style={styles.cardTitleContainer}>
            <BarChart3 size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Attendance Distribution</Text>
          </View>
          <ChevronRight
            size={20}
            color="#6C63FF"
            style={{
              transform: [
                {
                  rotate: expandedSection === "attendanceDistribution" ? "90deg" : "0deg",
                },
              ],
            }}
          />
        </TouchableOpacity>

        {expandedSection === "attendanceDistribution" && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.cardContent}
          >
            {attendanceData.length > 0 ? (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Check-ins vs Check-outs</Text>
                <PieChart
                  data={attendanceDistribution}
                  width={width - 60}
                  height={220}
                  chartConfig={{
                    backgroundColor: "#ffffff",
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="data"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  style={styles.chart}
                />
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No attendance distribution data available</Text>
              </View>
            )}
          </MotiView>
        )}
      </MotiView>

      {/* Recent Activity */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 500 }}
        style={styles.card}
      >
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection("recentActivity")} activeOpacity={0.7}>
          <View style={styles.cardTitleContainer}>
            <Clock size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Recent Activity</Text>
          </View>
          <ChevronRight
            size={20}
            color="#6C63FF"
            style={{
              transform: [
                {
                  rotate: expandedSection === "recentActivity" ? "90deg" : "0deg",
                },
              ],
            }}
          />
        </TouchableOpacity>

        {expandedSection === "recentActivity" && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.cardContent}
          >
            {attendanceData.length > 0 ? (
              <View style={styles.activityList}>
                {attendanceData.slice(0, 10).map((activity, index) => (
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
                      <Text style={styles.activityType}>
                        {activity.type === "check-in" ? "Checked In" : "Checked Out"}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No recent activity available</Text>
              </View>
            )}
          </MotiView>
        )}
      </MotiView>

      {/* Sign Out Button */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 600 }}
      >
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </MotiView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9fb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6C63FF",
    fontWeight: "500",
  },
  profileHeader: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  adminBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF9500",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 199, 89, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  cardContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0EEFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  chart: {
    borderRadius: 16,
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
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE5E5",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
  },
  signOutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
})

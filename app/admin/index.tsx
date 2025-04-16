"use client"

import { useState, useEffect, useCallback } from "react"
import { SafeAreaView, StyleSheet, View, Text, ActivityIndicator, Alert } from "react-native"
import { useRouter } from "expo-router"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { db, auth } from "../config/firebase"
import { AnimatePresence, MotiView } from "moti"

// Components
import AdminHeader from "../../components/admin/AdminHeader"
import AdminTabBar from "../../components/admin/AdminTabBar"
import DashboardTab from "../../components/admin/DashboardTab"
import UsersTab from "../../components/admin/UsersTab"
import RequestsTab from "../../components/admin/RequestsTab"
import SettingsTab from "../../components/admin/SettingsTab"
import LocationTab from "../../components/admin/LocationTab"
import RequestModal from "../../components/admin/RequestModal"

// Types
import type {
  User,
  AttendanceRecord,
  ProcessedAttendanceRecord,
  UserStats,
  DashboardStats,
  OfficeLocation,
  OnsiteRequest,
} from "../types"

export default function AdminDashboard() {
  // State variables
  const [activeTab, setActiveTab] = useState<string>("dashboard")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation>({
    latitude: "",
    longitude: "",
    radius: "",
  })
  const [onsiteRequests, setOnsiteRequests] = useState<OnsiteRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<OnsiteRequest | null>(null)
  const [requestModalVisible, setRequestModalVisible] = useState<boolean>(false)
  const [processedAttendance, setProcessedAttendance] = useState<ProcessedAttendanceRecord[]>([])
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({})
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    checkedInUsers: 0,
    todayAttendance: 0,
    avgHoursToday: 0,
    pendingRequests: 0,
  })

  const router = useRouter()

  // Custom hook for admin data operations
  const { fetchUsers, fetchAttendanceRecords, fetchOfficeLocation, fetchOnsiteRequests, processAttendanceData } =
    useAdminData()

  // Initial setup and admin access check
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          setTimeout(() => {
            router.replace("/(auth)/login")
          }, 0)
          return
        }

        // Let's update the current user to make them an admin if needed
        const userRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userRef)

        // If the user document doesn't exist or doesn't have isAdmin field,
        // we'll create it and set them as an admin for this demo
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            isAdmin: true,
            email: user.email,
            name: user.displayName || "Admin User",
            userId: user.uid,
            createdAt: new Date().toISOString(),
          })
          fetchInitialData()
          return
        }

        const userData = userDoc.data()

        // If isAdmin field is missing, add it
        if (userData && userData.isAdmin === undefined) {
          await setDoc(userRef, { isAdmin: true }, { merge: true })
          fetchInitialData()
          return
        }

        if (!userData?.isAdmin) {
          Alert.alert("Unauthorized", "You do not have access to this page")
          setTimeout(() => {
            router.replace("/(auth)/login")
          }, 100)
          return
        }

        fetchInitialData()
      } catch (error) {
        console.error("Error checking admin access:", error)
        Alert.alert("Error", "Authentication error", [
          {
            text: "OK",
            onPress: () => {
              setTimeout(() => {
                router.replace("/(auth)/login")
              }, 100)
            },
          },
        ])
      }
    }

    checkAdminAccess()
  }, [])

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)

      const [usersData, attendanceData, locationData, requestsData] = await Promise.all([
        fetchUsers(),
        fetchAttendanceRecords(),
        fetchOfficeLocation(),
        fetchOnsiteRequests(),
      ])

      setUsers(usersData)
      setAttendanceRecords(attendanceData)
      setOfficeLocation(locationData)
      setOnsiteRequests(requestsData)

      // Process attendance data after all data is fetched
      processAttendanceData(attendanceData, usersData, requestsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      Alert.alert("Error", "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }, [fetchUsers, fetchAttendanceRecords, fetchOfficeLocation, fetchOnsiteRequests, processAttendanceData])

  // Fetch all required data
  const fetchData = useCallback(async () => {
    await fetchInitialData()
  }, [fetchInitialData])

  // Custom hook for admin data operations
  function useAdminData() {
  // Process attendance records to pair check-ins with check-outs and calculate durations
    const processAttendanceData = useCallback(
      (records: AttendanceRecord[], usersList: User[], requests: OnsiteRequest[]) => {
        if (records.length === 0 || usersList.length === 0) return

      // Group records by user and date
      const recordsByUserAndDate: Record<string, Record<string, AttendanceRecord[]>> = {}

        records.forEach((record) => {
        const userId = record.userId
        const date = new Date(record.timestamp).toLocaleDateString()

        if (!recordsByUserAndDate[userId]) {
          recordsByUserAndDate[userId] = {}
        }

        if (!recordsByUserAndDate[userId][date]) {
          recordsByUserAndDate[userId][date] = []
        }

        recordsByUserAndDate[userId][date].push(record)
      })

      // Process records for each user and date
      const processed: ProcessedAttendanceRecord[] = []
      const stats: Record<string, UserStats> = {}
      let totalHoursToday = 0
      let usersWithHoursToday = 0

      const today = new Date().toLocaleDateString()

      Object.keys(recordsByUserAndDate).forEach((userId) => {
          const user = usersList.find((u) => u.id === userId)
        if (!user) return

        let userTotalMinutesToday = 0
        let userTotalMinutesAllTime = 0

        Object.keys(recordsByUserAndDate[userId]).forEach((date) => {
          const dayRecords = recordsByUserAndDate[userId][date].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          )

          // Process check-ins and check-outs for this day
          const checkInsAndOuts: ProcessedAttendanceRecord[] = []
            let i = 0
            while (i < dayRecords.length) {
            const record = dayRecords[i]
              i++

            if (record.type === "check-in") {
              // Find next check-out
                const matchingCheckOutIndex = dayRecords.findIndex((r, idx) => idx >= i && r.type === "check-out")

                const matchingCheckOut = matchingCheckOutIndex !== -1 ? dayRecords[matchingCheckOutIndex] : null

              const entry: ProcessedAttendanceRecord = {
                userId,
                userName: user.name || "Unknown",
                userEmail: user.email || "Unknown",
                date,
                checkIn: record,
                checkOut: matchingCheckOut || null,
              }

              // Calculate duration if we have both check-in and check-out
              if (entry.checkIn && entry.checkOut) {
                const checkInTime = new Date(entry.checkIn.timestamp).getTime()
                const checkOutTime = new Date(entry.checkOut.timestamp).getTime()
                const durationMs = checkOutTime - checkInTime
                const durationMinutes = Math.round(durationMs / (1000 * 60))

                entry.duration = durationMinutes

                // Add to user's total minutes
                userTotalMinutesAllTime += durationMinutes
                if (date === today) {
                  userTotalMinutesToday += durationMinutes
                  }

                  // Skip the matching check-out in future iterations
                  if (matchingCheckOutIndex !== -1) {
                    i = matchingCheckOutIndex + 1
                  }
                }

                checkInsAndOuts.push(entry)
            }
          }

          // Add all check-ins and outs for this day to the processed array
          processed.push(...checkInsAndOuts)
        })

        // Add approved onsite work hours to user's total
          const approvedRequests = requests.filter((req) => req.userId === userId && req.status === "approved")

        for (const request of approvedRequests) {
          const startDateTime = request.startDateTime?.seconds
            ? new Date(request.startDateTime.seconds * 1000)
            : new Date(request.startDateTime)

          const endDateTime = request.endDateTime?.seconds
            ? new Date(request.endDateTime.seconds * 1000)
            : new Date(request.endDateTime)

          const requestDate = new Date(startDateTime)
          requestDate.setHours(0, 0, 0, 0)

          // Check if any part of the request falls on today
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)

          // Calculate duration in minutes
          const durationMs = endDateTime.getTime() - startDateTime.getTime()
          const durationMinutes = Math.round(durationMs / (1000 * 60))

          userTotalMinutesAllTime += durationMinutes

          // If request is for today, add to today's total
          if (requestDate.getTime() === todayDate.getTime()) {
            userTotalMinutesToday += durationMinutes
          }
        }

        // Store stats for this user
        stats[userId] = {
          name: user.name,
          email: user.email,
          totalMinutesToday: userTotalMinutesToday,
          totalHoursToday: Math.floor(userTotalMinutesToday / 60) + (userTotalMinutesToday % 60) / 60,
          totalMinutesAllTime: userTotalMinutesAllTime,
          totalHoursAllTime: Math.floor(userTotalMinutesAllTime / 60) + (userTotalMinutesAllTime % 60) / 60,
        }

        if (userTotalMinutesToday > 0) {
          totalHoursToday += userTotalMinutesToday / 60
          usersWithHoursToday++
        }
      })

      // Sort by date and time (most recent first)
      processed.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        if (dateA !== dateB) return dateB - dateA

        const timeA = a.checkIn ? new Date(a.checkIn.timestamp).getTime() : new Date(a.checkOut!.timestamp).getTime()
        const timeB = b.checkIn ? new Date(b.checkIn.timestamp).getTime() : new Date(b.checkOut!.timestamp).getTime()
        return timeB - timeA
      })

      // Update the dashboard stats
      const todayRecords = processed.filter((record) => record.date === today)
        const newDashboardStats = {
          totalUsers: usersList.length,
          checkedInUsers: usersList.filter((user) => user.checkedIn).length,
        todayAttendance: todayRecords.length > 0 ? new Set(todayRecords.map((r) => r.userId)).size : 0,
        avgHoursToday: usersWithHoursToday > 0 ? Number((totalHoursToday / usersWithHoursToday).toFixed(1)) : 0,
          pendingRequests: requests.filter((req) => req.status === "pending").length,
        }

      setProcessedAttendance(processed)
      setUserStats(stats)
        setDashboardStats(newDashboardStats)
      },
      [setProcessedAttendance, setUserStats, setDashboardStats],
    )

    // Effect to process data when dependencies change
    useEffect(() => {
      if (attendanceRecords.length > 0 && users.length > 0) {
        processAttendanceData(attendanceRecords, users, onsiteRequests)
      }
    }, [attendanceRecords, users, onsiteRequests, processAttendanceData])

    const fetchUsers = useCallback(async () => {
      const { fetchUsers } = await import("../../utils/adminDataService")
      return fetchUsers()
    }, [])

    const fetchAttendanceRecords = useCallback(async () => {
      const { fetchAttendanceRecords } = await import("../../utils/adminDataService")
      return fetchAttendanceRecords()
    }, [])

    const fetchOfficeLocation = useCallback(async () => {
      const { fetchOfficeLocation } = await import("../../utils/adminDataService")
      return fetchOfficeLocation()
    }, [])

    const fetchOnsiteRequests = useCallback(async () => {
      const { fetchOnsiteRequests } = await import("../../utils/adminDataService")
      return fetchOnsiteRequests()
    }, [])

    return {
      fetchUsers,
      fetchAttendanceRecords,
      fetchOfficeLocation,
      fetchOnsiteRequests,
      processAttendanceData,
    }
  }

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth)
      router.replace("/(auth)/login")
    } catch (error) {
      Alert.alert("Error", "Failed to sign out")
    }
  }, [router])

  // Handle request modal actions
  const handleRequestAction = useCallback(
    async (requestId: string, status: "approved" | "rejected") => {
      try {
        const { updateRequestStatus } = await import("../../utils/adminDataService")
        await updateRequestStatus(requestId, status)

      // Update local state
      setOnsiteRequests(onsiteRequests.map((req) => (req.id === requestId ? { ...req, status } : req)))

      setRequestModalVisible(false)
      setSelectedRequest(null)

      Alert.alert("Success", `Request ${status}`)
    } catch (error) {
      console.error("Error updating request:", error)
      Alert.alert("Error", "Failed to update request")
    }
    },
    [onsiteRequests],
  )

  // Handle user role update
  const handleUpdateUserRole = useCallback(
    async (userId: string, isAdmin: boolean) => {
      try {
        const { updateUserRole } = await import("../../utils/adminDataService")
        await updateUserRole(userId, isAdmin)

        // Update local state
        setUsers(users.map((user) => (user.id === userId ? { ...user, isAdmin } : user)))

        Alert.alert("Success", `User role updated to ${isAdmin ? "Admin" : "Regular User"}`)
    } catch (error) {
        console.error("Error updating user role:", error)
        Alert.alert("Error", "Failed to update user role")
      }
    },
    [users],
  )

  // Handle save office location
  const handleSaveOfficeLocation = useCallback(async () => {
    if (!officeLocation.latitude || !officeLocation.longitude || !officeLocation.radius) {
      Alert.alert("Error", "Please fill all fields")
      return
    }

    try {
      const { saveOfficeLocation } = await import("../../utils/adminDataService")
      await saveOfficeLocation(officeLocation)
      Alert.alert("Success", "Office location updated successfully")
    } catch (error) {
      Alert.alert("Error", "Failed to update office location")
    }
  }, [officeLocation])

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    )
  }

        return (
    <SafeAreaView style={styles.container}>
      <AdminHeader />

      <View style={styles.content}>
        <AnimatePresence>
          {activeTab === "dashboard" && (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: 20 }}
              transition={{ type: "timing", duration: 300 }}
              style={styles.tabContainer}
            >
              <DashboardTab
                dashboardStats={dashboardStats}
                processedAttendance={processedAttendance}
                userStats={userStats}
                onsiteRequests={onsiteRequests}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onSelectRequest={(request) => {
                          setSelectedRequest(request)
                          setRequestModalVisible(true)
                        }}
              />
            </MotiView>
          )}

          {activeTab === "users" && (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: 20 }}
              transition={{ type: "timing", duration: 300 }}
              style={styles.tabContainer}
            >
              <UsersTab
                users={users}
                selectedUser={selectedUser}
                setSelectedUser={setSelectedUser}
                processedAttendance={processedAttendance}
                userStats={userStats}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            </MotiView>
          )}

          {activeTab === "requests" && (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: 20 }}
              transition={{ type: "timing", duration: 300 }}
              style={styles.tabContainer}
            >
              <RequestsTab
                onsiteRequests={onsiteRequests}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onSelectRequest={(request) => {
                          setSelectedRequest(request)
                          setRequestModalVisible(true)
                        }}
              />
            </MotiView>
          )}

          {activeTab === "settings" && (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: 20 }}
              transition={{ type: "timing", duration: 300 }}
              style={styles.tabContainer}
            >
              <SettingsTab
                users={users}
                currentUser={auth.currentUser}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onUpdateUserRole={handleUpdateUserRole}
                onSignOut={handleSignOut}
              />
            </MotiView>
          )}

          {activeTab === "location" && (
            <MotiView
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: 20 }}
              transition={{ type: "timing", duration: 300 }}
              style={styles.tabContainer}
            >
              <LocationTab
                officeLocation={officeLocation}
                setOfficeLocation={setOfficeLocation}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onSaveLocation={handleSaveOfficeLocation}
              />
            </MotiView>
          )}
        </AnimatePresence>
                </View>

      <AdminTabBar activeTab={activeTab} onChangeTab={setActiveTab} onResetUser={() => setSelectedUser(null)} />

      <RequestModal
        visible={requestModalVisible}
        request={selectedRequest}
        onClose={() => {
                setRequestModalVisible(false)
                setSelectedRequest(null)
              }}
        onApprove={(requestId) => handleRequestAction(requestId, "approved")}
        onReject={(requestId) => handleRequestAction(requestId, "rejected")}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9fb",
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
    color: "#007AFF",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    position: "relative",
  },
  tabContainer: {
    flex: 1,
  },
})

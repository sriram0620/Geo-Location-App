"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native"
import { auth, db } from "../config/firebase"
import { Clock, MapPin, CheckCircle, Calendar as CalendarIcon, User, ExternalLink } from "lucide-react-native"
import { useFocusEffect } from "@react-navigation/native"
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore"
import * as Location from "expo-location"
import { Calendar } from "react-native-calendars"
// Update the home screen to use the new components
import { RecentActivityCard } from "../../components/home/RecentActivityCard"
import { EffectiveHoursCard } from "../../components/home/EffectiveHoursCard"
import { CheckInStatusCard } from "../../components/HomeComponents"
import { OfflineIndicator } from "../../components/offline/OfflineIndicator"
import { useNetworkStatus } from "../../utils/networkStatus"
import * as localStorageService from "../../utils/localStorageService"
import * as syncService from "../../utils/syncService"

// Custom DateTimePicker component that doesn't rely on native modules
const CustomDateTimePicker = ({ value, onChange, mode }) => {
  const [date, setDate] = useState(value || new Date())

  // For time selection
  const hours = [...Array(24)].map((_, i) => i.toString().padStart(2, "0"))
  const minutes = [...Array(12)].map((_, i) => (i * 5).toString().padStart(2, "0"))

  const handleChange = (newDate) => {
    setDate(newDate)
    onChange({ type: "set", nativeEvent: { timestamp: newDate.getTime() } })
  }

  if (mode === "date") {
    return (
      <View style={styles.customDatePicker}>
        <Calendar
          current={date}
          onDayPress={(day) => {
            const newDate = new Date(date)
            newDate.setFullYear(day.year, day.month - 1, day.day)
            handleChange(newDate)
          }}
          markedDates={{
            [date.toISOString().split("T")[0]]: { selected: true, selectedColor: "#6C63FF" },
          }}
          theme={{
            todayTextColor: "#6C63FF",
            selectedDayBackgroundColor: "#6C63FF",
            arrowColor: "#6C63FF",
          }}
        />
      </View>
    )
  }

  // Time picker
  return (
    <View style={styles.customTimePicker}>
      <View style={styles.timePickerRow}>
        <Text style={styles.timePickerLabel}>Hours:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timePickerScrollContent}
        >
          {hours.map((hour) => (
            <TouchableOpacity
              key={`hour-${hour}`}
              style={[styles.timeOption, date.getHours() === Number.parseInt(hour) && styles.selectedTimeOption]}
              onPress={() => {
                const newDate = new Date(date)
                newDate.setHours(Number.parseInt(hour))
                handleChange(newDate)
              }}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  date.getHours() === Number.parseInt(hour) && styles.selectedTimeOptionText,
                ]}
              >
                {hour}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.timePickerRow}>
        <Text style={styles.timePickerLabel}>Minutes:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timePickerScrollContent}
        >
          {minutes.map((minute) => (
            <TouchableOpacity
              key={`minute-${minute}`}
              style={[styles.timeOption, date.getMinutes() === Number.parseInt(minute) && styles.selectedTimeOption]}
              onPress={() => {
                const newDate = new Date(date)
                newDate.setMinutes(Number.parseInt(minute))
                handleChange(newDate)
              }}
            >
              <Text
                style={[
                  styles.timeOptionText,
                  date.getMinutes() === Number.parseInt(minute) && styles.selectedTimeOptionText,
                ]}
              >
                {minute}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.timePickerDoneButton}
        onPress={() => onChange({ type: "set", nativeEvent: { timestamp: date.getTime() } })}
      >
        <Text style={styles.timePickerDoneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function HomeScreen() {
  // State variables
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activities, setActivities] = useState([])
  const [effectiveHours, setEffectiveHours] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [permissionRequest, setPermissionRequest] = useState({
    reason: "",
    startDate: new Date(),
    endDate: new Date(),
    startTime: {
      hours: new Date().getHours(),
      minutes: new Date().getMinutes(),
    },
    endTime: {
      hours: Math.min(new Date().getHours() + 1, 23),
      minutes: new Date().getMinutes(),
    },
  })
  const [pendingRequests, setPendingRequests] = useState([])
  const [approvedRequests, setApprovedRequests] = useState([])
  const [officeLocation, setOfficeLocation] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [isInOffice, setIsInOffice] = useState(false)
  const [locationPermission, setLocationPermission] = useState(null)
  const [locationSubscription, setLocationSubscription] = useState(null)
  const [showCalendar, setShowCalendar] = useState(null) // 'start' or 'end' or null
  const [showTimePicker, setShowTimePicker] = useState(null) // 'startTime', 'endTime', or null
  const [timePickerMode, setTimePickerMode] = useState("time")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [pendingRecordsCount, setPendingRecordsCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Network status
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus()

  // For real-time updates
  const effectiveHoursInterval = useRef(null)
  const realTimeListeners = useRef([])

  // Sync data when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      handleSync()
      resetOfflineFlag()
    }
  }, [isOnline, wasOffline])

  // Check for pending records
  useEffect(() => {
    const checkPendingRecords = async () => {
      const pendingRecords = await localStorageService.getPendingAttendance()
      setPendingRecordsCount(pendingRecords.length)
    }

    checkPendingRecords()
  }, [isOnline])

  // Request location permissions
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocationPermission(status === "granted")

      if (status === "granted") {
        startLocationTracking()
      }
    })()

    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }

      // Clear interval when component unmounts
      if (effectiveHoursInterval.current) {
        clearInterval(effectiveHoursInterval.current)
      }

      // Unsubscribe from real-time listeners
      realTimeListeners.current.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  // Handle sync function
  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert("Offline", "You are currently offline. Please try again when you're back online.")
      return
    }

    try {
      setIsSyncing(true)
      await syncService.performFullSync()

      // Refresh data after sync
      await fetchUserData()

      // Update pending records count
      const pendingRecords = await localStorageService.getPendingAttendance()
      setPendingRecordsCount(pendingRecords.length)

      Alert.alert("Sync Complete", "Your offline data has been successfully synced.")
    } catch (error) {
      console.error("Error syncing data:", error)
      Alert.alert("Sync Error", "There was an error syncing your data. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  // Start location tracking
  const startLocationTracking = async () => {
    try {
      // Get current location immediately
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      setUserLocation(currentLocation.coords)

      // Then subscribe to location updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 30000, // Update every 30 seconds
        },
        (location) => {
          setUserLocation(location.coords)
          checkIfInOffice(location.coords)
        },
      )

      setLocationSubscription(subscription)
    } catch (error) {
      console.error("Error starting location tracking:", error)
    }
  }

  // Check if user is in office based on geofencing
  const checkIfInOffice = async (userCoords) => {
    if (!officeLocation || !userCoords) return false

    const distance = calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      officeLocation.latitude,
      officeLocation.longitude,
    )

    const inOffice = distance <= officeLocation.radius
    setIsInOffice(inOffice)

    // If user status changed, update check-in/out
    if (userData) {
      if (inOffice && !userData.checkedIn) {
        // User entered office - check in
        await handleAutoCheckIn()
      } else if (!inOffice && userData.checkedIn) {
        // User left office - check out
        await handleAutoCheckOut()
      }
    }

    return inOffice
  }

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // Handle automatic check-in
  const handleAutoCheckIn = async () => {
    try {
      if (!auth.currentUser || !userLocation) return

      const timestamp = new Date().toISOString()
      const checkInId = `${auth.currentUser.uid}_${timestamp}`

      // Create check-in record
      const checkInData = {
        id: checkInId,
        type: "check-in",
        timestamp,
        timestampDate: Timestamp.fromDate(new Date()),
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        userId: auth.currentUser.uid,
        paired: false,
        automatic: true,
      }

      if (isOnline) {
        // Add to attendance collection
        await setDoc(doc(db, "attendance", checkInId), checkInData)

        // Update user document
        const userRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userRef, {
          checkedIn: true,
          lastCheckIn: timestamp,
          currentCheckInId: checkInId,
          lastLocation: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        })
      } else {
        // Save to local storage for later sync
        await localStorageService.savePendingAttendance(checkInData)

        // Update local user data
        const userData = (await localStorageService.getUserData()) || { id: auth.currentUser.uid }
        await localStorageService.saveUserData({
          ...userData,
          checkedIn: true,
          lastCheckIn: timestamp,
          currentCheckInId: checkInId,
          lastLocation: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        })
      }

      // Update local state
      setUserData({
        ...userData,
        checkedIn: true,
        lastCheckIn: timestamp,
        currentCheckInId: checkInId,
      })

      // Update pending records count if offline
      if (!isOnline) {
        const pendingRecords = await localStorageService.getPendingAttendance()
        setPendingRecordsCount(pendingRecords.length)
      }

      // Start real-time effective hours update
      startEffectiveHoursUpdate()

      // Refresh data
      fetchUserData()
    } catch (error) {
      console.error("Auto check-in error:", error)
    }
  }

  // Handle automatic check-out
  const handleAutoCheckOut = async () => {
    try {
      if (!auth.currentUser || !userLocation) return

      const timestamp = new Date().toISOString()
      const checkOutId = `${auth.currentUser.uid}_${timestamp}`

      // Calculate duration if we have a check-in time
      let durationMinutes = 0
      if (userData?.lastCheckIn) {
        const checkInTime = new Date(userData.lastCheckIn)
        const checkOutTime = new Date(timestamp)
        const durationMs = checkOutTime.getTime() - checkInTime.getTime()
        durationMinutes = Math.round(durationMs / (1000 * 60))
      }

      // Create check-out record
      const checkOutData = {
        id: checkOutId,
        type: "check-out",
        timestamp,
        timestampDate: Timestamp.fromDate(new Date()),
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        userId: auth.currentUser.uid,
        checkInId: userData?.currentCheckInId,
        durationMinutes,
        automatic: true,
      }

      if (isOnline) {
        // Add to attendance collection
        await setDoc(doc(db, "attendance", checkOutId), checkOutData)

        // Update the check-in record to mark it as paired
        if (userData?.currentCheckInId) {
          await updateDoc(doc(db, "attendance", userData.currentCheckInId), {
            paired: true,
            checkOutId: checkOutId,
            durationMinutes,
          })
        }

        // Update user document
        const userRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userRef, {
          checkedIn: false,
          lastCheckOut: timestamp,
          currentCheckInId: null,
          lastLocation: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        })
      } else {
        // Save to local storage for later sync
        await localStorageService.savePendingAttendance(checkOutData)

        // Update local user data
        const userData = (await localStorageService.getUserData()) || { id: auth.currentUser.uid }
        await localStorageService.saveUserData({
          ...userData,
          checkedIn: false,
          lastCheckOut: timestamp,
          currentCheckInId: null,
          lastLocation: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        })
      }

      // Update local state
      setUserData({
        ...userData,
        checkedIn: false,
        lastCheckOut: timestamp,
        currentCheckInId: null,
      })

      // Update pending records count if offline
      if (!isOnline) {
        const pendingRecords = await localStorageService.getPendingAttendance()
        setPendingRecordsCount(pendingRecords.length)
      }

      // Stop real-time effective hours update
      if (effectiveHoursInterval.current) {
        clearInterval(effectiveHoursInterval.current)
        effectiveHoursInterval.current = null
      }

      // Refresh data
      fetchUserData()
    } catch (error) {
      console.error("Auto check-out error:", error)
    }
  }

  // Start real-time effective hours update
  const startEffectiveHoursUpdate = () => {
    // Clear any existing interval
    if (effectiveHoursInterval.current) {
      clearInterval(effectiveHoursInterval.current)
    }

    // Update effective hours every minute
    effectiveHoursInterval.current = setInterval(() => {
      if (userData?.checkedIn) {
        fetchActivitiesAndCalculateHours()
      }
    }, 60000) // Every minute
  }

  // Fix the Firebase index error in the fetchActivitiesAndCalculateHours function

  // Fetch activities and calculate hours
  const fetchActivitiesAndCalculateHours = async () => {
    try {
      if (!auth.currentUser) return

      let activitiesList = []

      if (isOnline) {
        try {
          // Get activities with a more specific query
          const activitiesQuery = query(
            collection(db, "attendance"),
            where("userId", "==", auth.currentUser.uid),
            orderBy("timestamp", "desc"),
            limit(20), // Fetch more to ensure we have enough data for calculations
          )

          const activitiesSnapshot = await getDocs(activitiesQuery)
          activitiesSnapshot.forEach((doc) => {
            const data = doc.data()
            activitiesList.push({
              id: doc.id,
              type: data.type,
              timestamp: data.timestamp,
              location: data.location || null,
              checkInId: data.checkInId || null,
              paired: data.paired || false,
              durationMinutes: data.durationMinutes || 0,
            })
          })
        } catch (error) {
          console.error("Firebase query error:", error)
          // If the query fails due to missing index, try a simpler query
          if (error.toString().includes("requires an index")) {
            console.log("Falling back to simpler query without ordering")
            const simpleQuery = query(
              collection(db, "attendance"),
              where("userId", "==", auth.currentUser.uid),
              limit(30),
            )

            const simpleSnapshot = await getDocs(simpleQuery)
            const tempActivities = []
            simpleSnapshot.forEach((doc) => {
              tempActivities.push({
                id: doc.id,
                type: doc.data().type,
                timestamp: doc.data().timestamp,
                location: doc.data().location || null,
                checkInId: doc.data().checkInId || null,
                paired: doc.data().paired || false,
                durationMinutes: doc.data().durationMinutes || 0,
              })
            })

            // Sort client-side instead of using orderBy
            activitiesList = tempActivities
              .sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              })
              .slice(0, 20)
          }
        }
      }

      // Get pending records from local storage
      const pendingRecords = await localStorageService.getPendingAttendance()

      // Filter to only include records for the current user
      const userPendingRecords = pendingRecords.filter((record) => record.userId === auth.currentUser?.uid)

      // Combine online and offline records
      activitiesList = [...activitiesList, ...userPendingRecords]

      // Sort by timestamp (most recent first)
      activitiesList.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      // Take only the 5 most recent for display
      const recentActivities = activitiesList.slice(0, 5)
      setActivities(recentActivities)

      // Calculate effective hours with the complete dataset
      calculateEffectiveHours(activitiesList)
    } catch (error) {
      console.error("Error fetching activities:", error)
    }
  }

  // Fetch user data and related information
  const fetchUserData = async () => {
    if (!auth.currentUser) return

    try {
      setLoading(true)

      // Try to get office location from local storage first
      let officeData = await localStorageService.getOfficeLocation()

      // If not in local storage or online, try to get from Firebase
      if (!officeData && isOnline) {
        const officeDoc = await getDoc(doc(db, "settings", "office_location"))
        if (officeDoc.exists()) {
          officeData = officeDoc.data()
          // Save to local storage for offline use
          await localStorageService.saveOfficeLocation(officeData)
        }
      }

      if (officeData) {
        setOfficeLocation(officeData)

        // Check if user is in office
        if (userLocation) {
          checkIfInOffice(userLocation)
        }
      }

      // Try to get user data from local storage first
      let userData = await localStorageService.getUserData()

      // If online, get from Firebase and update local storage
      if (isOnline) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
        if (userDoc.exists()) {
          userData = userDoc.data()
          // Save to local storage for offline use
          await localStorageService.saveUserData({
            id: auth.currentUser.uid,
            checkedIn: userData.checkedIn || false,
            lastCheckIn: userData.lastCheckIn || null,
            lastCheckOut: userData.lastCheckOut || null,
            currentCheckInId: userData.currentCheckInId || null,
            lastLocation: userData.lastLocation || null,
          })
        }
      }

      if (userData) {
        setUserData(userData)

        // If checked in, start real-time effective hours update
        if (userData.checkedIn) {
          startEffectiveHoursUpdate()
        }
      }

      // Fetch activities directly instead of using a listener
      await fetchActivitiesAndCalculateHours()

      // Check for pending records
      const pendingRecords = await localStorageService.getPendingAttendance()
      setPendingRecordsCount(pendingRecords.length)

      // Set up real-time listener for onsite requests if online
      if (isOnline) {
        const unsubscribeRequests = onSnapshot(collection(db, "onsiteRequests"), (snapshot) => {
          const pendingList = []
          const approvedList = []

          snapshot.forEach((doc) => {
            const data = doc.data()
            if (data.userId === auth.currentUser.uid) {
              if (data.status === "pending") {
                pendingList.push({
                  id: doc.id,
                  ...data,
                })
              } else if (data.status === "approved") {
                approvedList.push({
                  id: doc.id,
                  ...data,
                })
              }
            }
          })

          setPendingRequests(pendingList)
          setApprovedRequests(approvedList)
        })

        realTimeListeners.current.push(unsubscribeRequests)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      Alert.alert("Error", "Failed to load data. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Improve the calculateEffectiveHours function for more accurate calculations
  const calculateEffectiveHours = (activities, approvedOnsiteWork = approvedRequests) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Filter activities for today
      const todayActivities = activities.filter((activity) => {
        const activityDate = new Date(activity.timestamp)
        const activityDay = new Date(activityDate)
        activityDay.setHours(0, 0, 0, 0)
        return activityDay.getTime() === today.getTime()
      })

      // Sort by timestamp
      todayActivities.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })

      let totalMinutes = 0

      // First, check for paired check-ins and check-outs with duration
      const pairedActivities = todayActivities.filter(
        (activity) => activity.type === "check-out" && activity.checkInId && activity.durationMinutes,
      )

      pairedActivities.forEach((activity) => {
        totalMinutes += activity.durationMinutes
      })

      // Then handle unpaired check-ins
      const unpaired = new Map()

      todayActivities.forEach((activity) => {
        if (activity.type === "check-in" && !activity.paired) {
          unpaired.set(activity.id, activity)
        }
      })

      // If still checked in, count time until now for the most recent unpaired check-in
      if (userData?.checkedIn && unpaired.size > 0) {
        // Find the most recent unpaired check-in
        let mostRecentCheckIn = null
        let mostRecentTime = 0

        unpaired.forEach((checkIn) => {
          const checkInTime = new Date(checkIn.timestamp).getTime()
          if (checkInTime > mostRecentTime) {
            mostRecentTime = checkInTime
            mostRecentCheckIn = checkIn
          }
        })

        if (mostRecentCheckIn) {
          const now = new Date()
          const checkInTime = new Date(mostRecentCheckIn.timestamp)
          const diffMs = now - checkInTime
          totalMinutes += diffMs / (1000 * 60)
        }
      }

      // Add approved onsite work hours for today
      if (approvedOnsiteWork && approvedOnsiteWork.length > 0) {
        for (const request of approvedOnsiteWork) {
          const startDateTime = request.startDateTime?.seconds
            ? new Date(request.startDateTime.seconds * 1000)
            : new Date(request.startDateTime)

          const endDateTime = request.endDateTime?.seconds
            ? new Date(request.endDateTime.seconds * 1000)
            : new Date(request.endDateTime)

          // Check if request is for today
          const requestDate = new Date(startDateTime)
          requestDate.setHours(0, 0, 0, 0)

          if (requestDate.getTime() === today.getTime()) {
            // Calculate overlap with today
            const startOfDay = new Date(today)
            const endOfDay = new Date(today)
            endOfDay.setHours(23, 59, 59, 999)

            const effectiveStart = startDateTime < startOfDay ? startOfDay : startDateTime
            let effectiveEndDateTime = endDateTime // Declare effectiveEndDateTime here

            effectiveEndDateTime = endDateTime > endOfDay ? endOfDay : effectiveEndDateTime

            if (effectiveEndDateTime > effectiveStart) {
              const diffMs = effectiveEndDateTime - effectiveStart
              totalMinutes += diffMs / (1000 * 60)
            }
          }
        }
      }

      setEffectiveHours(totalMinutes / 60)
    } catch (error) {
      console.error("Error calculating effective hours:", error)
    }
  }

  // Fetch data when the component mounts and when the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData()
      return () => {
        // Clean up when tab loses focus
        if (effectiveHoursInterval.current) {
          clearInterval(effectiveHoursInterval.current)
          effectiveHoursInterval.current = null
        }
      }
    }, []),
  )

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true)
    fetchUserData()
  }

  // Format time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return "N/A"
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    const date = new Date(timestamp)
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Handle date selection from calendar
  const handleDateSelect = (day) => {
    const selectedDate = new Date(day.timestamp)

    if (showCalendar === "start") {
      setPermissionRequest({
        ...permissionRequest,
        startDate: selectedDate,
      })
    } else if (showCalendar === "end") {
      setPermissionRequest({
        ...permissionRequest,
        endDate: selectedDate,
      })
    }

    setShowCalendar(null)
  }

  // Handle time picker changes
  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowTimePicker(null)
    }

    if (selectedTime) {
      const hours = selectedTime.getHours()
      const minutes = selectedTime.getMinutes()

      if (showTimePicker === "startTime") {
        setPermissionRequest({
          ...permissionRequest,
          startTime: { hours, minutes },
        })
      } else if (showTimePicker === "endTime") {
        setPermissionRequest({
          ...permissionRequest,
          endTime: { hours, minutes },
        })
      }
    }
  }

  // Format time object to string
  const formatTimeObj = (timeObj) => {
    const hours = timeObj.hours.toString().padStart(2, "0")
    const minutes = timeObj.minutes.toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }

  // Generate time options for dropdown
  const generateTimeOptions = () => {
    const options = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hours = h.toString().padStart(2, "0")
        const minutes = m.toString().padStart(2, "0")
        options.push(`${hours}:${minutes}`)
      }
    }
    return options
  }

  // Submit onsite work permission request
  const submitPermissionRequest = async () => {
    try {
      if (!permissionRequest.reason) {
        Alert.alert("Error", "Please provide a reason for your request")
        return
      }

      // Create start date time
      const startDateTime = new Date(permissionRequest.startDate)
      startDateTime.setHours(permissionRequest.startTime.hours, permissionRequest.startTime.minutes, 0, 0)

      // Create end date time
      const endDateTime = new Date(permissionRequest.endDate)
      endDateTime.setHours(permissionRequest.endTime.hours, permissionRequest.endTime.minutes, 0, 0)

      if (startDateTime >= endDateTime) {
        Alert.alert("Error", "End time must be after start time")
        return
      }

      if (!isOnline) {
        Alert.alert("Offline", "You are currently offline. Please try again when you're back online.")
        return
      }

      await addDoc(collection(db, "onsiteRequests"), {
        userId: auth.currentUser.uid,
        userName: userData?.name || auth.currentUser.email.split("@")[0],
        reason: permissionRequest.reason,
        startDateTime: Timestamp.fromDate(startDateTime),
        endDateTime: Timestamp.fromDate(endDateTime),
        status: "pending",
        createdAt: serverTimestamp(),
      })

      Alert.alert("Success", "Your request has been submitted for approval")
      setModalVisible(false)

      // Reset form
      setPermissionRequest({
        reason: "",
        startDate: new Date(),
        endDate: new Date(),
        startTime: {
          hours: new Date().getHours(),
          minutes: new Date().getMinutes(),
        },
        endTime: {
          hours: Math.min(new Date().getHours() + 1, 23),
          minutes: new Date().getMinutes(),
        },
      })

      // Refresh data
      fetchUserData()
    } catch (error) {
      console.error("Error submitting request:", error)
      Alert.alert("Error", "Failed to submit request. Please try again.")
    }
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    )
  }

  // In the render section, replace the existing cards with the new components
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6C63FF"]} />}
    >
      {/* Greeting Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{userData?.name || auth.currentUser?.email?.split("@")[0] || "User"}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={24} color="#fff" />
          </View>
        </View>
      </View>

      {/* Offline Indicator */}
      <OfflineIndicator
        isOnline={isOnline}
        pendingCount={pendingRecordsCount}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      {/* Location Status */}
      {locationPermission !== null && (
        <View style={[styles.locationStatus, isInOffice ? styles.locationStatusIn : styles.locationStatusOut]}>
          <MapPin size={16} color={isInOffice ? "#fff" : "#6C757D"} />
          <Text style={[styles.locationStatusText, isInOffice && styles.locationStatusTextIn]}>
            {locationPermission
              ? isInOffice
                ? "You are in the office"
                : "You are outside the office"
              : "Location permission denied"}
          </Text>
        </View>
      )}

      {/* Check-in Status Card */}
      <CheckInStatusCard
        isCheckedIn={userData?.checkedIn}
        lastCheckIn={userData?.lastCheckIn}
        lastCheckOut={userData?.lastCheckOut}
        onPress={() => {}}
      />

      {/* Effective Hours Card */}
      <EffectiveHoursCard effectiveHours={effectiveHours} />

      {/* Request Permission Button */}
      <TouchableOpacity
        style={[styles.requestButton, !isOnline && styles.buttonDisabled]}
        onPress={() => setModalVisible(true)}
        disabled={!isOnline}
      >
        <ExternalLink size={20} color="#fff" />
        <Text style={styles.requestButtonText}>
          {isOnline ? "Request Onsite Work Permission" : "Request Onsite Work (Offline)"}
        </Text>
      </TouchableOpacity>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <CalendarIcon size={20} color="#6C63FF" />
              <Text style={styles.cardTitle}>Pending Requests</Text>
            </View>
          </View>

          {pendingRequests.map((request, index) => {
            const startDate = request.startDateTime?.seconds
              ? new Date(request.startDateTime.seconds * 1000)
              : new Date()
            const endDate = request.endDateTime?.seconds ? new Date(request.endDateTime.seconds * 1000) : new Date()

            return (
              <View key={index} style={styles.pendingRequestItem}>
                <View style={styles.pendingRequestContent}>
                  <Text style={styles.pendingRequestReason}>{request.reason}</Text>
                  <Text style={styles.pendingRequestDate}>
                    {startDate.toLocaleDateString()}{" "}
                    {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                    {endDate.toLocaleDateString() === startDate.toLocaleDateString()
                      ? ""
                      : ` ${endDate.toLocaleDateString()}`}{" "}
                    {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={styles.pendingRequestStatus}>
                  <Text style={styles.pendingStatusText}>Pending</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* Approved Requests */}
      {approvedRequests.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <CheckCircle size={20} color="#6C63FF" />
              <Text style={styles.cardTitle}>Approved Onsite Work</Text>
            </View>
          </View>

          {approvedRequests.map((request, index) => {
            const startDate = request.startDateTime?.seconds
              ? new Date(request.startDateTime.seconds * 1000)
              : new Date()
            const endDate = request.endDateTime?.seconds ? new Date(request.endDateTime.seconds * 1000) : new Date()

            return (
              <View key={index} style={styles.pendingRequestItem}>
                <View style={styles.pendingRequestContent}>
                  <Text style={styles.pendingRequestReason}>{request.reason}</Text>
                  <Text style={styles.pendingRequestDate}>
                    {startDate.toLocaleDateString()}{" "}
                    {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -
                    {endDate.toLocaleDateString() === startDate.toLocaleDateString()
                      ? ""
                      : ` ${endDate.toLocaleDateString()}`}{" "}
                    {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={styles.approvedRequestStatus}>
                  <Text style={styles.approvedStatusText}>Approved</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* Recent Activity */}
      <RecentActivityCard activities={activities} formatDate={formatDate} formatTime={formatTime} />

      {/* Permission Request Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Onsite Work Permission</Text>

            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter reason for onsite work"
              value={permissionRequest.reason}
              onChangeText={(text) => setPermissionRequest({ ...permissionRequest, reason: text })}
              multiline
            />

            {/* Calendar for date selection */}
            {showCalendar && (
              <View style={styles.calendarContainer}>
                <Calendar
                  onDayPress={handleDateSelect}
                  markedDates={{
                    [showCalendar === "start"
                      ? permissionRequest.startDate.toISOString().split("T")[0]
                      : permissionRequest.endDate.toISOString().split("T")[0]]: {
                      selected: true,
                      selectedColor: "#6C63FF",
                    },
                  }}
                  theme={{
                    todayTextColor: "#6C63FF",
                    selectedDayBackgroundColor: "#6C63FF",
                    arrowColor: "#6C63FF",
                  }}
                />
                <TouchableOpacity style={styles.closeCalendarButton} onPress={() => setShowCalendar(null)}>
                  <Text style={styles.closeCalendarButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Time picker for time selection */}
            {showTimePicker && Platform.OS !== "web" && (
              <CustomDateTimePicker
                value={
                  showTimePicker === "startTime"
                    ? (() => {
                        const date = new Date()
                        date.setHours(permissionRequest.startTime.hours)
                        date.setMinutes(permissionRequest.startTime.minutes)
                        return date
                      })()
                    : (() => {
                        const date = new Date()
                        date.setHours(permissionRequest.endTime.hours)
                        date.setMinutes(permissionRequest.endTime.minutes)
                        return date
                      })()
                }
                mode={timePickerMode}
                onChange={handleTimeChange}
              />
            )}

            {!showCalendar && (
              <>
                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateTimeColumn}>
                    <Text style={styles.inputLabel}>Start Date</Text>
                    <TouchableOpacity style={styles.dateTimePicker} onPress={() => setShowCalendar("start")}>
                      <Text>{permissionRequest.startDate.toLocaleDateString()}</Text>
                      <CalendarIcon size={16} color="#6C757D" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateTimeColumn}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TouchableOpacity
                      style={styles.dateTimePicker}
                      onPress={() => {
                        if (Platform.OS === "web") {
                          // Web implementation uses dropdown
                        } else {
                          setShowTimePicker("startTime")
                          setTimePickerMode("time")
                        }
                      }}
                    >
                      <Text>{formatTimeObj(permissionRequest.startTime)}</Text>
                      <Clock size={16} color="#6C757D" />
                    </TouchableOpacity>

                    {Platform.OS === "web" && (
                      <View style={styles.timeDropdownContainer}>
                        <select
                          style={styles.timeDropdown}
                          value={formatTimeObj(permissionRequest.startTime)}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":").map(Number)
                            setPermissionRequest({
                              ...permissionRequest,
                              startTime: { hours, minutes },
                            })
                          }}
                        >
                          {generateTimeOptions().map((time) => (
                            <option key={`start-${time}`} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.dateTimeContainer}>
                  <View style={styles.dateTimeColumn}>
                    <Text style={styles.inputLabel}>End Date</Text>
                    <TouchableOpacity style={styles.dateTimePicker} onPress={() => setShowCalendar("end")}>
                      <Text>{permissionRequest.endDate.toLocaleDateString()}</Text>
                      <CalendarIcon size={16} color="#6C757D" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateTimeColumn}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TouchableOpacity
                      style={styles.dateTimePicker}
                      onPress={() => {
                        if (Platform.OS === "web") {
                          // Web implementation uses dropdown
                        } else {
                          setShowTimePicker("endTime")
                          setTimePickerMode("time")
                        }
                      }}
                    >
                      <Text>{formatTimeObj(permissionRequest.endTime)}</Text>
                      <Clock size={16} color="#6C757D" />
                    </TouchableOpacity>

                    {Platform.OS === "web" && (
                      <View style={styles.timeDropdownContainer}>
                        <select
                          style={styles.timeDropdown}
                          value={formatTimeObj(permissionRequest.endTime)}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":").map(Number)
                            setPermissionRequest({
                              ...permissionRequest,
                              endTime: { hours, minutes },
                            })
                          }}
                        >
                          {generateTimeOptions().map((time) => (
                            <option key={`end-${time}`} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={submitPermissionRequest}>
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  greeting: {
    fontSize: 16,
    color: "#6C757D",
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
  },
  // Location status styles
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationStatusIn: {
    backgroundColor: "#6C63FF",
  },
  locationStatusOut: {
    backgroundColor: "#F1F3F5",
  },
  locationStatusText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6C757D",
  },
  locationStatusTextIn: {
    color: "#fff",
  },
  // Status card styles
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCardContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusIconContainer: {
    marginRight: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 4,
  },
  statusTitleCheckedIn: {
    color: "#fff",
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#6C757D",
  },
  statusSubtitleCheckedIn: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C63FF",
    marginRight: 8,
  },
  statusButtonTextActive: {
    color: "#fff",
  },
  // Card styles
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
  // Hours card styles
  hoursContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  hoursStat: {
    alignItems: "center",
    marginRight: 20,
  },
  hoursValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#6C63FF",
  },
  hoursLabel: {
    fontSize: 14,
    color: "#6C757D",
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6C63FF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6C757D",
  },
  // Request button styles
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  // Activity styles
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
  // Pending request styles
  pendingRequestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  pendingRequestContent: {
    flex: 1,
  },
  pendingRequestReason: {
    fontSize: 14,
    fontWeight: "500",
    color: "#212529",
    marginBottom: 2,
  },
  pendingRequestDate: {
    fontSize: 12,
    color: "#6C757D",
  },
  pendingRequestStatus: {
    backgroundColor: "#FFF4E5",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pendingStatusText: {
    fontSize: 12,
    color: "#FD7E14",
    fontWeight: "500",
  },
  approvedRequestStatus: {
    backgroundColor: "#E5F9F6",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  approvedStatusText: {
    fontSize: 12,
    color: "#20C997",
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#212529",
    marginBottom: 16,
    minHeight: 80,
  },
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateTimeColumn: {
    width: "48%",
  },
  dateTimePicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    padding: 12,
  },
  timeDropdownContainer: {
    marginTop: 8,
  },
  timeDropdown: {
    width: "100%",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
  },
  calendarContainer: {
    marginBottom: 16,
  },
  closeCalendarButton: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  closeCalendarButtonText: {
    color: "#6C63FF",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F8F9FA",
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: "#6C63FF",
    marginLeft: 8,
  },
  cancelButtonText: {
    color: "#6C757D",
    fontWeight: "600",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  // Custom date picker styles
  customDatePicker: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  customTimePicker: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
  },
  timePickerRow: {
    marginBottom: 15,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#495057",
  },
  timePickerScrollContent: {
    paddingVertical: 5,
  },
  timeOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  selectedTimeOption: {
    backgroundColor: "#6C63FF",
    borderColor: "#6C63FF",
  },
  timeOptionText: {
    fontSize: 14,
    color: "#495057",
  },
  selectedTimeOptionText: {
    color: "#fff",
    fontWeight: "600",
  },
  timePickerDoneButton: {
    backgroundColor: "#6C63FF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  timePickerDoneButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
})

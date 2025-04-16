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
import {
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  ArrowRight,
  User,
  ExternalLink,
} from "lucide-react-native"
import { useFocusEffect } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
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
} from "firebase/firestore"
import * as Location from "expo-location"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Calendar } from "react-native-calendars"

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
  const [showTimePicker, setShowTimePicker] = useState(null) // 'startHours', 'startMinutes', 'endHours', 'endMinutes', or null
  const [timePickerMode, setTimePickerMode] = useState("time")
  const [selectedDate, setSelectedDate] = useState(new Date())

  // For real-time updates
  const effectiveHoursInterval = useRef(null)
  const realTimeListeners = useRef([])

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
      const userRef = doc(db, "users", auth.currentUser.uid)

      // Create check-in record
      const checkInData = {
        type: "check-in",
        timestamp,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        userId: auth.currentUser.uid,
      }

      // Add to attendance collection
      await addDoc(collection(db, "attendance"), {
        ...checkInData,
      })

      // Update user document
      await updateDoc(userRef, {
        checkedIn: true,
        lastCheckIn: timestamp,
        lastLocation: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      })

      // Update local state
      setUserData({
        ...userData,
        checkedIn: true,
        lastCheckIn: timestamp,
      })

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
      const userRef = doc(db, "users", auth.currentUser.uid)

      // Create check-out record
      const checkOutData = {
        type: "check-out",
        timestamp,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        userId: auth.currentUser.uid,
      }

      // Add to attendance collection
      await addDoc(collection(db, "attendance"), {
        ...checkOutData,
      })

      // Update user document
      await updateDoc(userRef, {
        checkedIn: false,
        lastCheckOut: timestamp,
        lastLocation: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      })

      // Update local state
      setUserData({
        ...userData,
        checkedIn: false,
        lastCheckOut: timestamp,
      })

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

  // Fetch activities and calculate hours
  const fetchActivitiesAndCalculateHours = async () => {
    try {
      if (!auth.currentUser) return

      // Get activities
      const activitiesSnapshot = await getDocs(collection(db, "attendance"))
      const activitiesList = []

      activitiesSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.userId === auth.currentUser.uid) {
          activitiesList.push({
            id: doc.id,
            type: data.type,
            timestamp: data.timestamp,
            location: data.location || null,
          })
        }
      })

      // Set activities state
      setActivities(activitiesList.slice(0, 5).sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      }));

      // Calculate effective hours with the current approved requests
      calculateEffectiveHours(activitiesList, approvedRequests)
    } catch (error) {
      console.error("Error fetching activities:", error)
    }
  }

  // Fetch user data and related information
  const fetchUserData = async () => {
    try {
      if (!auth.currentUser) return

      // Get office location from settings
      const officeDoc = await getDoc(doc(db, "settings", "office_location"))
      if (officeDoc.exists()) {
        const officeData = officeDoc.data()
        setOfficeLocation(officeData)

        // Check if user is in office
        if (userLocation) {
          checkIfInOffice(userLocation)
        }
      }

      // Get user document
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
      if (userDoc.exists()) {
        setUserData(userDoc.data())

        // If checked in, start real-time effective hours update
        if (userDoc.data().checkedIn) {
          startEffectiveHoursUpdate()
        }
      }

      // Set up real-time listener for attendance records
      const unsubscribeAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
        const activitiesList = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.userId === auth.currentUser.uid) {
            activitiesList.push({
              id: doc.id,
              type: data.type,
              timestamp: data.timestamp,
              location: data.location || null,
            })
          }
        })

        // Sort by timestamp (most recent first)
        activitiesList.sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        })

        // Take only the 5 most recent
        const recentActivities = activitiesList.slice(0, 5)
        setActivities(recentActivities)

        // Calculate effective hours
        calculateEffectiveHours(activitiesList)
      })

      realTimeListeners.current.push(unsubscribeAttendance)

      // Set up real-time listener for onsite requests
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

        // Call fetchActivitiesAndCalculateHours to get fresh activities and calculate hours
        fetchActivitiesAndCalculateHours()
      })

      realTimeListeners.current.push(unsubscribeRequests)
    } catch (error) {
      console.error("Error fetching user data:", error)
      Alert.alert("Error", "Failed to load data. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Calculate effective working hours
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
      let lastCheckIn = null

      // Calculate time between check-in and check-out pairs
      for (const activity of todayActivities) {
        if (activity.type === "check-in") {
          lastCheckIn = new Date(activity.timestamp)
        } else if (activity.type === "check-out" && lastCheckIn) {
          const checkOut = new Date(activity.timestamp)
          const diffMs = checkOut - lastCheckIn
          totalMinutes += diffMs / (1000 * 60)
          lastCheckIn = null
        }
      }

      // If still checked in, count time until now
      if (lastCheckIn && userData?.checkedIn) {
        const now = new Date()
        const diffMs = now - lastCheckIn
        totalMinutes += diffMs / (1000 * 60)
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
            const effectiveEndDateTime = endDateTime > endOfDay ? endOfDay : endDateTime

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
      <LinearGradient
        colors={userData?.checkedIn ? ["#6C63FF", "#5A52CC"] : ["#F8F9FA", "#F1F3F5"]}
        style={styles.statusCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statusCardContent}>
          <View style={styles.statusIconContainer}>
            {userData?.checkedIn ? <CheckCircle size={32} color="#fff" /> : <XCircle size={32} color="#FF6B6B" />}
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusTitle, userData?.checkedIn && styles.statusTitleCheckedIn]}>
              {userData?.checkedIn ? "Currently Checked In" : "Not Checked In"}
            </Text>
            <Text style={[styles.statusSubtitle, userData?.checkedIn && styles.statusSubtitleCheckedIn]}>
              {userData?.checkedIn
                ? `Since ${formatTime(userData.lastCheckIn)}`
                : userData?.lastCheckOut
                  ? `Last checkout: ${formatTime(userData.lastCheckOut)}`
                  : "No recent check-in records"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.statusButton, userData?.checkedIn && styles.statusButtonActive]}
          onPress={() => {}}
        >
          <Text style={[styles.statusButtonText, userData?.checkedIn && styles.statusButtonTextActive]}>
            {userData?.checkedIn ? "View Details" : "Go to Location Tab"}
          </Text>
          <ArrowRight size={16} color={userData?.checkedIn ? "#fff" : "#6C63FF"} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Effective Hours Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Clock size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Today's Working Hours</Text>
          </View>
        </View>

        <View style={styles.hoursContainer}>
          <View style={styles.hoursStat}>
            <Text style={styles.hoursValue}>{effectiveHours.toFixed(2)}</Text>
            <Text style={styles.hoursLabel}>Hours</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min((effectiveHours / 8) * 100, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {effectiveHours >= 8
                ? "Daily target achieved!"
                : `${((8 - effectiveHours) * 60).toFixed(0)} minutes remaining to target`}
            </Text>
          </View>
        </View>
      </View>

      {/* Request Permission Button */}
      <TouchableOpacity style={styles.requestButton} onPress={() => setModalVisible(true)}>
        <ExternalLink size={20} color="#fff" />
        <Text style={styles.requestButtonText}>Request Onsite Work Permission</Text>
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Clock size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Recent Activity</Text>
          </View>
        </View>

        {activities.length > 0 ? (
          activities.map((activity, index) => (
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
          ))
        ) : (
          <Text style={styles.noActivityText}>No recent activities</Text>
        )}
      </View>

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
              <DateTimePicker
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
                mode="time"
                is24Hour={true}
                display="default"
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
})

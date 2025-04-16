"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native"
import * as Location from "expo-location"
import { MapPin, AlertCircle, LogIn, LogOut, Navigation, Clock, CheckCircle, XCircle } from "lucide-react-native"
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  arrayUnion,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore"
import { auth, db } from "../config/firebase"
import { LinearGradient } from "expo-linear-gradient"
import { MotiView } from "moti"
import { formatDistanceToNow } from "date-fns"

const { width } = Dimensions.get("window")

export default function LocationScreen() {
  // State variables
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [isInOffice, setIsInOffice] = useState<boolean | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [checkedIn, setCheckedIn] = useState(false)
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null)
  const [lastCheckOut, setLastCheckOut] = useState<string | null>(null)
  const [officeLocation, setOfficeLocation] = useState<any>(null)
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState<string>("0h 0m")
  const [refreshing, setRefreshing] = useState(false)

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const distanceAnim = useRef(new Animated.Value(0)).current

  // Start pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )

    if (isInOffice !== null) {
      pulse.start()
    }

    return () => pulse.stop()
  }, [isInOffice, pulseAnim])

  // Animate distance value
  useEffect(() => {
    if (distanceFromOffice !== null) {
      Animated.timing(distanceAnim, {
        toValue: distanceFromOffice,
        duration: 1000,
        useNativeDriver: false,
      }).start()
    }
  }, [distanceFromOffice, distanceAnim])

  // Update elapsed time if checked in
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (checkedIn && checkInTime) {
      interval = setInterval(() => {
        const now = new Date()
        const diffMs = now.getTime() - checkInTime.getTime()
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        setElapsedTime(`${hours}h ${minutes}m`)
      }, 60000) // Update every minute
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [checkedIn, checkInTime])

  // Initialize location tracking and fetch data
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        setLoading(true)

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied")
          setLoading(false)
          return
        }

        // Get office location from Firebase
        const officeDoc = await getDoc(doc(db, "settings", "office_location"))
        if (!officeDoc.exists()) {
          setErrorMsg("Office location not set")
          setLoading(false)
          return
        }

        setOfficeLocation(officeDoc.data())

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })
        setLocation(currentLocation)

        // Calculate distance to office
        const distance = calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          officeDoc.data().latitude,
          officeDoc.data().longitude,
        )
        setDistanceFromOffice(distance)
        setIsInOffice(distance <= officeDoc.data().radius)

        // Get user's check-in status
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
          const userData = userDoc.data()
          if (userData) {
            setCheckedIn(userData.checkedIn || false)
            setLastCheckIn(userData.lastCheckIn || null)
            setLastCheckOut(userData.lastCheckOut || null)

            // Set check-in time for elapsed time calculation
            if (userData.checkedIn && userData.lastCheckIn) {
              setCheckInTime(new Date(userData.lastCheckIn))

              // Calculate initial elapsed time
              const now = new Date()
              const checkIn = new Date(userData.lastCheckIn)
              const diffMs = now.getTime() - checkIn.getTime()
              const hours = Math.floor(diffMs / (1000 * 60 * 60))
              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
              setElapsedTime(`${hours}h ${minutes}m`)
            }
          }

          // Fetch recent activity
          await fetchRecentActivity()
        }
      } catch (error) {
        console.error("Error initializing location:", error)
        setErrorMsg("Failed to initialize location services")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    initializeLocation()

    // Set up location subscription
    let locationSubscription: Location.LocationSubscription | null = null

    const startLocationTracking = async () => {
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 30000, // Update every 30 seconds
        },
        (newLocation) => {
          setLocation(newLocation)
          if (officeLocation) {
            const distance = calculateDistance(
              newLocation.coords.latitude,
              newLocation.coords.longitude,
              officeLocation.latitude,
              officeLocation.longitude,
            )
            setDistanceFromOffice(distance)
            setIsInOffice(distance <= officeLocation.radius)
          }
        },
      )
    }

    startLocationTracking()

    // Cleanup
    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
    }
  }, [])

  // Fetch recent activity from Firestore
  const fetchRecentActivity = async () => {
    if (!auth.currentUser) return

    try {
      const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"), limit(5))

      const querySnapshot = await getDocs(q)
      const activities: any[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.userId === auth.currentUser?.uid) {
          activities.push({
            id: doc.id,
            ...data,
          })
        }
      })

      setRecentActivity(activities)
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }
  }

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // Handle check-in
  const handleCheckIn = async () => {
    try {
      setLoading(true)

      if (!auth.currentUser || !location) {
        Alert.alert("Error", "Unable to get location or user information")
        return
      }

      if (!isInOffice) {
        Alert.alert("Error", "You must be within office premises to check in")
        return
      }

      const timestamp = new Date().toISOString()
      const userRef = doc(db, "users", auth.currentUser.uid)

      // Check if the user document exists
      const userDoc = await getDoc(userRef)

      const checkInData = {
        type: "check-in",
        timestamp,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      }

      // If user document doesn't exist, create it
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          checkedIn: true,
          lastCheckIn: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: [checkInData],
          userId: auth.currentUser.uid,
          email: auth.currentUser.email || "",
          name: auth.currentUser.displayName || "User",
        })
      } else {
        // Document exists, update it
        await updateDoc(userRef, {
          checkedIn: true,
          lastCheckIn: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: arrayUnion(checkInData),
        })
      }

      // Add check-in record
      await setDoc(doc(db, "attendance", `${auth.currentUser.uid}_${timestamp}`), {
        userId: auth.currentUser.uid,
        ...checkInData,
      })

      setCheckedIn(true)
      setLastCheckIn(timestamp)
      setCheckInTime(new Date(timestamp))
      setElapsedTime("0h 0m")

      // Refresh activity
      await fetchRecentActivity()

      Alert.alert("Success", "You have successfully checked in")
    } catch (error) {
      console.error("Check-in error:", error)
      Alert.alert("Error", "Failed to check in. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle check-out
  const handleCheckOut = async () => {
    try {
      setLoading(true)

      if (!auth.currentUser || !location) {
        Alert.alert("Error", "Unable to get location or user information")
        return
      }

      const timestamp = new Date().toISOString()
      const userRef = doc(db, "users", auth.currentUser.uid)

      // Check if user document exists
      const userDoc = await getDoc(userRef)

      const checkOutData = {
        type: "check-out",
        timestamp,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      }

      // If user document doesn't exist, create it
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          checkedIn: false,
          lastCheckOut: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: [checkOutData],
          userId: auth.currentUser.uid,
          email: auth.currentUser.email || "",
          name: auth.currentUser.displayName || "User",
        })
      } else {
        // Document exists, update it
        await updateDoc(userRef, {
          checkedIn: false,
          lastCheckOut: timestamp,
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          checkInHistory: arrayUnion(checkOutData),
        })
      }

      // Add check-out record
      await setDoc(doc(db, "attendance", `${auth.currentUser.uid}_${timestamp}`), {
        userId: auth.currentUser.uid,
        ...checkOutData,
      })

      setCheckedIn(false)
      setLastCheckOut(timestamp)
      setCheckInTime(null)

      // Refresh activity
      await fetchRecentActivity()

      Alert.alert("Success", "You have successfully checked out")
    } catch (error) {
      console.error("Check-out error:", error)
      Alert.alert("Error", "Failed to check out. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)

    try {
      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      setLocation(currentLocation)

      // Calculate distance to office
      if (officeLocation) {
        const distance = calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          officeLocation.latitude,
          officeLocation.longitude,
        )
        setDistanceFromOffice(distance)
        setIsInOffice(distance <= officeLocation.radius)
      }

      // Refresh user data
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
        const userData = userDoc.data()
        if (userData) {
          setCheckedIn(userData.checkedIn || false)
          setLastCheckIn(userData.lastCheckIn || null)
          setLastCheckOut(userData.lastCheckOut || null)

          // Update check-in time
          if (userData.checkedIn && userData.lastCheckIn) {
            setCheckInTime(new Date(userData.lastCheckIn))
          }
        }
      }

      // Refresh activity
      await fetchRecentActivity()
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Format time for display
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Format date for display
  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (error) {
      return "Unknown time"
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Location</Text>
        <Text style={styles.headerSubtitle}>Track your office presence</Text>
      </MotiView>

      {/* Error Message */}
      {errorMsg ? (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          style={styles.errorContainer}
        >
          <AlertCircle size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </MotiView>
      ) : (
        <>
          {/* Status Card */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500, delay: 100 }}
          >
            <LinearGradient
              colors={isInOffice ? ["#6C63FF", "#8F87FF"] : ["#F8F9FA", "#F1F3F5"]}
              style={styles.statusCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statusCardContent}>
                <Animated.View
                  style={[
                    styles.statusIndicator,
                    {
                      backgroundColor: isInOffice ? "#34C759" : "#FF3B30",
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <View style={styles.statusTextContainer}>
                  <Text style={[styles.statusTitle, isInOffice && styles.statusTitleInOffice]}>
                    {isInOffice ? "You are in the office" : "You are outside the office"}
                  </Text>
                  <Text style={[styles.statusSubtitle, isInOffice && styles.statusSubtitleInOffice]}>
                    {distanceFromOffice !== null
                      ? `${Math.round(distanceFromOffice)} meters from office location`
                      : "Distance unknown"}
                  </Text>
                </View>
              </View>

              {/* Distance Visualization */}
              <View style={styles.distanceContainer}>
                <View style={styles.distanceBar}>
                  <Animated.View
                    style={[
                      styles.distanceFill,
                      {
                        width: distanceAnim.interpolate({
                          inputRange: [0, officeLocation?.radius * 2 || 200],
                          outputRange: ["0%", "100%"],
                          extrapolate: "clamp",
                        }),
                        backgroundColor: isInOffice ? "#34C759" : "#FF3B30",
                      },
                    ]}
                  />
                </View>
                <View style={styles.distanceLabels}>
                  <Text style={styles.distanceLabel}>Office</Text>
                  <Text style={styles.distanceLabel}>{officeLocation?.radius || 100}m</Text>
                  <Text style={styles.distanceLabel}>{(officeLocation?.radius || 100) * 2}m</Text>
                </View>
              </View>
            </LinearGradient>
          </MotiView>

          {/* Check-in Status */}
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

          {/* Location Details */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500, delay: 300 }}
            style={styles.locationDetailsCard}
          >
            <View style={styles.locationDetailsHeader}>
              <MapPin size={20} color="#6C63FF" />
              <Text style={styles.locationDetailsTitle}>Location Details</Text>
            </View>

            <View style={styles.locationDetailsContent}>
              {location && (
                <>
                  <View style={styles.locationDetailRow}>
                    <Text style={styles.locationDetailLabel}>Your Coordinates:</Text>
                    <Text style={styles.locationDetailValue}>
                      {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                    </Text>
                  </View>

                  {officeLocation && (
                    <>
                      <View style={styles.locationDetailRow}>
                        <Text style={styles.locationDetailLabel}>Office Coordinates:</Text>
                        <Text style={styles.locationDetailValue}>
                          {officeLocation.latitude.toFixed(6)}, {officeLocation.longitude.toFixed(6)}
                        </Text>
                      </View>

                      <View style={styles.locationDetailRow}>
                        <Text style={styles.locationDetailLabel}>Office Radius:</Text>
                        <Text style={styles.locationDetailValue}>{officeLocation.radius} meters</Text>
                      </View>
                    </>
                  )}
                </>
              )}

              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
                <Navigation size={16} color="#6C63FF" />
                <Text style={styles.refreshButtonText}>Refresh Location</Text>
              </TouchableOpacity>
            </View>
          </MotiView>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
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
                      <Text style={styles.activityType}>
                        {activity.type === "check-in" ? "Checked In" : "Checked Out"}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
                      </Text>
                      <Text style={styles.activityTimeAgo}>{formatRelativeTime(activity.timestamp)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </MotiView>
          )}
        </>
      )}
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
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    marginLeft: 12,
    color: "#FF3B30",
    fontSize: 16,
    flex: 1,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusCardContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statusTitleInOffice: {
    color: "#fff",
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  statusSubtitleInOffice: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  distanceContainer: {
    marginTop: 8,
  },
  distanceBar: {
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  distanceFill: {
    height: "100%",
    borderRadius: 4,
  },
  distanceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  distanceLabel: {
    fontSize: 12,
    color: "#666",
  },

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
  locationDetailsCard: {
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
  locationDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  locationDetailsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  locationDetailsContent: {
    marginBottom: 8,
  },
  locationDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  locationDetailLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
    minWidth: 120,
  },
  locationDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  refreshButtonText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
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
})

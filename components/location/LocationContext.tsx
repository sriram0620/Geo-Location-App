"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode, useRef } from "react"
import * as Location from "expo-location"
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
} from "firebase/firestore"
import { auth, db } from "../../app/config/firebase"
import { Alert } from "react-native"
import { formatDistanceToNow } from "date-fns"
import { useNetworkStatus } from "../../utils/networkStatus"
import * as localStorageService from "../../utils/localStorageService"
import * as syncService from "../../utils/syncService"

// Define the context type
type LocationContextType = {
  location: Location.LocationObject | null
  isInOffice: boolean | null
  errorMsg: string | null
  checkedIn: boolean
  lastCheckIn: string | null
  lastCheckOut: string | null
  officeLocation: any
  distanceFromOffice: number | null
  loading: boolean
  recentActivity: any[]
  checkInTime: Date | null
  elapsedTime: string
  refreshing: boolean
  currentCheckInId: string | null
  isOnline: boolean
  pendingRecordsCount: number
  isSyncing: boolean
  handleCheckIn: () => Promise<void>
  handleCheckOut: () => Promise<void>
  handleRefresh: () => Promise<void>
  handleSync: () => Promise<void>
  calculateEffectiveHours: () => string
  formatTime: (timestamp: string | null) => string
  formatDate: (timestamp: string | null) => string
  formatRelativeTime: (timestamp: string) => string
}

// Create the context with a default value
const LocationContext = createContext<LocationContextType | undefined>(undefined)

// Provider component
export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
  const [currentCheckInId, setCurrentCheckInId] = useState<string | null>(null)
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null)
  const [pendingRecordsCount, setPendingRecordsCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Network status
  const { isOnline, wasOffline, resetOfflineFlag } = useNetworkStatus()

  // Add debounce mechanism to prevent excessive updates
  const lastAutoActionTimestamp = useRef<number>(0)
  const AUTO_ACTION_DEBOUNCE_MS = 60000 // 1 minute debounce

  // Fetch recent activity from Firestore with caching
  const lastActivityFetch = useRef<number>(0)
  const ACTIVITY_FETCH_INTERVAL_MS = 60000 // 1 minute minimum between fetches

  const shouldUpdateDatabase = useRef(true)

  const lastOfficeStatusUpdate = useRef<number>(0)
  const OFFICE_STATUS_UPDATE_DEBOUNCE_MS = 5000 // 5 seconds

  // Check for pending records on mount and when network status changes
  useEffect(() => {
    const checkPendingRecords = async () => {
      const pendingRecords = await localStorageService.getPendingAttendance()
      setPendingRecordsCount(pendingRecords.length)
    }

    checkPendingRecords()
  }, [isOnline])

  // Sync data when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      handleSync()
      resetOfflineFlag()
    }
  }, [isOnline, wasOffline])

  // Update elapsed time if checked in
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (checkedIn && checkInTime) {
      // Initial calculation without waiting for interval
      const calculateAndSetElapsedTime = () => {
        const now = new Date()
        const diffMs = now.getTime() - checkInTime.getTime()
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        setElapsedTime(`${hours}h ${minutes}m`)
      }

      // Calculate immediately
      calculateAndSetElapsedTime()

      // Then set up interval for UI updates only
      interval = setInterval(calculateAndSetElapsedTime, 60000) // Update every minute
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [checkedIn, checkInTime])

  // Update the useEffect hook that handles location tracking to include automatic check-in/check-out
  useEffect(() => {
    let isMounted = true
    // Add this flag to prevent unnecessary database writes

    const initializeLocation = async () => {
      try {
        if (!isMounted) return
        setLoading(true)

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setErrorMsg("Permission to access location was denied")
          setLoading(false)
          return
        }

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

        if (!officeData) {
          setErrorMsg("Office location not set")
          setLoading(false)
          return
        }

        // Validate office location data
        if (!officeData.latitude || !officeData.longitude || !officeData.radius) {
          setErrorMsg("Office location data is incomplete")
          setLoading(false)
          return
        }

        if (!isMounted) return
        setOfficeLocation(officeData)

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })
        if (!isMounted) return
        setLocation(currentLocation)

        // Check if user is in office
        checkIfInOffice(currentLocation.coords, officeData)

        // Try to get user data from local storage first
        let userData = await localStorageService.getUserData()

        // If online, get from Firebase and update local storage
        if (isOnline && auth.currentUser) {
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

        if (userData && isMounted) {
          setCheckedIn(userData.checkedIn || false)
          setLastCheckIn(userData.lastCheckIn || null)
          setLastCheckOut(userData.lastCheckOut || null)
          setCurrentCheckInId(userData.currentCheckInId || null)

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
        if (isMounted) {
          await fetchRecentActivity()
        }

        // Check for pending records
        const pendingRecords = await localStorageService.getPendingAttendance()
        setPendingRecordsCount(pendingRecords.length)
      } catch (error) {
        console.error("Error initializing location:", error)
        if (isMounted) {
          setErrorMsg("Failed to initialize location services")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    // Call initialization function
    initializeLocation()

    // Set up location subscription
    const startLocationTracking = async () => {
      try {
        if (!isMounted) return null
        // Get current location immediately
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })
        if (!isMounted) return null
        setLocation(currentLocation)

        // Check if in office with current location
        if (officeLocation && isMounted) {
          const wasInOffice = isInOffice
          const nowInOffice = checkIfInOffice(currentLocation.coords, officeLocation)

          // Handle automatic check-in/check-out based on location change
          if (auth.currentUser && wasInOffice !== nowInOffice && isMounted) {
            if (nowInOffice && !checkedIn) {
              // User entered office and not checked in - perform automatic check-in
              handleAutoCheckIn()
            } else if (!nowInOffice && checkedIn) {
              // User left office and is checked in - perform automatic check-out
              handleAutoCheckOut()
            }
          }
        }

        // Then subscribe to location updates
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 30000, // Update every 30 seconds
          },
          (newLocation) => {
            if (!isMounted) return
            setLocation(newLocation)
            if (officeLocation) {
              const wasInOffice = isInOffice
              const nowInOffice = checkIfInOffice(newLocation.coords, officeLocation)

              // Handle automatic check-in/check-out based on location change
              if (auth.currentUser && wasInOffice !== nowInOffice) {
                if (nowInOffice && !checkedIn) {
                  // User entered office and not checked in - perform automatic check-in
                  handleAutoCheckIn()
                } else if (!nowInOffice && checkedIn) {
                  // User left office and is checked in - perform automatic check-out
                  handleAutoCheckOut()
                }
              }
            }
          },
        )

        if (isMounted) {
          setLocationSubscription(subscription)
        }
        return subscription
      } catch (error) {
        console.error("Error starting location tracking:", error)
        return null
      }
    }

    const locationTrackingPromise = startLocationTracking()

    // Cleanup
    return () => {
      isMounted = false
      locationTrackingPromise
        .then((subscription) => {
          if (subscription) {
            try {
              // Handle web environment where subscription.remove might not be available
              if (typeof subscription.remove === "function") {
                subscription.remove()
              }
            } catch (error) {
              console.log("Failed to remove location subscription:", error)
            }
          }
        })
        .catch((error) => {
          console.log("Error cleaning up location subscription:", error)
        })
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
      await fetchRecentActivity()

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

  // Add automatic check-in function
  const handleAutoCheckIn = async () => {
    try {
      // Implement debouncing
      const now = Date.now()
      if (now - lastAutoActionTimestamp.current < AUTO_ACTION_DEBOUNCE_MS) {
        console.log("Auto check-in debounced")
        return
      }
      lastAutoActionTimestamp.current = now

      if (!auth.currentUser || !location) {
        console.log("Cannot auto check-in: No user or location data")
        return
      }

      if (!isInOffice) {
        console.log("Cannot auto check-in: Not in office")
        return
      }

      // Check if user is already checked in
      if (checkedIn) {
        console.log("Already checked in, skipping auto check-in")
        return
      }

      // Check if there's an unpaired check-in
      let hasUnpairedCheckIn = false

      if (isOnline) {
        // Check in Firebase
        const userRef = doc(db, "users", auth.currentUser.uid)
        const userDoc = await getDoc(userRef)
        const userData = userDoc.data()
        hasUnpairedCheckIn = !!userData?.currentCheckInId
      } else {
        // Check in local storage
        const userData = await localStorageService.getUserData()
        hasUnpairedCheckIn = !!userData?.currentCheckInId
      }

      if (hasUnpairedCheckIn) {
        console.log("Unpaired check-in exists, skipping auto check-in")
        return
      }

      console.log("Performing automatic check-in")
      const timestamp = new Date().toISOString()

      // Generate a unique ID for this check-in
      const checkInId = `${auth.currentUser.uid}_${timestamp}`

      // Create check-in record
      const checkInData = {
        id: checkInId,
        userId: auth.currentUser.uid,
        type: "check-in",
        timestamp,
        timestampDate: Timestamp.fromDate(new Date()),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        paired: false, // Flag to indicate if this check-in has been paired with a check-out
        automatic: true, // Flag to indicate this was an automatic check-in
      }

      if (isOnline) {
        // Add check-in record to attendance collection
        await setDoc(doc(db, "attendance", checkInId), checkInData)

        // Update user document
        const userRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userRef, {
          checkedIn: true,
          lastCheckIn: timestamp,
          currentCheckInId: checkInId, // Store the current check-in ID
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
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
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        })
      }

      // Update local state
      setCheckedIn(true)
      setLastCheckIn(timestamp)
      setCheckInTime(new Date(timestamp))
      setElapsedTime("0h 0m")
      setCurrentCheckInId(checkInId)

      // Update pending records count if offline
      if (!isOnline) {
        const pendingRecords = await localStorageService.getPendingAttendance()
        setPendingRecordsCount(pendingRecords.length)
      }

      // Refresh activity
      await fetchRecentActivity()

      Alert.alert("Auto Check-in", "You have been automatically checked in")
    } catch (error) {
      console.error("Auto check-in error:", error)
    }
  }

  // Add automatic check-out function
  const handleAutoCheckOut = async () => {
    try {
      // Implement debouncing
      const now = Date.now()
      if (now - lastAutoActionTimestamp.current < AUTO_ACTION_DEBOUNCE_MS) {
        console.log("Auto check-out debounced")
        return
      }
      lastAutoActionTimestamp.current = now

      if (!auth.currentUser || !location) {
        console.log("Cannot auto check-out: No user or location data")
        return
      }

      // Check if user is checked in
      if (!checkedIn || !currentCheckInId) {
        console.log("Not checked in, skipping auto check-out")
        return
      }

      console.log("Performing automatic check-out")
      const timestamp = new Date().toISOString()

      // Calculate duration in minutes
      let durationMinutes = 0
      if (checkInTime) {
        const checkOutTime = new Date()
        const durationMs = checkOutTime.getTime() - checkInTime.getTime()
        durationMinutes = Math.round(durationMs / (1000 * 60))
      }

      // Generate a unique ID for this check-out
      const checkOutId = `${auth.currentUser.uid}_${timestamp}`

      // Create check-out record
      const checkOutData = {
        id: checkOutId,
        userId: auth.currentUser.uid,
        type: "check-out",
        timestamp,
        timestampDate: Timestamp.fromDate(new Date()),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        checkInId: currentCheckInId, // Reference to the paired check-in
        durationMinutes: durationMinutes,
        automatic: true, // Flag to indicate this was an automatic check-out
      }

      if (isOnline) {
        // Add check-out record to attendance collection
        await setDoc(doc(db, "attendance", checkOutId), checkOutData)

        // Update the check-in record to mark it as paired
        const checkInRef = doc(db, "attendance", currentCheckInId)
        await updateDoc(checkInRef, {
          paired: true,
          checkOutId: checkOutId,
          durationMinutes: durationMinutes,
        })

        // Update user document
        const userRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userRef, {
          checkedIn: false,
          lastCheckOut: timestamp,
          currentCheckInId: null, // Clear the current check-in ID
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
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
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        })
      }

      // Update local state
      setCheckedIn(false)
      setLastCheckOut(timestamp)
      setCheckInTime(null)
      setCurrentCheckInId(null)

      // Update pending records count if offline
      if (!isOnline) {
        const pendingRecords = await localStorageService.getPendingAttendance()
        setPendingRecordsCount(pendingRecords.length)
      }

      // Refresh activity
      await fetchRecentActivity()

      Alert.alert("Auto Check-out", "You have been automatically checked out")
    } catch (error) {
      console.error("Auto check-out error:", error)
    }
  }

  // Update the manual check-in function to work offline
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

      // Check if user is already checked in
      if (checkedIn) {
        Alert.alert("Already Checked In", "You are already checked in. Please check out first.")
        setLoading(false)
        return
      }

      // Check if there's an unpaired check-in
      let hasUnpairedCheckIn = false

      if (isOnline) {
        // Check in Firebase
        const userRef = doc(db, "users", auth.currentUser.uid)
        const userDoc = await getDoc(userRef)
        const userData = userDoc.data()
        hasUnpairedCheckIn = !!userData?.currentCheckInId
      } else {
        // Check in local storage
        const userData = await localStorageService.getUserData()
        hasUnpairedCheckIn = !!userData?.currentCheckInId
      }

      if (hasUnpairedCheckIn) {
        Alert.alert("Error", "You have an unpaired check-in. Please check out first.")
        setLoading(false)
        return
      }

      const timestamp = new Date().toISOString()

      // Generate a unique ID for this check-in
      const checkInId = `${auth.currentUser.uid}_${timestamp}`

      // Create check-in record
      const checkInData = {
        id: checkInId,
        userId: auth.currentUser.uid,
        type: "check-in",
        timestamp,
        timestampDate: Timestamp.fromDate(new Date()),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        paired: false, // Flag to indicate if this check-in has been paired with a check-out
        manual: true, // Flag to indicate this was a manual check-in
      }

      if (isOnline) {
        // Add check-in record to attendance collection
        await setDoc(doc(db, "attendance", checkInId), checkInData)

        // Update user document
        const userRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userRef, {
          checkedIn: true,
          lastCheckIn: timestamp,
          currentCheckInId: checkInId, // Store the current check-in ID
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
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
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        })
      }

      // Update local state
      setCheckedIn(true)
      setLastCheckIn(timestamp)
      setCheckInTime(new Date(timestamp))
      setElapsedTime("0h 0m")
      setCurrentCheckInId(checkInId)

      // Update pending records count if offline
      if (!isOnline) {
        const pendingRecords = await localStorageService.getPendingAttendance()
        setPendingRecordsCount(pendingRecords.length)
      }

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

  // Update the manual check-out function to work offline
  const handleCheckOut = async () => {
    try {
      setLoading(true)

      if (!auth.currentUser || !location) {
        Alert.alert("Error", "Unable to get location or user information")
        return
      }

      // Check if user is checked in
      if (!checkedIn || !currentCheckInId) {
        Alert.alert("Not Checked In", "You are not currently checked in.")
        setLoading(false)
        return
      }

      const timestamp = new Date().toISOString()

      // Calculate duration in minutes
      let durationMinutes = 0
      if (checkInTime) {
        const checkOutTime = new Date()
        const durationMs = checkOutTime.getTime() - checkInTime.getTime()
        durationMinutes = Math.round(durationMs / (1000 * 60))
      }

      // Generate a unique ID for this check-out
      const checkOutId = `${auth.currentUser.uid}_${timestamp}`

      // Create check-out record
      const checkOutData = {
        id: checkOutId,
        userId: auth.currentUser.uid,
        type: "check-out",
        timestamp,
        timestampDate: Timestamp.fromDate(new Date()),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        checkInId: currentCheckInId, // Reference to the paired check-in
        durationMinutes: durationMinutes,
        manual: true, // Flag to indicate this was a manual check-out
      }

      if (isOnline) {
        // Add check-out record to attendance collection
        await setDoc(doc(db, "attendance", checkOutId), checkOutData)

        // Update the check-in record to mark it as paired
        const checkInRef = doc(db, "attendance", currentCheckInId)
        const checkInDoc = await getDoc(checkInRef)

        if (checkInDoc.exists()) {
          // Check if this check-in is already paired
          if (checkInDoc.data().paired) {
            Alert.alert("Error", "This check-in has already been paired with a check-out.")

            // Fix the state if the database and local state are out of sync
            const userRef = doc(db, "users", auth.currentUser.uid)
            await updateDoc(userRef, {
              checkedIn: false,
              currentCheckInId: null,
            })

            setCheckedIn(false)
            setCurrentCheckInId(null)
            setLoading(false)
            return
          }

          await updateDoc(checkInRef, {
            paired: true,
            checkOutId: checkOutId,
            durationMinutes: durationMinutes,
          })
        }

        // Update user document
        const userRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userRef, {
          checkedIn: false,
          lastCheckOut: timestamp,
          currentCheckInId: null, // Clear the current check-in ID
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
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
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        })
      }

      // Update local state
      setCheckedIn(false)
      setLastCheckOut(timestamp)
      setCheckInTime(null)
      setCurrentCheckInId(null)

      // Update pending records count if offline
      if (!isOnline) {
        const pendingRecords = await localStorageService.getPendingAttendance()
        setPendingRecordsCount(pendingRecords.length)
      }

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

  // Update the handleRefresh function to work offline
  const handleRefresh = async () => {
    setRefreshing(true)

    try {
      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      setLocation(currentLocation)

      if (isOnline) {
        // Get fresh office location data from Firebase
        const officeDoc = await getDoc(doc(db, "settings", "office_location"))
        if (officeDoc.exists()) {
          const officeData = officeDoc.data()
          setOfficeLocation(officeData)

          // Save to local storage for offline use
          await localStorageService.saveOfficeLocation(officeData)

          // Check if in office with fresh data
          checkIfInOffice(currentLocation.coords, officeData)
        }

        // Refresh user data from Firebase
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
          const userData = userDoc.data()
          if (userData) {
            setCheckedIn(userData.checkedIn || false)
            setLastCheckIn(userData.lastCheckIn || null)
            setLastCheckOut(userData.lastCheckOut || null)
            setCurrentCheckInId(userData.currentCheckInId || null)

            // Update check-in time
            if (userData.checkedIn && userData.lastCheckIn) {
              setCheckInTime(new Date(userData.lastCheckIn))
            }

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
      } else {
        // Use local office location data
        const officeData = await localStorageService.getOfficeLocation()
        if (officeData) {
          // Check if in office with local data
          checkIfInOffice(currentLocation.coords, officeData)
        }

        // Use local user data
        const userData = await localStorageService.getUserData()
        if (userData) {
          setCheckedIn(userData.checkedIn || false)
          setLastCheckIn(userData.lastCheckIn || null)
          setLastCheckOut(userData.lastCheckOut || null)
          setCurrentCheckInId(userData.currentCheckInId || null)

          // Update check-in time
          if (userData.checkedIn && userData.lastCheckIn) {
            setCheckInTime(new Date(userData.lastCheckIn))
          }
        }
      }

      // Refresh activity
      await fetchRecentActivity()

      // Update pending records count
      const pendingRecords = await localStorageService.getPendingAttendance()
      setPendingRecordsCount(pendingRecords.length)
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  // Update the checkIfInOffice function to return the result
  const checkIfInOffice = (userCoords: any, officeCoords: any) => {
    if (!officeCoords || !userCoords) return false

    try {
      // Ensure we have numeric values
      const userLat = Number.parseFloat(userCoords.latitude)
      const userLng = Number.parseFloat(userCoords.longitude)
      const officeLat = Number.parseFloat(officeCoords.latitude)
      const officeLng = Number.parseFloat(officeCoords.longitude)
      const officeRadius = Number.parseFloat(officeCoords.radius)

      // Calculate distance
      const distance = calculateDistance(userLat, userLng, officeLat, officeLng)

      // Update distance state
      setDistanceFromOffice(distance)

      // Check if user is within the radius
      const inOffice = distance <= officeRadius
      const now = Date.now()

      // Only update isInOffice state if it's been long enough since the last update
      // or if the office status has changed
      if (now - lastOfficeStatusUpdate.current > OFFICE_STATUS_UPDATE_DEBOUNCE_MS || inOffice !== isInOffice) {
        lastOfficeStatusUpdate.current = now
        setIsInOffice(inOffice)
      }

      return inOffice
    } catch (error) {
      console.error("Error checking if in office:", error)
      setIsInOffice(false)
      return false
    }
  }

  // Update fetchRecentActivity to work offline
  const fetchRecentActivity = async () => {
    if (!auth.currentUser) return

    // Check if we've fetched activities recently
    const now = Date.now()
    if (now - lastActivityFetch.current < ACTIVITY_FETCH_INTERVAL_MS && recentActivity.length > 0) {
      console.log("Using cached activity data")
      return
    }

    try {
      lastActivityFetch.current = now

      let activities: any[] = []

      if (isOnline) {
        // Get attendance records from Firebase
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("userId", "==", auth.currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(10),
        )

        const querySnapshot = await getDocs(attendanceQuery)
        querySnapshot.forEach((doc) => {
          activities.push({
            id: doc.id,
            ...doc.data(),
          })
        })
      }

      // Get pending records from local storage
      const pendingRecords = await localStorageService.getPendingAttendance()

      // Filter to only include records for the current user
      const userPendingRecords = pendingRecords.filter((record) => record.userId === auth.currentUser?.uid)

      // Combine online and offline records
      activities = [...activities, ...userPendingRecords]

      // Sort by timestamp (most recent first)
      activities.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      // Take only the 10 most recent
      activities = activities.slice(0, 10)

      setRecentActivity(activities)
    } catch (error) {
      console.error("Error fetching recent activity:", error)
      // Don't update lastActivityFetch so we can retry sooner
      lastActivityFetch.current = 0
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

  // Calculate effective working hours
  const calculateEffectiveHours = () => {
    if (!recentActivity || recentActivity.length === 0) return "0h 0m"

    // Group check-ins with their corresponding check-outs
    const pairedActivities = recentActivity.reduce(
      (pairs: Record<string, { checkIn?: any; checkOut?: any }>, activity) => {
        if (activity.type === "check-out" && activity.checkInId) {
          // This is a check-out with a reference to its check-in
          pairs[activity.checkInId] = {
            ...(pairs[activity.checkInId] || {}),
            checkOut: activity,
          }
        } else if (activity.type === "check-in") {
          // This is a check-in
          pairs[activity.id] = {
            ...(pairs[activity.id] || {}),
            checkIn: activity,
          }
        }
        return pairs
      },
      {} as Record<string, { checkIn?: any; checkOut?: any }>,
    )

    // Calculate total minutes from complete pairs
    let totalMinutes = 0
    Object.values(pairedActivities).forEach((pair) => {
      if (pair.checkIn && pair.checkOut) {
        // If we have both check-in and check-out, use the stored duration or calculate it
        if (pair.checkOut.durationMinutes) {
          totalMinutes += pair.checkOut.durationMinutes
        } else {
          const checkInTime = new Date(pair.checkIn.timestamp)
          const checkOutTime = new Date(pair.checkOut.timestamp)
          const durationMs = checkOutTime.getTime() - checkInTime.getTime()
          totalMinutes += Math.round(durationMs / (1000 * 60))
        }
      }
    })

    // Format the result
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  // Provide the context value
  const contextValue: LocationContextType = {
    location,
    isInOffice,
    errorMsg,
    checkedIn,
    lastCheckIn,
    lastCheckOut,
    officeLocation,
    distanceFromOffice,
    loading,
    recentActivity,
    checkInTime,
    elapsedTime,
    refreshing,
    currentCheckInId,
    isOnline,
    pendingRecordsCount,
    isSyncing,
    handleCheckIn,
    handleCheckOut,
    handleRefresh,
    handleSync,
    calculateEffectiveHours,
    formatTime,
    formatDate,
    formatRelativeTime,
  }

  return <LocationContext.Provider value={contextValue}>{children}</LocationContext.Provider>
}

// Custom hook to use the location context
export const useLocation = () => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider")
  }
  return context
}

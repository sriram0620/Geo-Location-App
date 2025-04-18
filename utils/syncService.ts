import { auth, db } from "../app/config/firebase"
import { doc, setDoc, updateDoc, collection, addDoc, getDoc, Timestamp } from "firebase/firestore"
import * as localStorageService from "./localStorageService"
import * as authStorage from "./authStorage"
import { Alert } from "react-native"

// Function to sync pending attendance records with Firebase
export const syncPendingAttendance = async (): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      // Try to get auth user from local storage
      const localUser = await authStorage.getAuthUser()
      if (!localUser) {
        console.log("No user logged in, cannot sync")
        return false
      }

      // If we have a local user but Firebase auth is not initialized,
      // we need to wait until we're properly authenticated
      if (!auth.currentUser) {
        console.log("Firebase auth not initialized, waiting for authentication")
        return false
      }
    }

    const userId = auth.currentUser?.uid

    // Get pending records
    const pendingRecords = await localStorageService.getPendingAttendance()

    // Filter records for the current user
    const userPendingRecords = pendingRecords.filter((record) => record.userId === userId)

    if (userPendingRecords.length === 0) {
      console.log("No pending records to sync for current user")
      return true
    }

    console.log(`Syncing ${userPendingRecords.length} pending records for user ${userId}`)

    // Process records in order (important for check-in/check-out pairing)
    // Sort by timestamp to ensure correct order
    userPendingRecords.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })

    // Get current user data from Firebase to check current state
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    const userData = userDoc.exists() ? userDoc.data() : null

    // Track if we need to update user data after processing records
    let finalUserState = {
      checkedIn: userData?.checkedIn || false,
      lastCheckIn: userData?.lastCheckIn || null,
      lastCheckOut: userData?.lastCheckOut || null,
      currentCheckInId: userData?.currentCheckInId || null,
    }

    // Process each record
    for (const record of userPendingRecords) {
      // Convert timestamp to Firestore Timestamp if needed
      const firestoreRecord = { ...record }

      // If timestampDate is a string or object with seconds, convert to Firestore Timestamp
      if (typeof firestoreRecord.timestampDate === "string") {
        firestoreRecord.timestampDate = Timestamp.fromDate(new Date(firestoreRecord.timestampDate))
      } else if (firestoreRecord.timestampDate && firestoreRecord.timestampDate.seconds) {
        firestoreRecord.timestampDate = Timestamp.fromDate(new Date(firestoreRecord.timestampDate.seconds * 1000))
      }

      // Remove offline flag
      delete firestoreRecord.offline

      // Add to attendance collection
      if (record.id) {
        // Use the generated ID from offline mode
        await setDoc(doc(db, "attendance", record.id), firestoreRecord)
        console.log(`Synced record ${record.id} to Firestore`)
      } else {
        // Generate new ID
        await addDoc(collection(db, "attendance"), firestoreRecord)
        console.log(`Added record to Firestore with auto-generated ID`)
      }

      // Update user state based on record type
      if (record.type === "check-in") {
        finalUserState = {
          ...finalUserState,
          checkedIn: true,
          lastCheckIn: record.timestamp,
          currentCheckInId: record.id,
        }
      } else if (record.type === "check-out") {
        finalUserState = {
          ...finalUserState,
          checkedIn: false,
          lastCheckOut: record.timestamp,
          currentCheckInId: null,
        }

        // If this check-out has a checkInId, update the check-in record to mark it as paired
        if (record.checkInId) {
          await updateDoc(doc(db, "attendance", record.checkInId), {
            paired: true,
            checkOutId: record.id,
            durationMinutes: record.durationMinutes || 0,
          })
          console.log(`Updated check-in record ${record.checkInId} to mark as paired`)
        }
      }
    }

    // Update user document with final state
    await updateDoc(userRef, {
      checkedIn: finalUserState.checkedIn,
      lastCheckIn: finalUserState.lastCheckIn,
      lastCheckOut: finalUserState.lastCheckOut,
      currentCheckInId: finalUserState.currentCheckInId,
    })
    console.log(`Updated user document with final state: ${JSON.stringify(finalUserState)}`)

    // Clear synced records from pending records
    const remainingRecords = pendingRecords.filter((record) => record.userId !== userId)
    if (remainingRecords.length > 0) {
      await AsyncStorage.setItem(KEYS.PENDING_ATTENDANCE, JSON.stringify(remainingRecords))
      console.log(`Kept ${remainingRecords.length} records for other users`)
    } else {
      await localStorageService.clearPendingAttendance()
      console.log("Cleared all pending records")
    }

    // Update last sync timestamp
    await localStorageService.saveLastSync()

    console.log("Sync completed successfully")
    return true
  } catch (error) {
    console.error("Error syncing pending attendance:", error)
    return false
  }
}

// Function to perform a full sync when coming back online
export const performFullSync = async (): Promise<void> => {
  try {
    const success = await syncPendingAttendance()

    if (success) {
      console.log("Full sync completed successfully")
    } else {
      console.error("Full sync failed")
      Alert.alert("Sync Error", "There was an error syncing your offline data. Please try again later.", [
        { text: "OK" },
      ])
    }
  } catch (error) {
    console.error("Error performing full sync:", error)
    Alert.alert("Sync Error", "There was an error syncing your offline data. Please try again later.", [{ text: "OK" }])
  }
}

// Import AsyncStorage for the fix
import AsyncStorage from "@react-native-async-storage/async-storage"
// Import KEYS for the fix
const KEYS = {
  PENDING_ATTENDANCE: "pendingAttendance",
}

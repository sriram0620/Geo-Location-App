import { auth, db } from "../app/config/firebase"
import { doc, setDoc, updateDoc, collection, addDoc, getDoc } from "firebase/firestore"
import * as localStorageService from "./localStorageService"
import { Alert } from "react-native"

// Function to sync pending attendance records with Firebase
export const syncPendingAttendance = async (): Promise<boolean> => {
  try {
    if (!auth.currentUser) {
      console.log("No user logged in, cannot sync")
      return false
    }

    // Get pending records
    const pendingRecords = await localStorageService.getPendingAttendance()

    if (pendingRecords.length === 0) {
      console.log("No pending records to sync")
      return true
    }

    console.log(`Syncing ${pendingRecords.length} pending records`)

    // Process records in order (important for check-in/check-out pairing)
    // Sort by timestamp to ensure correct order
    pendingRecords.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })

    // Get current user data from Firebase to check current state
    const userRef = doc(db, "users", auth.currentUser.uid)
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
    for (const record of pendingRecords) {
      // Add to attendance collection
      if (record.id) {
        // Use the generated ID from offline mode
        await setDoc(doc(db, "attendance", record.id), {
          ...record,
          offline: undefined, // Remove offline flag
        })
      } else {
        // Generate new ID
        await addDoc(collection(db, "attendance"), {
          ...record,
          offline: undefined, // Remove offline flag
        })
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

    // Clear pending records after successful sync
    await localStorageService.clearPendingAttendance()

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

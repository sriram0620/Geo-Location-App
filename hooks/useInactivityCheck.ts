"use client"

import { useEffect, useRef, useState } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { auth, db } from "../app/config/firebase"

const INACTIVITY_TIMEOUT = 1 * 60 * 1000 // 1 min in milliseconds

export function useInactivityCheck() {
  const [requiresVerification, setRequiresVerification] = useState(false)
  const lastActiveTimestamp = useRef(Date.now())
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange)

    // Check inactivity less frequently (every 5 minutes)
    const interval = setInterval(checkInactivity, 300000) // 5 minutes

    return () => {
      subscription.remove()
      clearInterval(interval)
    }
  }, [])

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      // App came to foreground
      checkInactivity()
    }
    appState.current = nextAppState
  }

  const checkInactivity = async () => {
    const currentTime = Date.now()
    const timeDiff = currentTime - lastActiveTimestamp.current

    if (timeDiff >= INACTIVITY_TIMEOUT) {
      setRequiresVerification(true)

      // Log inactivity in Firebase, but only if we haven't already set requiresBiometric to true
      if (auth.currentUser) {
        // Get current user data first to check if we need to update
        const userRef = doc(db, "users", auth.currentUser.uid)
        const userDoc = await getDoc(userRef)
        const userData = userDoc.data()

        // Only update if requiresBiometric is not already true
        if (!userData?.requiresBiometric) {
          await updateDoc(userRef, {
            lastInactivityCheck: new Date().toISOString(),
            requiresBiometric: true,
          })
        }
      }
    }
  }

  const resetInactivityTimer = () => {
    lastActiveTimestamp.current = Date.now()
    setRequiresVerification(false)
  }

  return {
    requiresVerification,
    resetInactivityTimer,
  }
}

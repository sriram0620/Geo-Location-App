"use client"

import { useState, useEffect } from "react"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"

// Hook to track network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [wasOffline, setWasOffline] = useState<boolean>(false)

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false

      // If we were offline and now we're online, set wasOffline to true
      if (!isOnline && online) {
        setWasOffline(true)
      }

      setIsOnline(online)
    })

    // Initial check
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false)
    })

    return () => {
      unsubscribe()
    }
  }, [isOnline])

  // Function to reset the wasOffline flag after sync
  const resetOfflineFlag = () => {
    setWasOffline(false)
  }

  return { isOnline, wasOffline, resetOfflineFlag }
}

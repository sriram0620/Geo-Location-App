"use client"

import type React from "react"
import { ScrollView, StyleSheet, RefreshControl } from "react-native"
import { LocationProvider } from "../../components/location/LocationContext"
import LocationHeader from "../../components/location/LocationHeader"
import ErrorMessage from "../../components/location/ErrorMessage"
import StatusCard from "../../components/location/StatusCard"
import CheckInStatusCard from "../../components/location/CheckInStatusCard"
import LocationDetailsCard from "../../components/location/LocationDetailsCard"
import RecentActivityCard from "../../components/location/RecentActivityCard"
import LoadingScreen from "../../components/location/LoadingScreen"
import { OfflineIndicator } from "../../components/offline/OfflineIndicator"
import { useLocation } from "../../components/location/LocationContext"

// Main content component that uses the location context
const LocationContent: React.FC = () => {
  const { loading, refreshing, handleRefresh, isOnline, pendingRecordsCount, handleSync, isSyncing } = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <LocationHeader />
      <OfflineIndicator
        isOnline={isOnline}
        pendingCount={pendingRecordsCount}
        onSync={handleSync}
        isSyncing={isSyncing}
      />
      <ErrorMessage />
      <StatusCard />
      <CheckInStatusCard />
      <LocationDetailsCard />
      <RecentActivityCard />
    </ScrollView>
  )
}

// Main screen component that provides the location context
export default function LocationScreen() {
  return (
    <LocationProvider>
      <LocationContent />
    </LocationProvider>
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
})

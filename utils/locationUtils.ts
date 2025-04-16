import * as Location from "expo-location"
import type { OfficeLocation } from "../app/types"

/**
 * Calculate distance between two coordinates in meters
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Check if a location is within the office geofence
 */
export const isLocationInOffice = (userLocation: Location.LocationObject, officeLocation: OfficeLocation): boolean => {
  if (!userLocation || !officeLocation.latitude || !officeLocation.longitude || !officeLocation.radius) {
    return false
  }

  const distance = calculateDistance(
    userLocation.coords.latitude,
    userLocation.coords.longitude,
    Number.parseFloat(officeLocation.latitude),
    Number.parseFloat(officeLocation.longitude),
  )

  return distance <= Number.parseFloat(officeLocation.radius)
}

/**
 * Get current location with high accuracy
 */
export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== "granted") {
      console.log("Location permission denied")
      return null
    }

    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
  } catch (error) {
    console.error("Error getting current location:", error)
    return null
  }
}

/**
 * Start watching location changes
 */
export const startLocationTracking = async (
  callback: (location: Location.LocationObject) => void,
): Promise<Location.LocationSubscription | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status !== "granted") {
      console.log("Location permission denied")
      return null
    }

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 30000, // Update every 30 seconds
      },
      callback,
    )
  } catch (error) {
    console.error("Error starting location tracking:", error)
    return null
  }
}

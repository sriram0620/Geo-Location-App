import * as Device from "expo-device"
import { Platform } from "react-native"

// Get device information including IMEI if available
export const getDeviceInfo = async () => {
  try {
    // Handle web platform differently
    if (Platform.OS === "web") {
      return {
        brand: "Web Browser",
        modelName: navigator.userAgent,
        osName: Platform.OS,
        osVersion: "N/A",
        deviceId: "web-" + Math.random().toString(36).substring(7),
        imei: ["web-device"],
      }
    }

    // For native platforms, use Expo Device instead of react-native-device-info
    const deviceData = {
      brand: Device.brand || "Unknown",
      modelName: Device.modelName || "Unknown",
      osName: Device.osName || Platform.OS,
      osVersion: Device.osVersion || "Unknown",
      deviceId: "unknown-device-id",
      imei: [] as string[],
    }

    // Safely get device ID - handle the case where the method might not exist
    try {
      if (typeof Device.getUniqueIdAsync === "function") {
        deviceData.deviceId = await Device.getUniqueIdAsync()
      } else if (typeof Device.getDeviceIdAsync === "function") {
        deviceData.deviceId = await Device.getDeviceIdAsync()
      } else {
        // Fallback to a generated ID if neither method is available
        deviceData.deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`
      }
    } catch (idError) {
      console.log("Error getting device ID:", idError)
      deviceData.deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`
    }

    // Add device ID as IMEI since we can't access actual IMEI
    deviceData.imei.push(deviceData.deviceId)

    console.log("Device info collected:", deviceData)
    return deviceData
  } catch (error) {
    console.error("Error getting device info:", error)
    // Return fallback data if there's an error
    return {
      brand: "Unknown",
      modelName: "Unknown",
      osName: Platform.OS,
      osVersion: "Unknown",
      deviceId: `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      imei: [`fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`],
    }
  }
}

// Improve the device verification logic to be more robust
export const verifyDeviceImei = (registeredImei: string[], currentImei: string[]): boolean => {
  // If either array is empty or undefined, handle it gracefully
  if (!registeredImei || !registeredImei.length) {
    console.log("No registered IMEI found, allowing new device")
    return true // Allow if no registered IMEI (first login)
  }

  if (!currentImei || !currentImei.length) {
    console.log("No current IMEI available")
    return false // Fail if we can't get current IMEI
  }

  // Check if any of the current IMEIs match any of the registered IMEIs
  const matches = registeredImei.some((savedImei) =>
    currentImei.some(
      (currentImeiItem) =>
        savedImei === currentImeiItem ||
        // Also check for partial matches (last 6 chars) for more flexibility
        (savedImei.length >= 6 && currentImeiItem.length >= 6 && savedImei.slice(-6) === currentImeiItem.slice(-6)),
    ),
  )

  console.log("IMEI match result:", matches)
  return matches
}

// Get a simplified device name for display
export const getDeviceName = (deviceInfo: any): string => {
  if (!deviceInfo) return "Unknown Device"

  return `${deviceInfo.brand} ${deviceInfo.modelName}`.trim() || "Unknown Device"
}

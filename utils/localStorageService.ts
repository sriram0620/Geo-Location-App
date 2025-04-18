import AsyncStorage from "@react-native-async-storage/async-storage"

// Keys for local storage
const KEYS = {
  PENDING_ATTENDANCE: "pendingAttendance",
  USER_DATA: "userData",
  OFFICE_LOCATION: "officeLocation",
  LAST_SYNC: "lastSync",
}

// Interface for attendance record
interface AttendanceRecord {
  id: string
  userId: string
  type: "check-in" | "check-out"
  timestamp: string
  timestampDate: any
  location?: {
    latitude: number
    longitude: number
  }
  paired?: boolean
  checkInId?: string
  durationMinutes?: number
  automatic?: boolean
  manual?: boolean
  offline?: boolean
}

// Interface for user data
interface UserData {
  id: string
  checkedIn: boolean
  lastCheckIn?: string
  lastCheckOut?: string
  currentCheckInId?: string
  lastLocation?: {
    latitude: number
    longitude: number
  }
}

// Interface for office location
interface OfficeLocation {
  latitude: number
  longitude: number
  radius: number
}

// Save pending attendance record
export const savePendingAttendance = async (record: AttendanceRecord): Promise<void> => {
  try {
    // Get existing records
    const existingRecordsJson = await AsyncStorage.getItem(KEYS.PENDING_ATTENDANCE)
    const existingRecords: AttendanceRecord[] = existingRecordsJson ? JSON.parse(existingRecordsJson) : []

    // Add new record
    existingRecords.push({
      ...record,
      offline: true, // Mark as created offline
    })

    // Save back to storage
    await AsyncStorage.setItem(KEYS.PENDING_ATTENDANCE, JSON.stringify(existingRecords))
  } catch (error) {
    console.error("Error saving pending attendance:", error)
    throw error
  }
}

// Get all pending attendance records
export const getPendingAttendance = async (): Promise<AttendanceRecord[]> => {
  try {
    const recordsJson = await AsyncStorage.getItem(KEYS.PENDING_ATTENDANCE)
    return recordsJson ? JSON.parse(recordsJson) : []
  } catch (error) {
    console.error("Error getting pending attendance:", error)
    return []
  }
}

// Clear pending attendance records
export const clearPendingAttendance = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.PENDING_ATTENDANCE)
  } catch (error) {
    console.error("Error clearing pending attendance:", error)
    throw error
  }
}

// Save user data locally
export const saveUserData = async (data: UserData): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving user data:", error)
    throw error
  }
}

// Get user data from local storage
export const getUserData = async (): Promise<UserData | null> => {
  try {
    const dataJson = await AsyncStorage.getItem(KEYS.USER_DATA)
    return dataJson ? JSON.parse(dataJson) : null
  } catch (error) {
    console.error("Error getting user data:", error)
    return null
  }
}

// Save office location data
export const saveOfficeLocation = async (data: OfficeLocation): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.OFFICE_LOCATION, JSON.stringify(data))
  } catch (error) {
    console.error("Error saving office location:", error)
    throw error
  }
}

// Get office location from local storage
export const getOfficeLocation = async (): Promise<OfficeLocation | null> => {
  try {
    const dataJson = await AsyncStorage.getItem(KEYS.OFFICE_LOCATION)
    return dataJson ? JSON.parse(dataJson) : null
  } catch (error) {
    console.error("Error getting office location:", error)
    return null
  }
}

// Save last sync timestamp
export const saveLastSync = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString())
  } catch (error) {
    console.error("Error saving last sync:", error)
    throw error
  }
}

// Get last sync timestamp
export const getLastSync = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEYS.LAST_SYNC)
  } catch (error) {
    console.error("Error getting last sync:", error)
    return null
  }
}

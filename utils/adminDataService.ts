import { collection, query, orderBy, getDocs, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { db, auth } from "../app/config/firebase"
import type { User, AttendanceRecord, OfficeLocation, OnsiteRequest } from "../app/types"

// Fetch users data
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, "users")
    const querySnapshot = await getDocs(usersRef)
    const usersList: User[] = []
    querySnapshot.forEach((doc) => {
      usersList.push({ id: doc.id, ...doc.data() } as User)
    })
    return usersList
  } catch (error) {
    console.error("Error fetching users:", error)
    throw error
  }
}

// Fetch attendance records
export const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  try {
    const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    const records: AttendanceRecord[] = []
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as AttendanceRecord)
    })
    return records
  } catch (error) {
    console.error("Error fetching attendance records:", error)
    throw error
  }
}

// Fetch office location settings
export const fetchOfficeLocation = async (): Promise<OfficeLocation> => {
  try {
    const docRef = doc(db, "settings", "office_location")
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
        radius: data.radius.toString(),
      }
    }
    return {
      latitude: "",
      longitude: "",
      radius: "",
    }
  } catch (error) {
    console.error("Error fetching office location:", error)
    throw error
  }
}

// Fetch onsite work requests
export const fetchOnsiteRequests = async (): Promise<OnsiteRequest[]> => {
  try {
    const requestsRef = collection(db, "onsiteRequests")
    const querySnapshot = await getDocs(requestsRef)
    const requestsList: OnsiteRequest[] = []
    querySnapshot.forEach((doc) => {
      requestsList.push({ id: doc.id, ...doc.data() } as OnsiteRequest)
    })
    return requestsList
  } catch (error) {
    console.error("Error fetching onsite requests:", error)
    throw error
  }
}

// Save office location settings
export const saveOfficeLocation = async (officeLocation: OfficeLocation): Promise<void> => {
  try {
    // Convert string values to numbers
    const latitude = Number.parseFloat(officeLocation.latitude)
    const longitude = Number.parseFloat(officeLocation.longitude)
    const radius = Number.parseFloat(officeLocation.radius)

    // Validate the values
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
      throw new Error("Invalid numeric values")
    }

    // Create the data object with numeric values
    const locationData = {
      latitude,
      longitude,
      radius,
      updatedAt: new Date().toISOString(),
    }

    // Save to Firestore
    await setDoc(doc(db, "settings", "office_location"), locationData)
  } catch (error) {
    console.error("Error saving office location:", error)
    throw error
  }
}

// Update user role
export const updateUserRole = async (userId: string, isAdmin: boolean): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, { isAdmin })
  } catch (error) {
    console.error("Error updating user role:", error)
    throw error
  }
}

// Update request status
export const updateRequestStatus = async (requestId: string, status: "approved" | "rejected"): Promise<void> => {
  try {
    const requestRef = doc(db, "onsiteRequests", requestId)
    await updateDoc(requestRef, {
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.uid,
    })
  } catch (error) {
    console.error("Error updating request:", error)
    throw error
  }
}

// Format minutes to hours and minutes display
export const formatDuration = (minutes: number): string => {
  if (!minutes && minutes !== 0) return "N/A"

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins} min`
  } else if (mins === 0) {
    return `${hours} hr`
  } else {
    return `${hours} hr ${mins} min`
  }
}

// Format date and time
export const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return "N/A"

  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)

  return date.toLocaleString()
}

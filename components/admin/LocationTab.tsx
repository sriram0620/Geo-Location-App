"use client"

import type React from "react"

import { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native"
import { MapPin, Save, Navigation } from "lucide-react-native"
import { MotiView } from "moti"
import { doc, setDoc } from "firebase/firestore"
import { db } from "../../app/config/firebase"
import type { OfficeLocation } from "../../app/types"

interface LocationTabProps {
  officeLocation: OfficeLocation
  setOfficeLocation: React.Dispatch<React.SetStateAction<OfficeLocation>>
  refreshing: boolean
  onRefresh: () => Promise<void>
  onSaveLocation: () => Promise<void>
}

export default function LocationTab({
  officeLocation,
  setOfficeLocation,
  refreshing,
  onRefresh,
  onSaveLocation,
}: LocationTabProps) {
  const [loading, setLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: string; longitude: string } | null>(null)

  // Function to get current location (for demonstration purposes)
  const getCurrentLocation = async () => {
    try {
      setLoading(true)

      // In a real app, you would use the device's location
      // For this demo, we'll just use a placeholder
      setTimeout(() => {
        // Example coordinates (San Francisco)
        setCurrentLocation({
          latitude: "37.7749",
          longitude: "-122.4194",
        })

        // Update the form with these coordinates
        setOfficeLocation((prev) => ({
          ...prev,
          latitude: "37.7749",
          longitude: "-122.4194",
        }))

        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Error getting current location:", error)
      Alert.alert("Error", "Failed to get current location")
      setLoading(false)
    }
  }

  // Function to save location settings
  const handleSaveLocation = async () => {
    if (!officeLocation.latitude || !officeLocation.longitude || !officeLocation.radius) {
      Alert.alert("Error", "Please fill all fields")
      return
    }

    try {
      setLoading(true)

      // Convert string values to numbers and validate
      const latitude = Number.parseFloat(officeLocation.latitude)
      const longitude = Number.parseFloat(officeLocation.longitude)
      const radius = Number.parseFloat(officeLocation.radius)

      // Validate the values
      if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
        Alert.alert("Error", "Please enter valid numeric values")
        setLoading(false)
        return
      }

      // Validate latitude range (-90 to 90)
      if (latitude < -90 || latitude > 90) {
        Alert.alert("Error", "Latitude must be between -90 and 90 degrees")
        setLoading(false)
        return
      }

      // Validate longitude range (-180 to 180)
      if (longitude < -180 || longitude > 180) {
        Alert.alert("Error", "Longitude must be between -180 and 180 degrees")
        setLoading(false)
        return
      }

      // Validate radius (must be positive)
      if (radius <= 0) {
        Alert.alert("Error", "Radius must be greater than 0")
        setLoading(false)
        return
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

      Alert.alert("Success", "Office location updated successfully")

      // Refresh the data
      onRefresh()
    } catch (error) {
      console.error("Error saving office location:", error)
      Alert.alert("Error", "Failed to update office location. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        style={styles.card}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500 }}
      >
        <View style={styles.cardHeader}>
          <MapPin size={20} color="#007AFF" />
          <Text style={styles.cardTitle}>Office Location Settings</Text>
        </View>

        <View style={styles.locationSettingsContainer}>
          <MotiView
            style={styles.inputGroup}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 300, delay: 100 }}
          >
            <Text style={styles.inputLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={officeLocation.latitude}
              onChangeText={(text) => setOfficeLocation((prev) => ({ ...prev, latitude: text }))}
              keyboardType="numeric"
              placeholder="Enter latitude (e.g., 37.7749)"
              placeholderTextColor="#999"
            />
          </MotiView>

          <MotiView
            style={styles.inputGroup}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 300, delay: 200 }}
          >
            <Text style={styles.inputLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={officeLocation.longitude}
              onChangeText={(text) => setOfficeLocation((prev) => ({ ...prev, longitude: text }))}
              keyboardType="numeric"
              placeholder="Enter longitude (e.g., -122.4194)"
              placeholderTextColor="#999"
            />
          </MotiView>

          <MotiView
            style={styles.inputGroup}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 300, delay: 300 }}
          >
            <Text style={styles.inputLabel}>Radius (meters)</Text>
            <TextInput
              style={styles.input}
              value={officeLocation.radius}
              onChangeText={(text) => setOfficeLocation((prev) => ({ ...prev, radius: text }))}
              keyboardType="numeric"
              placeholder="Enter radius in meters (e.g., 100)"
              placeholderTextColor="#999"
            />
          </MotiView>

          <MotiView
            style={styles.buttonContainer}
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 150, delay: 400 }}
          >
            <TouchableOpacity style={styles.getCurrentLocationButton} onPress={getCurrentLocation} disabled={loading}>
              <Navigation size={18} color="#007AFF" />
              <Text style={styles.getCurrentLocationText}>Get Current Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveLocationButton} onPress={handleSaveLocation} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveLocationButtonText}>Save Location</Text>
                </>
              )}
            </TouchableOpacity>
          </MotiView>

          {currentLocation && (
            <MotiView
              style={styles.currentLocationContainer}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300 }}
            >
              <Text style={styles.currentLocationTitle}>Current Location:</Text>
              <Text style={styles.currentLocationText}>
                Latitude: {currentLocation.latitude}, Longitude: {currentLocation.longitude}
              </Text>
            </MotiView>
          )}

          <MotiView
            style={styles.locationHelpContainer}
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 300, delay: 500 }}
          >
            <Text style={styles.locationHelp}>
              Set the office location and radius to define the area where employees can check in.
            </Text>
            <Text style={styles.locationHelpTip}>
              Tip: You can use Google Maps to find the exact latitude and longitude of your office.
            </Text>
          </MotiView>
        </View>
      </MotiView>

      <MotiView
        style={styles.card}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 200 }}
      >
        <View style={styles.cardHeader}>
          <MapPin size={20} color="#007AFF" />
          <Text style={styles.cardTitle}>Geofencing Information</Text>
        </View>

        <View style={styles.geofencingInfoContainer}>
          <Text style={styles.geofencingInfoText}>
            Geofencing allows the app to automatically check in and check out employees when they enter or leave the
            office area.
          </Text>

          <View style={styles.geofencingTipContainer}>
            <Text style={styles.geofencingTipTitle}>Recommended Settings:</Text>
            <Text style={styles.geofencingTipText}>• Small Office: 50-100 meters radius</Text>
            <Text style={styles.geofencingTipText}>• Medium Office: 100-200 meters radius</Text>
            <Text style={styles.geofencingTipText}>• Large Campus: 200-500 meters radius</Text>
          </View>

          <Text style={styles.geofencingNoteText}>
            Note: Setting a very small radius may cause check-in issues due to GPS accuracy limitations.
          </Text>
        </View>
      </MotiView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  cardTitle: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  locationSettingsContainer: {
    paddingVertical: 8,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#333",
  },
  buttonContainer: {
    marginTop: 15,
    gap: 12,
  },
  getCurrentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 14,
    borderRadius: 10,
  },
  getCurrentLocationText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
  },
  saveLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveLocationButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  currentLocationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0f8ff",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  currentLocationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  currentLocationText: {
    fontSize: 13,
    color: "#555",
  },
  locationHelpContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f0f8ff",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  locationHelp: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
  },
  locationHelpTip: {
    fontSize: 13,
    color: "#007AFF",
    marginTop: 8,
    fontWeight: "500",
  },
  geofencingInfoContainer: {
    padding: 12,
  },
  geofencingInfoText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  geofencingTipContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  geofencingTipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  geofencingTipText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 22,
  },
  geofencingNoteText: {
    fontSize: 13,
    color: "#FF9500",
    fontStyle: "italic",
  },
})

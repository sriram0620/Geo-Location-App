"use client"

import type React from "react"

import { View, Text, ScrollView, RefreshControl, StyleSheet, TextInput, TouchableOpacity } from "react-native"
import { MapPin, Save } from "lucide-react-native"
import { MotiView } from "moti"
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
              placeholder="Enter latitude"
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
              placeholder="Enter longitude"
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
              placeholder="Enter radius in meters"
              placeholderTextColor="#999"
            />
          </MotiView>

          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 150, delay: 400 }}
          >
            <TouchableOpacity style={styles.saveLocationButton} onPress={onSaveLocation} activeOpacity={0.8}>
              <Save size={18} color="#fff" />
              <Text style={styles.saveLocationButtonText}>Save Location</Text>
            </TouchableOpacity>
          </MotiView>

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
  saveLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 15,
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

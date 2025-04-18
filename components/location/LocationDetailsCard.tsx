import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { MotiView } from "moti"
import { MapPin, Navigation } from "lucide-react-native"
import { useLocation } from "./LocationContext"

const LocationDetailsCard: React.FC = () => {
  const { location, officeLocation, refreshing, handleRefresh } = useLocation()

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 300 }}
      style={styles.locationDetailsCard}
    >
      <View style={styles.locationDetailsHeader}>
        <MapPin size={20} color="#6C63FF" />
        <Text style={styles.locationDetailsTitle}>Location Details</Text>
      </View>

      <View style={styles.locationDetailsContent}>
        {location && (
          <>
            <View style={styles.locationDetailRow}>
              <Text style={styles.locationDetailLabel}>Your Coordinates:</Text>
              <Text style={styles.locationDetailValue}>
                {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
              </Text>
            </View>

            {officeLocation && (
              <>
                <View style={styles.locationDetailRow}>
                  <Text style={styles.locationDetailLabel}>Office Coordinates:</Text>
                  <Text style={styles.locationDetailValue}>
                    {officeLocation.latitude.toFixed(6)}, {officeLocation.longitude.toFixed(6)}
                  </Text>
                </View>

                <View style={styles.locationDetailRow}>
                  <Text style={styles.locationDetailLabel}>Office Radius:</Text>
                  <Text style={styles.locationDetailValue}>{officeLocation.radius} meters</Text>
                </View>
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
          <Navigation size={16} color="#6C63FF" />
          <Text style={styles.refreshButtonText}>Refresh Location</Text>
        </TouchableOpacity>
      </View>
    </MotiView>
  )
}

const styles = StyleSheet.create({
  locationDetailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  locationDetailsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 10,
  },
  locationDetailsContent: {
    marginBottom: 8,
  },
  locationDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  locationDetailLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
    minWidth: 120,
  },
  locationDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  refreshButtonText: {
    color: "#6C63FF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
})

export default LocationDetailsCard

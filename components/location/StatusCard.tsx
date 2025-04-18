"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { View, Text, StyleSheet, Animated } from "react-native"
import { MotiView } from "moti"
import { LinearGradient } from "expo-linear-gradient"
import { useLocation } from "./LocationContext"

const StatusCard: React.FC = () => {
  const { isInOffice, distanceFromOffice, officeLocation } = useLocation()

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const distanceAnim = useRef(new Animated.Value(0)).current

  // Start pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )

    if (isInOffice !== null) {
      pulse.start()
    }

    return () => pulse.stop()
  }, [isInOffice, pulseAnim])

  // Animate distance value
  useEffect(() => {
    if (distanceFromOffice !== null) {
      Animated.timing(distanceAnim, {
        toValue: distanceFromOffice,
        duration: 1000,
        useNativeDriver: false,
      }).start()
    }
  }, [distanceFromOffice, distanceAnim])

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 100 }}
    >
      <LinearGradient
        colors={isInOffice ? ["#6C63FF", "#8F87FF"] : ["#F8F9FA", "#F1F3F5"]}
        style={styles.statusCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statusCardContent}>
          <Animated.View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: isInOffice ? "#34C759" : "#FF3B30",
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusTitle, isInOffice && styles.statusTitleInOffice]}>
              {isInOffice ? "You are in the office" : "You are outside the office"}
            </Text>
            <Text style={[styles.statusSubtitle, isInOffice && styles.statusSubtitleInOffice]}>
              {distanceFromOffice !== null
                ? `${Math.round(distanceFromOffice)} meters from office location`
                : "Distance unknown"}
            </Text>
          </View>
        </View>

        {/* Distance Visualization */}
        <View style={styles.distanceContainer}>
          <View style={styles.distanceBar}>
            <Animated.View
              style={[
                styles.distanceFill,
                {
                  width: distanceAnim.interpolate({
                    inputRange: [0, officeLocation?.radius * 2 || 200],
                    outputRange: ["0%", "100%"],
                    extrapolate: "clamp",
                  }),
                  backgroundColor: isInOffice ? "#34C759" : "#FF3B30",
                },
              ]}
            />
          </View>
          <View style={styles.distanceLabels}>
            <Text style={styles.distanceLabel}>Office</Text>
            <Text style={styles.distanceLabel}>{officeLocation?.radius || 100}m</Text>
            <Text style={styles.distanceLabel}>{(officeLocation?.radius || 100) * 2}m</Text>
          </View>
        </View>
      </LinearGradient>
    </MotiView>
  )
}

const styles = StyleSheet.create({
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusCardContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statusTitleInOffice: {
    color: "#fff",
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  statusSubtitleInOffice: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  distanceContainer: {
    marginTop: 8,
  },
  distanceBar: {
    height: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  distanceFill: {
    height: "100%",
    borderRadius: 4,
  },
  distanceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  distanceLabel: {
    fontSize: 12,
    color: "#666",
  },
})

export default StatusCard

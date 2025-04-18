import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { WifiOff, RefreshCw } from "lucide-react-native"

interface OfflineIndicatorProps {
  isOnline: boolean
  pendingCount: number
  onSync: () => Promise<void>
  isSyncing: boolean
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline, pendingCount, onSync, isSyncing }) => {
  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <View style={[styles.container, isOnline ? styles.onlineContainer : styles.offlineContainer]}>
      <View style={styles.contentContainer}>
        {!isOnline && <WifiOff size={16} color="#fff" style={styles.icon} />}
        <Text style={styles.text}>
          {isOnline
            ? `You have ${pendingCount} pending record${pendingCount !== 1 ? "s" : ""} to sync`
            : "You are currently offline. Data will be synced when you're back online."}
        </Text>
      </View>

      {isOnline && pendingCount > 0 && (
        <TouchableOpacity style={styles.syncButton} onPress={onSync} disabled={isSyncing}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#6C63FF" />
          ) : (
            <>
              <RefreshCw size={14} color="#6C63FF" />
              <Text style={styles.syncText}>Sync</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineContainer: {
    backgroundColor: "#FF3B30",
  },
  onlineContainer: {
    backgroundColor: "#6C63FF",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncText: {
    color: "#6C63FF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
})

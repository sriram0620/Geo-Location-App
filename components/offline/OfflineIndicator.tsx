import type React from "react"
import { Text, StyleSheet, TouchableOpacity } from "react-native"
import { MotiView } from "moti"
import { Wifi, WifiOff, RefreshCw } from "lucide-react-native"

interface OfflineIndicatorProps {
  isOnline: boolean
  pendingCount: number
  onSync?: () => void
  isSyncing?: boolean
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  pendingCount,
  onSync,
  isSyncing = false,
}) => {
  if (isOnline && pendingCount === 0) return null

  return (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", stiffness: 200 }}
      style={[styles.container, isOnline ? styles.syncContainer : styles.offlineContainer]}
    >
      {isOnline ? (
        <>
          <Wifi size={16} color="#fff" />
          <Text style={styles.text}>{isSyncing ? "Syncing data..." : `Online - ${pendingCount} records to sync`}</Text>
          {!isSyncing && pendingCount > 0 && onSync && (
            <TouchableOpacity style={styles.syncButton} onPress={onSync}>
              <RefreshCw size={14} color="#fff" />
              <Text style={styles.syncText}>Sync</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <WifiOff size={16} color="#fff" />
          <Text style={styles.text}>Offline - {pendingCount} records pending</Text>
        </>
      )}
    </MotiView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineContainer: {
    backgroundColor: "#FF3B30",
  },
  syncContainer: {
    backgroundColor: "#34C759",
  },
  text: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  syncText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 4,
  },
})

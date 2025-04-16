"use client"

import { useState } from "react"
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from "react-native"
import { ExternalLink, ChevronRight, CheckCircle, XCircle } from "lucide-react-native"
import { MotiView } from "moti"
import { formatDateTime } from "../../utils/adminDataService"
import type { OnsiteRequest } from "../../app/types"

interface RequestsTabProps {
  onsiteRequests: OnsiteRequest[]
  refreshing: boolean
  onRefresh: () => Promise<void>
  onSelectRequest: (request: OnsiteRequest) => void
}

export default function RequestsTab({ onsiteRequests, refreshing, onRefresh, onSelectRequest }: RequestsTabProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  // Filter requests based on selected filter
  const filteredRequests = onsiteRequests.filter((request) => {
    if (activeFilter === "all") return true
    return request.status === activeFilter
  })

  // Sort requests: pending first, then by date (newest first)
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    // Sort by status (pending first) then by date (newest first)
    if (a.status === "pending" && b.status !== "pending") return -1
    if (a.status !== "pending" && b.status === "pending") return 1

    const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000
    const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000
    return dateB - dateA
  })

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
          <ExternalLink size={20} color="#007AFF" />
          <Text style={styles.cardTitle}>Onsite Work Requests</Text>
        </View>

        <MotiView
          style={styles.requestsFilter}
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 300, delay: 200 }}
        >
          <FilterButton
            label="All"
            active={activeFilter === "all"}
            onPress={() => setActiveFilter("all")}
            count={onsiteRequests.length}
          />
          <FilterButton
            label="Pending"
            active={activeFilter === "pending"}
            onPress={() => setActiveFilter("pending")}
            count={onsiteRequests.filter((req) => req.status === "pending").length}
          />
          <FilterButton
            label="Approved"
            active={activeFilter === "approved"}
            onPress={() => setActiveFilter("approved")}
            count={onsiteRequests.filter((req) => req.status === "approved").length}
          />
          <FilterButton
            label="Rejected"
            active={activeFilter === "rejected"}
            onPress={() => setActiveFilter("rejected")}
            count={onsiteRequests.filter((req) => req.status === "rejected").length}
          />
        </MotiView>

        {sortedRequests.length > 0 ? (
          sortedRequests.map((request, index) => (
            <MotiView
              key={request.id}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: 300 + index * 50 }}
            >
              <TouchableOpacity style={styles.requestItem} onPress={() => onSelectRequest(request)} activeOpacity={0.7}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestUser}>{request.userName}</Text>
                  <Text style={styles.requestReason}>{request.reason}</Text>
                  <Text style={styles.requestDate}>
                    {formatDateTime(request.startDateTime)} - {formatDateTime(request.endDateTime)}
                  </Text>
                </View>
                <View style={styles.requestStatusContainer}>
                  {request.status === "pending" ? (
                    <View style={[styles.requestStatus, styles.pendingStatus]}>
                      <Text style={styles.pendingStatusText}>Pending</Text>
                    </View>
                  ) : request.status === "approved" ? (
                    <View style={[styles.requestStatus, styles.approvedStatus]}>
                      <CheckCircle size={14} color="#4CAF50" style={styles.statusIcon} />
                      <Text style={styles.approvedStatusText}>Approved</Text>
                    </View>
                  ) : (
                    <View style={[styles.requestStatus, styles.rejectedStatus]}>
                      <XCircle size={14} color="#F44336" style={styles.statusIcon} />
                      <Text style={styles.rejectedStatusText}>Rejected</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color="#8E8E93" />
                </View>
              </TouchableOpacity>
            </MotiView>
          ))
        ) : (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 300, delay: 300 }}
          >
            <Text style={styles.noRecords}>No requests found</Text>
          </MotiView>
        )}
      </MotiView>
    </ScrollView>
  )
}

interface FilterButtonProps {
  label: string
  active: boolean
  onPress: () => void
  count: number
}

function FilterButton({ label, active, onPress, count }: FilterButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>{label}</Text>
      <View style={[styles.filterCount, active && styles.filterCountActive]}>
        <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
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
  requestsFilter: {
    flexDirection: "row",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    fontSize: 13,
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  filterCount: {
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  filterCountActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  filterCountText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  filterCountTextActive: {
    color: "#fff",
  },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#fafafa",
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  requestInfo: {
    flex: 1,
    paddingRight: 10,
  },
  requestUser: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  requestReason: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: "#777",
  },
  requestStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  pendingStatus: {
    backgroundColor: "#FFF8E1",
  },
  approvedStatus: {
    backgroundColor: "#E8F5E9",
  },
  rejectedStatus: {
    backgroundColor: "#FFEBEE",
  },
  statusIcon: {
    marginRight: 4,
  },
  pendingStatusText: {
    fontSize: 12,
    color: "#FF9800",
    fontWeight: "600",
  },
  approvedStatusText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  rejectedStatusText: {
    fontSize: 12,
    color: "#F44336",
    fontWeight: "600",
  },
  noRecords: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    padding: 15,
  },
})

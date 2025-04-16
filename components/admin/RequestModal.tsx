"use client"

import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native"
import { CheckCircle, XCircle } from "lucide-react-native"
import { MotiView } from "moti"
import { formatDateTime } from "../../utils/adminDataService"
import type { OnsiteRequest } from "../../app/types"

interface RequestModalProps {
  visible: boolean
  request: OnsiteRequest | null
  onClose: () => void
  onApprove: (requestId: string) => void
  onReject: (requestId: string) => void
}

export default function RequestModal({ visible, request, onClose, onApprove, onReject }: RequestModalProps) {
  if (!request) return null

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <MotiView
          style={styles.modalContent}
          from={{ opacity: 0, scale: 0.9, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 18 }}
        >
          <Text style={styles.modalTitle}>Onsite Work Request</Text>

          <View style={styles.requestDetailContainer}>
            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>User:</Text>
              <Text style={styles.requestDetailValue}>{request.userName}</Text>
            </View>

            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>Reason:</Text>
              <Text style={styles.requestDetailValue}>{request.reason}</Text>
            </View>

            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>Start:</Text>
              <Text style={styles.requestDetailValue}>{formatDateTime(request.startDateTime)}</Text>
            </View>

            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>End:</Text>
              <Text style={styles.requestDetailValue}>{formatDateTime(request.endDateTime)}</Text>
            </View>

            <View style={styles.requestDetailRow}>
              <Text style={styles.requestDetailLabel}>Status:</Text>
              <View style={styles.requestDetailStatus}>
                {request.status === "pending" ? (
                  <Text style={styles.pendingStatusText}>Pending</Text>
                ) : request.status === "approved" ? (
                  <Text style={styles.approvedStatusText}>Approved</Text>
                ) : (
                  <Text style={styles.rejectedStatusText}>Rejected</Text>
                )}
              </View>
            </View>

            {request.status === "pending" && (
              <View style={styles.requestActionButtons}>
                <TouchableOpacity
                  style={[styles.requestActionButton, styles.rejectButton]}
                  onPress={() => onReject(request.id)}
                  activeOpacity={0.8}
                >
                  <XCircle size={16} color="#fff" />
                  <Text style={styles.requestActionButtonText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.requestActionButton, styles.approveButton]}
                  onPress={() => onApprove(request.id)}
                  activeOpacity={0.8}
                >
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.requestActionButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.closeModalButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeModalButtonText}>Close</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 20,
    textAlign: "center",
  },
  requestDetailContainer: {
    marginBottom: 20,
  },
  requestDetailRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  requestDetailLabel: {
    width: 70,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  requestDetailValue: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  requestDetailStatus: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  requestActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  requestActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
  },
  approveButton: {
    backgroundColor: "#4CAF50",
    marginLeft: 8,
  },
  rejectButton: {
    backgroundColor: "#F44336",
    marginRight: 8,
  },
  requestActionButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  closeModalButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  closeModalButtonText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 14,
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
})

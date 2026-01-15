"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import type {
  Partner,
  PartnerConnection,
  ConnectionType,
} from "@/lib/partnerships";
import { CONNECTION_TYPE_LABELS } from "@/lib/partnerships";
import { getUserFriendlyError } from "@/lib/errorMessages";

type ConnectionsModalProps = {
  partnerId: string;
  partnerName: string;
  partners: Partner[];
  connections: PartnerConnection[];
  onClose: () => void;
  onConnectionsUpdated: (connections: PartnerConnection[]) => void;
};

const ConnectionsModal = ({
  partnerId,
  partnerName,
  partners,
  connections,
  onClose,
  onConnectionsUpdated,
}: ConnectionsModalProps) => {
  const [saving, setSaving] = useState(false);
  const [localConnections, setLocalConnections] =
    useState<PartnerConnection[]>(connections);

  // New connection form
  const [newConnection, setNewConnection] = useState({
    targetPartnerId: "",
    connectionType: "knows" as ConnectionType,
    strength: 3,
    notes: "",
  });

  // Get available partners (not already connected and not self)
  const availablePartners = partners.filter((p) => {
    if (p.id === partnerId) return false;
    const alreadyConnected = localConnections.some(
      (c) =>
        (c.from_partner_id === partnerId && c.to_partner_id === p.id) ||
        (c.to_partner_id === partnerId && c.from_partner_id === p.id)
    );
    return !alreadyConnected;
  });

  const getConnectedPartner = (connection: PartnerConnection) => {
    const otherId =
      connection.from_partner_id === partnerId
        ? connection.to_partner_id
        : connection.from_partner_id;
    return partners.find((p) => p.id === otherId);
  };

  const handleAddConnection = async () => {
    if (!newConnection.targetPartnerId) {
      toast.error("Please select a partner to connect");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/partnerships/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: {
            from_partner_id: partnerId,
            to_partner_id: newConnection.targetPartnerId,
            connection_type: newConnection.connectionType,
            strength: newConnection.strength,
            notes: newConnection.notes || null,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to create connection");

      const data = await response.json();
      const updatedConnections = [...localConnections, data.connection];
      setLocalConnections(updatedConnections);
      onConnectionsUpdated(updatedConnections);

      // Reset form
      setNewConnection({
        targetPartnerId: "",
        connectionType: "knows",
        strength: 3,
        notes: "",
      });

      toast.success("Connection added successfully!");
    } catch (err) {
      console.error("Add connection failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to add connection"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConnection = async (
    connectionId: string,
    updates: Partial<{ connection_type: ConnectionType; strength: number; notes: string | null }>
  ) => {
    setSaving(true);
    try {
      const connection = localConnections.find((c) => c.id === connectionId);
      if (!connection) return;

      const response = await fetch("/api/admin/partnerships/connections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: connectionId,
          connection: {
            connection_type: updates.connection_type ?? connection.connection_type,
            strength: updates.strength ?? connection.strength,
            notes: updates.notes !== undefined ? updates.notes : connection.notes,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to update connection");

      const data = await response.json();
      const updatedConnections = localConnections.map((c) =>
        c.id === connectionId ? data.connection : c
      );
      setLocalConnections(updatedConnections);
      onConnectionsUpdated(updatedConnections);

      toast.success("Connection updated!");
    } catch (err) {
      console.error("Update connection failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to update connection"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm("Delete this connection?")) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/partnerships/connections?id=${connectionId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete connection");

      const updatedConnections = localConnections.filter(
        (c) => c.id !== connectionId
      );
      setLocalConnections(updatedConnections);
      onConnectionsUpdated(updatedConnections);

      toast.success("Connection deleted!");
    } catch (err) {
      console.error("Delete connection failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to delete connection"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-[#0b0b0b] border border-[#262626] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1f1f1f]">
          <div>
            <h2 className="text-xl font-semibold text-[#f6e1bd]">
              Connections
            </h2>
            <p className="text-sm text-[#a3a3a3] mt-1">
              Managing connections for {partnerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#f6e1bd] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Existing Connections */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#f6e1bd] mb-3">
              Existing Connections ({localConnections.length})
            </h3>

            {localConnections.length === 0 ? (
              <p className="text-sm text-[#737373] text-center py-4">
                No connections yet. Add one below.
              </p>
            ) : (
              <div className="space-y-3">
                {localConnections.map((connection) => {
                  const connectedPartner = getConnectedPartner(connection);
                  if (!connectedPartner) return null;

                  return (
                    <div
                      key={connection.id}
                      className="rounded-xl border border-[#1f1f1f] bg-[#090909] p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-[#f6e1bd]">
                            {connectedPartner.name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <select
                              className="rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-2 py-1 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                              value={connection.connection_type}
                              onChange={(e) =>
                                handleUpdateConnection(connection.id, {
                                  connection_type: e.target.value as ConnectionType,
                                })
                              }
                              disabled={saving}
                            >
                              {Object.entries(CONNECTION_TYPE_LABELS).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                )
                              )}
                            </select>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#737373]">Strength:</span>
                              <select
                                className="rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-2 py-1 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                                value={connection.strength}
                                onChange={(e) =>
                                  handleUpdateConnection(connection.id, {
                                    strength: parseInt(e.target.value),
                                  })
                                }
                                disabled={saving}
                              >
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {connection.notes && (
                            <p className="mt-2 text-xs text-[#737373]">
                              {connection.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteConnection(connection.id)}
                          className="ml-4 rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Connection */}
          <div>
            <h3 className="text-sm font-semibold text-[#f6e1bd] mb-3">
              Add New Connection
            </h3>

            {availablePartners.length === 0 ? (
              <p className="text-sm text-[#737373] text-center py-4">
                All partners are already connected.
              </p>
            ) : (
              <div className="rounded-xl border border-[#1f1f1f] bg-[#090909] p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Partner
                    <select
                      className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                      value={newConnection.targetPartnerId}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          targetPartnerId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select partner...</option>
                      {availablePartners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                    Connection Type
                    <select
                      className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                      value={newConnection.connectionType}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          connectionType: e.target.value as ConnectionType,
                        }))
                      }
                    >
                      {Object.entries(CONNECTION_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Strength (1-5)
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      className="flex-1 h-2 bg-[#1f1f1f] rounded-lg appearance-none cursor-pointer"
                      value={newConnection.strength}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          strength: parseInt(e.target.value),
                        }))
                      }
                    />
                    <span className="w-8 text-center text-sm text-[#f6e1bd]">
                      {newConnection.strength}
                    </span>
                  </div>
                </label>

                <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                  Notes (optional)
                  <input
                    className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#0b0b0b] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                    value={newConnection.notes}
                    onChange={(e) =>
                      setNewConnection((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Any notes about this connection..."
                  />
                </label>

                <button
                  onClick={handleAddConnection}
                  disabled={saving || !newConnection.targetPartnerId}
                  className="w-full rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Connection"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-[#1f1f1f]">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm hover:border-[#cb6b1e]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionsModal;

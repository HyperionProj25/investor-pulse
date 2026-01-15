"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import PartnershipsNav from "@/components/PartnershipsNav";
import PartnerModal from "@/components/admin/partnerships/PartnerModal";
import ConnectionsModal from "@/components/admin/partnerships/ConnectionsModal";
import NetworkView from "@/components/admin/partnerships/NetworkView";
import { ADMIN_PERSONAS, ADMIN_SLUGS } from "@/lib/adminUsers";
import type {
  Partner,
  PartnerConnection,
  PartnerNodePosition,
  PartnerType,
  PartnerStatus,
  PartnerSortField,
  SortDirection,
} from "@/lib/partnerships";
import {
  PARTNER_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  PARTNER_TYPE_COLORS,
} from "@/lib/partnerships";
import { formatNumber } from "@/lib/partnershipsValidation";
import { getUserFriendlyError } from "@/lib/errorMessages";

type ViewMode = "list" | "network";

const PartnershipsPage = () => {
  const router = useRouter();
  const [authorizedAdmin, setAuthorizedAdmin] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [connections, setConnections] = useState<PartnerConnection[]>([]);
  const [positions, setPositions] = useState<PartnerNodePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filters
  const [typeFilter, setTypeFilter] = useState<PartnerType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<PartnerSortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Modals
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionPartnerId, setConnectionPartnerId] = useState<string | null>(null);

  const adminLabel = useMemo(() => {
    if (!authorizedAdmin) return null;
    const admin = ADMIN_PERSONAS.find((p) => p.slug === authorizedAdmin);
    return admin?.shortLabel ?? admin?.name ?? authorizedAdmin;
  }, [authorizedAdmin]);

  // Session verification
  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          router.push("/?mode=admin");
          return;
        }
        const data = await response.json();
        if (data.role === "admin" && ADMIN_SLUGS.includes(data.slug)) {
          setAuthorizedAdmin(data.slug);
        } else {
          router.push("/?mode=admin");
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        router.push("/?mode=admin");
      } finally {
        setSessionChecked(true);
      }
    };
    void verifySession();
  }, [router]);

  // Load partners data
  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/admin/partnerships?connections=true&positions=true"
      );
      if (!response.ok) throw new Error("Failed to load partners");
      const data = await response.json();

      setPartners(data.partners || []);
      setConnections(data.connections || []);
      setPositions(data.positions || []);
    } catch (err) {
      console.error("Load failed:", err);
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorizedAdmin) void loadPartners();
  }, [authorizedAdmin, loadPartners]);

  // Filtered and sorted partners
  const filteredPartners = useMemo(() => {
    let result = [...partners];

    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((p) => p.type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.location_city?.toLowerCase().includes(query) ||
          p.location_state?.toLowerCase().includes(query) ||
          p.notes?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "ecosystem_impact":
          comparison = a.ecosystem_impact - b.ecosystem_impact;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "created_at":
        default:
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [partners, typeFilter, statusFilter, searchQuery, sortField, sortDirection]);

  // Partner operations
  const handleAddPartner = () => {
    setEditingPartner(null);
    setShowPartnerModal(true);
  };

  const handleEditPartner = (partner: Partner) => {
    setEditingPartner(partner);
    setShowPartnerModal(true);
  };

  const handleDeletePartner = async (partner: Partner) => {
    if (!confirm(`Delete "${partner.name}"? This cannot be undone.`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/partnerships?id=${partner.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete partner");

      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
      setConnections((prev) =>
        prev.filter(
          (c) =>
            c.from_partner_id !== partner.id && c.to_partner_id !== partner.id
        )
      );
      toast.success("Partner deleted successfully!");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to delete partner"));
    } finally {
      setSaving(false);
    }
  };

  const handleViewConnections = (partnerId: string) => {
    setConnectionPartnerId(partnerId);
    setShowConnectionsModal(true);
  };

  const handlePartnerSaved = (partner: Partner, isNew: boolean) => {
    if (isNew) {
      setPartners((prev) => [partner, ...prev]);
    } else {
      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? partner : p))
      );
    }
    setShowPartnerModal(false);
    setEditingPartner(null);
  };

  const handleConnectionsUpdated = (newConnections: PartnerConnection[]) => {
    // Update connections for the current partner
    const otherConnections = connections.filter(
      (c) =>
        c.from_partner_id !== connectionPartnerId &&
        c.to_partner_id !== connectionPartnerId
    );
    setConnections([...otherConnections, ...newConnections]);
  };

  const handlePositionUpdate = async (partnerId: string, x: number, y: number) => {
    try {
      await fetch("/api/admin/partnerships/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, x, y }),
      });
    } catch (err) {
      console.error("Failed to save position:", err);
    }
  };

  const getPartnerConnections = (partnerId: string) => {
    return connections.filter(
      (c) => c.from_partner_id === partnerId || c.to_partner_id === partnerId
    );
  };

  // Toggle sort
  const handleSort = (field: PartnerSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIndicator = (field: PartnerSortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  if (!sessionChecked || loading) {
    return (
      <div className="min-h-screen bg-[#020202] text-[#f6e1bd] flex items-center justify-center">
        <p className="text-sm text-[#a3a3a3]">Loading...</p>
      </div>
    );
  }

  if (!authorizedAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020202] text-[#f6e1bd]">
      <PartnershipsNav adminLabel={adminLabel || undefined} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Partner Network</h1>
            <p className="text-sm text-[#a3a3a3] mt-1">
              Manage ecosystem partners, tech partners, and key people.
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-[#cb6b1e] text-black"
                  : "border border-[#2a2a2a] text-[#f6e1bd] hover:border-[#cb6b1e]"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("network")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "network"
                  ? "bg-[#cb6b1e] text-black"
                  : "border border-[#2a2a2a] text-[#f6e1bd] hover:border-[#cb6b1e]"
              }`}
            >
              Network View
            </button>
          </div>
        </div>

        {viewMode === "list" ? (
          <>
            {/* Filters Row */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Search partners..."
                className="w-64 rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] placeholder-[#737373] focus:border-[#cb6b1e] focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Type Filter */}
              <select
                className="rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as PartnerType | "all")}
              >
                <option value="all">All Types</option>
                <option value="ecosystem">Ecosystem</option>
                <option value="tech">Tech</option>
                <option value="person">Person</option>
              </select>

              {/* Status Filter */}
              <select
                className="rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PartnerStatus | "all")}
              >
                <option value="all">All Statuses</option>
                <option value="target">Target</option>
                <option value="contacted">Contacted</option>
                <option value="in_progress">In Progress</option>
                <option value="secured">Secured</option>
                <option value="inactive">Inactive</option>
              </select>

              <div className="flex-1" />

              {/* Add Partner Button */}
              <button
                onClick={handleAddPartner}
                className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e]"
              >
                + Add Partner
              </button>
            </div>

            {/* Summary Stats */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-4">
                <p className="text-2xl font-bold text-[#f6e1bd]">{partners.length}</p>
                <p className="text-xs text-[#737373] uppercase tracking-wider">Total Partners</p>
              </div>
              <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-4">
                <p className="text-2xl font-bold text-[#3b82f6]">
                  {partners.filter((p) => p.type === "ecosystem").length}
                </p>
                <p className="text-xs text-[#737373] uppercase tracking-wider">Ecosystem</p>
              </div>
              <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-4">
                <p className="text-2xl font-bold text-[#22c55e]">
                  {partners.filter((p) => p.type === "tech").length}
                </p>
                <p className="text-xs text-[#737373] uppercase tracking-wider">Tech</p>
              </div>
              <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-4">
                <p className="text-2xl font-bold text-[#f97316]">
                  {partners.filter((p) => p.type === "person").length}
                </p>
                <p className="text-xs text-[#737373] uppercase tracking-wider">People</p>
              </div>
              <div className="rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-4">
                <p className="text-2xl font-bold text-[#cb6b1e]">
                  {partners.filter((p) => p.status === "secured").length}
                </p>
                <p className="text-xs text-[#737373] uppercase tracking-wider">Secured</p>
              </div>
            </div>

            {/* Partners Table */}
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1f1f1f]">
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] cursor-pointer hover:text-[#f6e1bd]"
                        onClick={() => handleSort("name")}
                      >
                        Partner{getSortIndicator("name")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                        Location
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] cursor-pointer hover:text-[#f6e1bd]"
                        onClick={() => handleSort("ecosystem_impact")}
                      >
                        Impact{getSortIndicator("ecosystem_impact")}
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] cursor-pointer hover:text-[#f6e1bd]"
                        onClick={() => handleSort("status")}
                      >
                        Status{getSortIndicator("status")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                        Connections
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f1f]">
                    {filteredPartners.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#737373]">
                          {partners.length === 0
                            ? "No partners yet. Add your first partner to get started."
                            : "No partners match your filters."}
                        </td>
                      </tr>
                    ) : (
                      filteredPartners.map((partner) => (
                        <tr
                          key={partner.id}
                          className="hover:bg-[#0f0f0f] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor: PARTNER_TYPE_COLORS[partner.type],
                                }}
                              />
                              <div>
                                <p className="font-medium text-[#f6e1bd]">
                                  {partner.name}
                                </p>
                                {partner.website && (
                                  <a
                                    href={partner.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#737373] hover:text-[#cb6b1e]"
                                  >
                                    {new URL(partner.website).hostname}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                              style={{
                                backgroundColor: `${PARTNER_TYPE_COLORS[partner.type]}20`,
                                color: PARTNER_TYPE_COLORS[partner.type],
                              }}
                            >
                              {PARTNER_TYPE_LABELS[partner.type]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#a3a3a3]">
                            {partner.location_city && partner.location_state
                              ? `${partner.location_city}, ${partner.location_state}`
                              : partner.location_city || partner.location_state || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#cb6b1e] rounded-full"
                                  style={{
                                    width: `${(partner.ecosystem_impact / 10) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-[#a3a3a3]">
                                {partner.ecosystem_impact}/10
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                partner.status === "secured"
                                  ? "bg-green-500/20 text-green-400"
                                  : partner.status === "in_progress"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : partner.status === "contacted"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : partner.status === "inactive"
                                  ? "bg-gray-500/20 text-gray-400"
                                  : "bg-[#cb6b1e]/20 text-[#cb6b1e]"
                              }`}
                            >
                              {PARTNER_STATUS_LABELS[partner.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleViewConnections(partner.id)}
                              className="text-xs text-[#a3a3a3] hover:text-[#cb6b1e]"
                            >
                              {getPartnerConnections(partner.id).length} connections
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditPartner(partner)}
                                className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs hover:border-[#cb6b1e]"
                                disabled={saving}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePartner(partner)}
                                className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Network View */
          <NetworkView
            partners={filteredPartners}
            connections={connections}
            positions={positions}
            onPartnerClick={handleEditPartner}
            onAddPartner={handleAddPartner}
            onPositionUpdate={handlePositionUpdate}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            onTypeFilterChange={setTypeFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}
      </main>

      {/* Partner Modal */}
      {showPartnerModal && (
        <PartnerModal
          partner={editingPartner}
          onClose={() => {
            setShowPartnerModal(false);
            setEditingPartner(null);
          }}
          onSave={handlePartnerSaved}
        />
      )}

      {/* Connections Modal */}
      {showConnectionsModal && connectionPartnerId && (
        <ConnectionsModal
          partnerId={connectionPartnerId}
          partnerName={
            partners.find((p) => p.id === connectionPartnerId)?.name || ""
          }
          partners={partners}
          connections={connections.filter(
            (c) =>
              c.from_partner_id === connectionPartnerId ||
              c.to_partner_id === connectionPartnerId
          )}
          onClose={() => {
            setShowConnectionsModal(false);
            setConnectionPartnerId(null);
          }}
          onConnectionsUpdated={handleConnectionsUpdated}
        />
      )}
    </div>
  );
};

export default PartnershipsPage;

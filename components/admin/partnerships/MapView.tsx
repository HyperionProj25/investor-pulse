"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type {
  Partner,
  PartnerConnection,
  PartnerType,
  PartnerStatus,
} from "@/lib/partnerships";
import {
  PARTNER_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  PARTNER_TYPE_COLORS,
} from "@/lib/partnerships";
import { formatNumber } from "@/lib/partnershipsValidation";
import type { Map as LeafletMap } from "leaflet";

// Dynamic imports for Leaflet (avoid SSR issues)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Map controls component
function MapControls({
  onFitAll,
  onZoomIn,
  onZoomOut,
}: {
  onFitAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={onZoomIn}
        className="w-10 h-10 rounded-lg bg-[#0b0b0b] border border-[#2a2a2a] text-[#f6e1bd] hover:border-[#cb6b1e] flex items-center justify-center text-xl font-bold transition-colors"
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className="w-10 h-10 rounded-lg bg-[#0b0b0b] border border-[#2a2a2a] text-[#f6e1bd] hover:border-[#cb6b1e] flex items-center justify-center text-xl font-bold transition-colors"
        title="Zoom Out"
      >
        −
      </button>
      <button
        onClick={onFitAll}
        className="w-10 h-10 rounded-lg bg-[#0b0b0b] border border-[#2a2a2a] text-[#f6e1bd] hover:border-[#cb6b1e] flex items-center justify-center text-xs font-medium transition-colors"
        title="Fit All Partners"
      >
        ⊡
      </button>
    </div>
  );
}

// Stats panel component
function StatsPanel({
  partners,
  connections,
}: {
  partners: Partner[];
  connections: PartnerConnection[];
}) {
  const partnersWithCoords = partners.filter(
    (p) => p.latitude !== null && p.longitude !== null
  );

  // Calculate state distribution
  const stateDistribution = useMemo(() => {
    const states: Record<string, number> = {};
    partnersWithCoords.forEach((p) => {
      if (p.location_state) {
        states[p.location_state] = (states[p.location_state] || 0) + 1;
      }
    });
    return Object.entries(states)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [partnersWithCoords]);

  // Calculate totals
  const totalPopulationReach = useMemo(() => {
    return partners.reduce((sum, p) => sum + (p.population_reach || 0), 0);
  }, [partners]);

  const totalClientPotential = useMemo(() => {
    return partners.reduce((sum, p) => sum + (p.client_potential || 0), 0);
  }, [partners]);

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-64 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/95 backdrop-blur-sm p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-3">
        Map Statistics
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#737373]">Partners on Map</span>
          <span className="text-sm font-medium text-[#f6e1bd]">
            {partnersWithCoords.length}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-[#737373]">Total Connections</span>
          <span className="text-sm font-medium text-[#f6e1bd]">
            {connections.length}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-[#737373]">Population Reach</span>
          <span className="text-sm font-medium text-[#f6e1bd]">
            {formatNumber(totalPopulationReach)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-[#737373]">Client Potential</span>
          <span className="text-sm font-medium text-[#f6e1bd]">
            {formatNumber(totalClientPotential)}
          </span>
        </div>

        {stateDistribution.length > 0 && (
          <div className="pt-2 border-t border-[#1f1f1f]">
            <p className="text-xs text-[#737373] mb-2">Top States</p>
            <div className="space-y-1">
              {stateDistribution.map(([state, count]) => (
                <div key={state} className="flex justify-between items-center">
                  <span className="text-xs text-[#a3a3a3]">{state}</span>
                  <span className="text-xs font-medium text-[#f6e1bd]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Legend component
function MapLegend() {
  return (
    <div className="absolute top-4 left-4 z-[1000] rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/95 backdrop-blur-sm p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-3">
        Legend
      </h3>

      <div className="space-y-3">
        {/* Type Colors */}
        <div>
          <p className="text-xs text-[#737373] mb-2">Partner Type</p>
          <div className="space-y-1.5">
            {(Object.entries(PARTNER_TYPE_COLORS) as [PartnerType, string][]).map(
              ([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-[#a3a3a3]">
                    {PARTNER_TYPE_LABELS[type]}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Status Styles */}
        <div className="pt-2 border-t border-[#1f1f1f]">
          <p className="text-xs text-[#737373] mb-2">Status</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#a3a3a3]" />
              <span className="text-xs text-[#a3a3a3]">Secured (solid)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#a3a3a3] animate-pulse" />
              <span className="text-xs text-[#a3a3a3]">In Progress (pulse)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border-2 border-dashed border-[#a3a3a3]"
                style={{ backgroundColor: "transparent" }}
              />
              <span className="text-xs text-[#a3a3a3]">Target (dashed)</span>
            </div>
          </div>
        </div>

        {/* Size Scale */}
        <div className="pt-2 border-t border-[#1f1f1f]">
          <p className="text-xs text-[#737373] mb-2">Impact Size</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#737373]" />
              <span className="text-xs text-[#737373]">1</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#737373]" />
              <span className="text-xs text-[#737373]">5</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-[#737373]" />
              <span className="text-xs text-[#737373]">10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter controls component
function FilterControls({
  typeFilter,
  statusFilter,
  onTypeFilterChange,
  onStatusFilterChange,
  showGrowthPotential,
  onGrowthPotentialChange,
}: {
  typeFilter: PartnerType | "all";
  statusFilter: PartnerStatus | "all";
  onTypeFilterChange: (type: PartnerType | "all") => void;
  onStatusFilterChange: (status: PartnerStatus | "all") => void;
  showGrowthPotential: boolean;
  onGrowthPotentialChange: (show: boolean) => void;
}) {
  return (
    <div className="absolute top-4 left-[220px] z-[1000] flex items-center gap-2">
      <select
        className="rounded-lg border border-[#2a2a2a] bg-[#0b0b0b]/95 backdrop-blur-sm px-3 py-2 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
        value={typeFilter}
        onChange={(e) =>
          onTypeFilterChange(e.target.value as PartnerType | "all")
        }
      >
        <option value="all">All Types</option>
        <option value="ecosystem">Ecosystem</option>
        <option value="tech">Tech</option>
        <option value="person">Person</option>
      </select>

      <select
        className="rounded-lg border border-[#2a2a2a] bg-[#0b0b0b]/95 backdrop-blur-sm px-3 py-2 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
        value={statusFilter}
        onChange={(e) =>
          onStatusFilterChange(e.target.value as PartnerStatus | "all")
        }
      >
        <option value="all">All Statuses</option>
        <option value="target">Target</option>
        <option value="contacted">Contacted</option>
        <option value="in_progress">In Progress</option>
        <option value="secured">Secured</option>
        <option value="inactive">Inactive</option>
      </select>

      <button
        onClick={() => onGrowthPotentialChange(!showGrowthPotential)}
        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
          showGrowthPotential
            ? "bg-[#cb6b1e] text-black"
            : "border border-[#2a2a2a] bg-[#0b0b0b]/95 backdrop-blur-sm text-[#f6e1bd] hover:border-[#cb6b1e]"
        }`}
      >
        Growth Potential
      </button>
    </div>
  );
}

// Partner popup content
function PartnerPopupContent({
  partner,
  connectionCount,
  onEdit,
}: {
  partner: Partner;
  connectionCount: number;
  onEdit: () => void;
}) {
  return (
    <div className="min-w-[240px] p-1">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: PARTNER_TYPE_COLORS[partner.type] }}
        />
        <h3 className="font-semibold text-[#020202]">{partner.name}</h3>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-[#737373]">Type</span>
          <span className="font-medium text-[#020202]">
            {PARTNER_TYPE_LABELS[partner.type]}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-[#737373]">Status</span>
          <span className="font-medium text-[#020202]">
            {PARTNER_STATUS_LABELS[partner.status]}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-[#737373]">Location</span>
          <span className="font-medium text-[#020202]">
            {partner.location_city && partner.location_state
              ? `${partner.location_city}, ${partner.location_state}`
              : partner.location_city || partner.location_state || "—"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-[#737373]">Ecosystem Impact</span>
          <span className="font-medium text-[#020202]">
            {partner.ecosystem_impact}/10
          </span>
        </div>

        {partner.population_reach && (
          <div className="flex justify-between">
            <span className="text-[#737373]">Population Reach</span>
            <span className="font-medium text-[#020202]">
              {formatNumber(partner.population_reach)}
            </span>
          </div>
        )}

        {partner.client_potential && (
          <div className="flex justify-between">
            <span className="text-[#737373]">Client Potential</span>
            <span className="font-medium text-[#020202]">
              {formatNumber(partner.client_potential)}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-[#737373]">Connections</span>
          <span className="font-medium text-[#020202]">{connectionCount}</span>
        </div>

        {partner.end_game && (
          <div className="pt-2 border-t border-[#e5e5e5]">
            <p className="text-[#737373] mb-1">End Game</p>
            <p className="text-[#020202] text-xs leading-relaxed">
              {partner.end_game}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={onEdit}
        className="mt-3 w-full rounded-lg bg-[#cb6b1e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e37a2e] transition-colors"
      >
        Edit Partner
      </button>
    </div>
  );
}

// Calculate marker radius based on ecosystem impact
function getMarkerRadius(impact: number): number {
  const minRadius = 8;
  const maxRadius = 20;
  return minRadius + ((impact - 1) / 9) * (maxRadius - minRadius);
}

// Calculate growth potential circle radius
function getGrowthRadius(partner: Partner): number {
  const baseRadius = 5000; // meters
  const populationFactor = partner.population_reach
    ? Math.log10(partner.population_reach + 1) * 10000
    : 0;
  const clientFactor = partner.client_potential
    ? Math.log10(partner.client_potential + 1) * 8000
    : 0;
  const impactFactor = partner.ecosystem_impact * 2000;

  return baseRadius + populationFactor + clientFactor + impactFactor;
}

// Get marker style based on status
function getMarkerStyle(status: PartnerStatus): {
  fillOpacity: number;
  weight: number;
  dashArray?: string;
  className?: string;
} {
  switch (status) {
    case "secured":
      return { fillOpacity: 0.9, weight: 3 };
    case "in_progress":
      return { fillOpacity: 0.8, weight: 2, className: "animate-pulse" };
    case "contacted":
      return { fillOpacity: 0.6, weight: 2, dashArray: "4 2" };
    case "target":
      return { fillOpacity: 0.4, weight: 2, dashArray: "8 4" };
    case "inactive":
      return { fillOpacity: 0.3, weight: 1 };
    default:
      return { fillOpacity: 0.7, weight: 2 };
  }
}

// Map view props
type MapViewProps = {
  partners: Partner[];
  connections: PartnerConnection[];
  onPartnerClick: (partner: Partner) => void;
  typeFilter: PartnerType | "all";
  statusFilter: PartnerStatus | "all";
  onTypeFilterChange: (type: PartnerType | "all") => void;
  onStatusFilterChange: (status: PartnerStatus | "all") => void;
};

export default function MapView({
  partners,
  connections,
  onPartnerClick,
  typeFilter,
  statusFilter,
  onTypeFilterChange,
  onStatusFilterChange,
}: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [showGrowthPotential, setShowGrowthPotential] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [map, setMap] = useState<LeafletMap | null>(null);

  // Only render on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter partners that have coordinates
  const mappablePartners = useMemo(() => {
    return partners.filter(
      (p) => p.latitude !== null && p.longitude !== null
    );
  }, [partners]);

  // Get connection count for a partner
  const getConnectionCount = useCallback((partnerId: string) => {
    return connections.filter(
      (c) => c.from_partner_id === partnerId || c.to_partner_id === partnerId
    ).length;
  }, [connections]);

  // Default center on USA
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const defaultZoom = 4;

  // Calculate bounds to fit all partners
  const fitAllPartners = useCallback(() => {
    if (map && mappablePartners.length > 0) {
      const L = require("leaflet");
      const bounds = L.latLngBounds(
        mappablePartners.map((p) => [p.latitude, p.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, mappablePartners]);

  const handleZoomIn = useCallback(() => {
    if (map) {
      map.zoomIn();
    }
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (map) {
      map.zoomOut();
    }
  }, [map]);

  // Loading state
  if (!isClient) {
    return (
      <div className="relative h-[700px] rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] overflow-hidden flex items-center justify-center">
        <div className="text-sm text-[#a3a3a3]">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="relative h-[700px] rounded-2xl border border-[#1f1f1f] bg-[#0b0b0b] overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={setMap}
        zoomControl={false}
        style={{ background: "#0b0b0b" }}
      >
        {/* Dark-themed tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Growth potential circles */}
        {showGrowthPotential &&
          mappablePartners.map((partner) => (
            <Circle
              key={`growth-${partner.id}`}
              center={[partner.latitude!, partner.longitude!]}
              radius={getGrowthRadius(partner)}
              pathOptions={{
                color: PARTNER_TYPE_COLORS[partner.type],
                fillColor: PARTNER_TYPE_COLORS[partner.type],
                fillOpacity: 0.1,
                weight: 1,
                opacity: 0.3,
              }}
            />
          ))}

        {/* Partner markers */}
        {mappablePartners.map((partner) => {
          const style = getMarkerStyle(partner.status);
          const radius = getMarkerRadius(partner.ecosystem_impact);
          const color = PARTNER_TYPE_COLORS[partner.type];

          return (
            <CircleMarker
              key={partner.id}
              center={[partner.latitude!, partner.longitude!]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: style.fillOpacity,
                weight: style.weight,
                dashArray: style.dashArray,
              }}
              eventHandlers={{
                click: () => setSelectedPartner(partner),
              }}
            >
              {/* Hover tooltip */}
              <Tooltip direction="top" offset={[0, -radius]} opacity={0.95}>
                <div className="px-2 py-1">
                  <p className="font-semibold text-[#020202]">{partner.name}</p>
                  <p className="text-xs text-[#737373]">
                    {PARTNER_TYPE_LABELS[partner.type]} •{" "}
                    {PARTNER_STATUS_LABELS[partner.status]}
                  </p>
                </div>
              </Tooltip>

              {/* Click popup */}
              <Popup closeButton={true} maxWidth={280}>
                <PartnerPopupContent
                  partner={partner}
                  connectionCount={getConnectionCount(partner.id)}
                  onEdit={() => {
                    setSelectedPartner(null);
                    onPartnerClick(partner);
                  }}
                />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Controls and panels */}
      <MapLegend />
      <FilterControls
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onTypeFilterChange={onTypeFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        showGrowthPotential={showGrowthPotential}
        onGrowthPotentialChange={setShowGrowthPotential}
      />
      <MapControls
        onFitAll={fitAllPartners}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
      <StatsPanel partners={partners} connections={connections} />

      {/* No coordinates warning */}
      {partners.length > 0 && mappablePartners.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0b0b]/80 z-[1001]">
          <div className="text-center p-6 rounded-xl bg-[#0b0b0b] border border-[#2a2a2a]">
            <p className="text-[#f6e1bd] font-medium mb-2">
              No partners with coordinates
            </p>
            <p className="text-sm text-[#737373]">
              Add city and state to partners to see them on the map.
            </p>
          </div>
        </div>
      )}

      {/* Partners without coordinates count */}
      {mappablePartners.length < partners.length && mappablePartners.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] px-3 py-2 rounded-lg bg-[#0b0b0b]/95 border border-[#2a2a2a] text-xs text-[#737373]">
          {partners.length - mappablePartners.length} partner(s) not shown (no
          coordinates)
        </div>
      )}
    </div>
  );
}

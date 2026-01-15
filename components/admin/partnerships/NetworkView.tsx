"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type {
  Partner,
  PartnerConnection,
  PartnerNodePosition,
  PartnerType,
  PartnerStatus,
} from "@/lib/partnerships";
import {
  PARTNER_TYPE_COLORS,
  PARTNER_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  CONNECTION_TYPE_STYLES,
  CONNECTION_TYPE_LABELS,
} from "@/lib/partnerships";

type NetworkViewProps = {
  partners: Partner[];
  connections: PartnerConnection[];
  positions: PartnerNodePosition[];
  onPartnerClick: (partner: Partner) => void;
  onAddPartner: () => void;
  onPositionUpdate: (partnerId: string, x: number, y: number) => void;
  typeFilter: PartnerType | "all";
  statusFilter: PartnerStatus | "all";
  onTypeFilterChange: (type: PartnerType | "all") => void;
  onStatusFilterChange: (status: PartnerStatus | "all") => void;
};

type NodePosition = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const NODE_MIN_RADIUS = 15;
const NODE_MAX_RADIUS = 40;

const NetworkView = ({
  partners,
  connections,
  positions,
  onPartnerClick,
  onAddPartner,
  onPositionUpdate,
  typeFilter,
  statusFilter,
  onTypeFilterChange,
  onStatusFilterChange,
}: NetworkViewProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(
    new Map()
  );

  // Viewport state for pan and zoom
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Initialize node positions
  useEffect(() => {
    const newPositions = new Map<string, NodePosition>();

    partners.forEach((partner, index) => {
      const savedPosition = positions.find((p) => p.partner_id === partner.id);

      if (savedPosition) {
        newPositions.set(partner.id, {
          id: partner.id,
          x: savedPosition.x_position,
          y: savedPosition.y_position,
          vx: 0,
          vy: 0,
        });
      } else {
        // Arrange in a circle initially
        const angle = (index / partners.length) * 2 * Math.PI;
        const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35;
        newPositions.set(partner.id, {
          id: partner.id,
          x: CANVAS_WIDTH / 2 + Math.cos(angle) * radius,
          y: CANVAS_HEIGHT / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        });
      }
    });

    setNodePositions(newPositions);
  }, [partners, positions]);

  // Get node radius based on ecosystem impact
  const getNodeRadius = (impact: number) => {
    return NODE_MIN_RADIUS + ((impact - 1) / 9) * (NODE_MAX_RADIUS - NODE_MIN_RADIUS);
  };

  // Get status border style
  const getStatusBorderStyle = (status: PartnerStatus) => {
    switch (status) {
      case "secured":
        return { strokeWidth: 3, strokeDasharray: "none", animation: false };
      case "in_progress":
        return { strokeWidth: 2, strokeDasharray: "none", animation: true };
      case "contacted":
        return { strokeWidth: 2, strokeDasharray: "4,2", animation: false };
      case "target":
        return { strokeWidth: 2, strokeDasharray: "8,4", animation: false };
      case "inactive":
        return { strokeWidth: 1, strokeDasharray: "none", animation: false };
      default:
        return { strokeWidth: 2, strokeDasharray: "none", animation: false };
    }
  };

  // Handle mouse events for dragging nodes
  const handleNodeMouseDown = (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation();
    setDraggingNode(partnerId);
    setSelectedNode(partnerId);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.x) / viewport.scale;
      const y = (e.clientY - rect.top - viewport.y) / viewport.scale;

      if (draggingNode) {
        setNodePositions((prev) => {
          const newPositions = new Map(prev);
          const pos = newPositions.get(draggingNode);
          if (pos) {
            newPositions.set(draggingNode, { ...pos, x, y });
          }
          return newPositions;
        });
      } else if (isPanning) {
        setViewport((prev) => ({
          ...prev,
          x: prev.x + (e.clientX - panStart.x),
          y: prev.y + (e.clientY - panStart.y),
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [draggingNode, isPanning, panStart, viewport]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingNode) {
      const pos = nodePositions.get(draggingNode);
      if (pos) {
        onPositionUpdate(draggingNode, pos.x, pos.y);
      }
    }
    setDraggingNode(null);
    setIsPanning(false);
  }, [draggingNode, nodePositions, onPositionUpdate]);

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelectedNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport((prev) => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * delta, 0.3), 3),
    }));
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      onAddPartner();
    }
  };

  // Force-directed layout simulation
  const runForceLayout = useCallback(() => {
    const iterations = 100;
    const positions = new Map(nodePositions);

    for (let i = 0; i < iterations; i++) {
      // Repulsion between all nodes
      partners.forEach((p1) => {
        partners.forEach((p2) => {
          if (p1.id === p2.id) return;
          const pos1 = positions.get(p1.id);
          const pos2 = positions.get(p2.id);
          if (!pos1 || !pos2) return;

          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 5000 / (dist * dist);

          pos1.x -= (dx / dist) * force;
          pos1.y -= (dy / dist) * force;
          pos2.x += (dx / dist) * force;
          pos2.y += (dy / dist) * force;
        });
      });

      // Attraction along edges
      connections.forEach((conn) => {
        const pos1 = positions.get(conn.from_partner_id);
        const pos2 = positions.get(conn.to_partner_id);
        if (!pos1 || !pos2) return;

        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 150) * 0.01 * conn.strength;

        pos1.x += (dx / dist) * force;
        pos1.y += (dy / dist) * force;
        pos2.x -= (dx / dist) * force;
        pos2.y -= (dy / dist) * force;
      });

      // Center gravity
      partners.forEach((p) => {
        const pos = positions.get(p.id);
        if (!pos) return;
        pos.x += (CANVAS_WIDTH / 2 - pos.x) * 0.01;
        pos.y += (CANVAS_HEIGHT / 2 - pos.y) * 0.01;
      });
    }

    // Update state and save positions
    setNodePositions(positions);
    positions.forEach((pos) => {
      onPositionUpdate(pos.id, pos.x, pos.y);
    });
  }, [nodePositions, partners, connections, onPositionUpdate]);

  // Reset viewport
  const resetViewport = () => {
    setViewport({ x: 0, y: 0, scale: 1 });
  };

  // Get connections for hovered node
  const highlightedConnections = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    return new Set(
      connections
        .filter(
          (c) =>
            c.from_partner_id === hoveredNode || c.to_partner_id === hoveredNode
        )
        .map((c) => c.id)
    );
  }, [hoveredNode, connections]);

  // Get partner details for tooltip
  const getPartnerById = (id: string) => partners.find((p) => p.id === id);

  return (
    <div className="relative">
      {/* Controls Panel */}
      <div className="absolute top-4 left-4 z-10 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/95 p-4 space-y-4 backdrop-blur-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
          Controls
        </h3>

        {/* Show Labels Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#2a2a2a] bg-[#090909] text-[#cb6b1e]"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          <span className="text-xs text-[#f6e1bd]">Show Labels</span>
        </label>

        {/* Type Filter */}
        <div>
          <label className="text-xs text-[#737373] block mb-1">Type</label>
          <select
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-2 py-1 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
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
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-xs text-[#737373] block mb-1">Status</label>
          <select
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-2 py-1 text-xs text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
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
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-[#1f1f1f]">
          <button
            onClick={runForceLayout}
            className="w-full rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#cb6b1e] transition-colors"
          >
            Auto Layout
          </button>
          <button
            onClick={resetViewport}
            className="w-full rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#cb6b1e] transition-colors"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/95 p-4 backdrop-blur-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-3">
          Legend
        </h3>

        {/* Partner Types */}
        <div className="mb-3">
          <p className="text-[10px] text-[#737373] mb-1">Partner Types</p>
          <div className="space-y-1">
            {Object.entries(PARTNER_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-[#f6e1bd]">
                  {PARTNER_TYPE_LABELS[type as PartnerType]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Borders */}
        <div className="mb-3">
          <p className="text-[10px] text-[#737373] mb-1">Status (border)</p>
          <div className="space-y-1 text-xs text-[#a3a3a3]">
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded border-2 border-white" />
              <span>Secured</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded border-2 border-dashed border-white" />
              <span>Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-6 rounded border border-dotted border-white" />
              <span>Contacted</span>
            </div>
          </div>
        </div>

        {/* Node Size */}
        <div>
          <p className="text-[10px] text-[#737373] mb-1">Size = Impact (1-10)</p>
          <div className="flex items-end gap-1">
            <div
              className="rounded-full bg-[#737373]"
              style={{ width: NODE_MIN_RADIUS, height: NODE_MIN_RADIUS }}
            />
            <div
              className="rounded-full bg-[#737373]"
              style={{
                width: (NODE_MIN_RADIUS + NODE_MAX_RADIUS) / 2,
                height: (NODE_MIN_RADIUS + NODE_MAX_RADIUS) / 2,
              }}
            />
            <div
              className="rounded-full bg-[#737373]"
              style={{ width: NODE_MAX_RADIUS, height: NODE_MAX_RADIUS }}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-[#737373]">
        <p>Drag nodes to reposition | Scroll to zoom | Drag background to pan</p>
        <p>Double-click empty space to add partner | Click node to edit</p>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full rounded-xl border border-[#1f1f1f] bg-[#050505]"
        style={{ height: "70vh", minHeight: "600px" }}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleSvgMouseDown}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <defs>
          {/* Glow filter for nodes */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pulse animation for in-progress status */}
          <animate
            xlinkHref="#pulse"
            attributeName="opacity"
            values="1;0.5;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </defs>

        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.scale})`}>
          {/* Connections (edges) */}
          {connections.map((conn) => {
            const fromPos = nodePositions.get(conn.from_partner_id);
            const toPos = nodePositions.get(conn.to_partner_id);
            if (!fromPos || !toPos) return null;

            const style = CONNECTION_TYPE_STYLES[conn.connection_type];
            const isHighlighted =
              hoveredNode === conn.from_partner_id ||
              hoveredNode === conn.to_partner_id;

            return (
              <line
                key={conn.id}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={style.color}
                strokeWidth={conn.strength * (isHighlighted ? 1.5 : 1)}
                strokeDasharray={style.dash?.join(",") || "none"}
                opacity={
                  hoveredNode
                    ? highlightedConnections.has(conn.id)
                      ? 1
                      : 0.2
                    : 0.6
                }
                className="transition-opacity duration-200"
              />
            );
          })}

          {/* Nodes */}
          {partners.map((partner) => {
            const pos = nodePositions.get(partner.id);
            if (!pos) return null;

            const radius = getNodeRadius(partner.ecosystem_impact);
            const color = PARTNER_TYPE_COLORS[partner.type];
            const borderStyle = getStatusBorderStyle(partner.status);
            const isHovered = hoveredNode === partner.id;
            const isSelected = selectedNode === partner.id;
            const isDimmed =
              hoveredNode &&
              hoveredNode !== partner.id &&
              !connections.some(
                (c) =>
                  (c.from_partner_id === hoveredNode &&
                    c.to_partner_id === partner.id) ||
                  (c.to_partner_id === hoveredNode &&
                    c.from_partner_id === partner.id)
              );

            return (
              <g
                key={partner.id}
                transform={`translate(${pos.x},${pos.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(partner.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleNodeMouseDown(e, partner.id)}
                onClick={() => onPartnerClick(partner)}
                opacity={isDimmed ? 0.3 : 1}
                style={{ transition: "opacity 200ms" }}
              >
                {/* Outer glow for hover/selected */}
                {(isHovered || isSelected) && (
                  <circle
                    r={radius + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    opacity={0.5}
                    filter="url(#glow)"
                  />
                )}

                {/* Main node circle */}
                <circle
                  r={radius}
                  fill={color}
                  stroke={isSelected ? "#ffffff" : color}
                  strokeWidth={borderStyle.strokeWidth}
                  strokeDasharray={borderStyle.strokeDasharray}
                  className={borderStyle.animation ? "animate-pulse" : ""}
                />

                {/* Inner highlight */}
                <circle
                  r={radius * 0.3}
                  fill="white"
                  opacity={0.2}
                  transform={`translate(${-radius * 0.2},${-radius * 0.2})`}
                />

                {/* Label */}
                {showLabels && (
                  <text
                    y={radius + 16}
                    textAnchor="middle"
                    className="text-xs fill-[#f6e1bd] select-none"
                    style={{ fontSize: "11px" }}
                  >
                    {partner.name.length > 20
                      ? partner.name.substring(0, 18) + "..."
                      : partner.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b] p-4 shadow-xl min-w-[200px]">
          {(() => {
            const partner = getPartnerById(hoveredNode);
            if (!partner) return null;

            return (
              <>
                <p className="font-semibold text-[#f6e1bd]">{partner.name}</p>
                <div className="mt-2 space-y-1 text-xs text-[#a3a3a3]">
                  <p>
                    Type:{" "}
                    <span
                      style={{ color: PARTNER_TYPE_COLORS[partner.type] }}
                    >
                      {PARTNER_TYPE_LABELS[partner.type]}
                    </span>
                  </p>
                  <p>Status: {PARTNER_STATUS_LABELS[partner.status]}</p>
                  <p>Impact: {partner.ecosystem_impact}/10</p>
                  {partner.location_city && (
                    <p>
                      Location: {partner.location_city}, {partner.location_state}
                    </p>
                  )}
                  {partner.end_game && (
                    <p className="mt-2 text-[#737373]">{partner.end_game}</p>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-[#737373]">
                  Click to edit
                </p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default NetworkView;

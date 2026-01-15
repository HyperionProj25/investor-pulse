"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type {
  Partner,
  PartnerConnection,
  PartnerNodePosition,
  PartnerType,
  PartnerStatus,
  ConnectionType,
} from "@/lib/partnerships";
import {
  PARTNER_TYPE_COLORS,
  PARTNER_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  CONNECTION_TYPE_LABELS,
} from "@/lib/partnerships";

// Dynamically import ForceGraph2D (standalone 2D-only package, no A-Frame/VR deps)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] min-h-[600px] rounded-xl border border-[#1f1f1f] bg-[#050505] flex items-center justify-center">
      <div className="text-[#737373] animate-pulse">Loading Neural Network...</div>
    </div>
  ),
});

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

// Graph data types for react-force-graph
type GraphNode = {
  id: string;
  name: string;
  type: PartnerType;
  status: PartnerStatus;
  ecosystem_impact: number;
  partner: Partner;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  [key: string]: unknown;
};

type GraphLink = {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  connection_type: ConnectionType;
  strength: number;
  [key: string]: unknown;
};

// Enhanced color palette with glow colors
const NODE_GLOW_COLORS: Record<PartnerType, { base: string; glow: string; gradient: string[] }> = {
  ecosystem: {
    base: "#3b82f6",
    glow: "#00d4ff",
    gradient: ["#1e40af", "#3b82f6", "#60a5fa"],
  },
  tech: {
    base: "#22c55e",
    glow: "#00ff88",
    gradient: ["#166534", "#22c55e", "#4ade80"],
  },
  person: {
    base: "#F28C28",
    glow: "#ffaa44",
    gradient: ["#c2410c", "#F28C28", "#fb923c"],
  },
};

// Connection type visual styles
const CONNECTION_VISUALS: Record<ConnectionType, {
  particles: boolean;
  particleSpeed: number;
  dash?: number[];
  color: string;
  glowColor: string;
}> = {
  works_at: { particles: true, particleSpeed: 0.004, color: "#6b7280", glowColor: "#9ca3af" },
  knows: { particles: true, particleSpeed: 0.002, dash: [5, 5], color: "#9ca3af", glowColor: "#d1d5db" },
  target_intro: { particles: false, particleSpeed: 0.001, dash: [2, 2], color: "#fbbf24", glowColor: "#fcd34d" },
  client_of: { particles: true, particleSpeed: 0.006, color: "#22c55e", glowColor: "#4ade80" },
  partner_of: { particles: true, particleSpeed: 0.006, color: "#3b82f6", glowColor: "#60a5fa" },
};

const NODE_MIN_RADIUS = 8;
const NODE_MAX_RADIUS = 24;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  // State
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [pulsePhase, setPulsePhase] = useState(0);
  const [graphMounted, setGraphMounted] = useState(false);

  // Animation frame for pulsing effect
  useEffect(() => {
    if (!animationsEnabled || reduceMotion) return;

    let animationId: number;
    const animate = () => {
      setPulsePhase((prev) => (prev + 0.02 * animationSpeed) % (Math.PI * 2));
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [animationsEnabled, animationSpeed, reduceMotion]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 1200,
          height: Math.max(rect.height, 600),
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Convert data to graph format
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = partners.map((partner) => {
      const savedPosition = positions.find((p) => p.partner_id === partner.id);
      return {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        status: partner.status,
        ecosystem_impact: partner.ecosystem_impact,
        partner,
        x: savedPosition?.x_position,
        y: savedPosition?.y_position,
        fx: savedPosition?.x_position,
        fy: savedPosition?.y_position,
      };
    });

    const links: GraphLink[] = connections.map((conn) => ({
      id: conn.id,
      source: conn.from_partner_id,
      target: conn.to_partner_id,
      connection_type: conn.connection_type,
      strength: conn.strength,
    }));

    return { nodes, links };
  }, [partners, connections, positions]);

  // Get node radius based on ecosystem impact
  const getNodeRadius = useCallback((impact: number) => {
    return NODE_MIN_RADIUS + ((impact - 1) / 9) * (NODE_MAX_RADIUS - NODE_MIN_RADIUS);
  }, []);

  // Get glow intensity based on status
  const getGlowIntensity = useCallback((status: PartnerStatus, phase: number) => {
    switch (status) {
      case "secured":
        return 1.0;
      case "in_progress":
        return 0.6 + Math.sin(phase * 2) * 0.4; // Pulsing
      case "contacted":
        return 0.4;
      case "target":
        return 0.3;
      case "inactive":
        return 0.15;
      default:
        return 0.5;
    }
  }, []);

  // Custom node canvas rendering
  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const radius = getNodeRadius(node.ecosystem_impact);
    const colors = NODE_GLOW_COLORS[node.type];
    const isHovered = hoveredNode === node.id;
    const glowIntensity = getGlowIntensity(node.status, pulsePhase);
    const scale = isHovered ? 1.15 : 1;
    const effectiveRadius = radius * scale;

    // Check if node is dimmed (another node is hovered and this isn't connected)
    let isDimmed = false;
    if (hoveredNode && hoveredNode !== node.id) {
      const isConnected = connections.some(
        (c) =>
          (c.from_partner_id === hoveredNode && c.to_partner_id === node.id) ||
          (c.to_partner_id === hoveredNode && c.from_partner_id === node.id)
      );
      isDimmed = !isConnected;
    }

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.25 : 1;

    // Outer glow effect (multiple layers for depth)
    if (!reduceMotion) {
      const glowLayers = 3;
      for (let i = glowLayers; i > 0; i--) {
        const glowRadius = effectiveRadius + (i * 6 * glowIntensity);
        const gradient = ctx.createRadialGradient(
          node.x!, node.y!, effectiveRadius * 0.5,
          node.x!, node.y!, glowRadius
        );
        gradient.addColorStop(0, `${colors.glow}${Math.floor(40 * glowIntensity).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${colors.glow}${Math.floor(20 * glowIntensity).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${colors.glow}00`);

        ctx.beginPath();
        ctx.arc(node.x!, node.y!, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    // Main node gradient fill
    const mainGradient = ctx.createRadialGradient(
      node.x! - effectiveRadius * 0.3,
      node.y! - effectiveRadius * 0.3,
      0,
      node.x!,
      node.y!,
      effectiveRadius
    );
    mainGradient.addColorStop(0, colors.gradient[2]);
    mainGradient.addColorStop(0.5, colors.gradient[1]);
    mainGradient.addColorStop(1, colors.gradient[0]);

    ctx.beginPath();
    ctx.arc(node.x!, node.y!, effectiveRadius, 0, Math.PI * 2);
    ctx.fillStyle = mainGradient;
    ctx.fill();

    // Status-based border/ring
    ctx.lineWidth = node.status === "secured" ? 3 : 2;

    if (node.status === "target") {
      // Dashed ring for targets
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = `${colors.glow}aa`;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, effectiveRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (node.status === "contacted") {
      // Subtle dotted ring
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = `${colors.base}88`;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, effectiveRadius + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (node.status === "secured") {
      // Strong solid ring
      ctx.strokeStyle = colors.glow;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, effectiveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Inner highlight (3D effect)
    const highlightGradient = ctx.createRadialGradient(
      node.x! - effectiveRadius * 0.3,
      node.y! - effectiveRadius * 0.3,
      0,
      node.x!,
      node.y!,
      effectiveRadius * 0.6
    );
    highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.beginPath();
    ctx.arc(node.x!, node.y!, effectiveRadius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    // Core bright spot
    const coreGradient = ctx.createRadialGradient(
      node.x!, node.y!, 0,
      node.x!, node.y!, effectiveRadius * 0.2
    );
    coreGradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * glowIntensity})`);
    coreGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.beginPath();
    ctx.arc(node.x!, node.y!, effectiveRadius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    // Label
    if (showLabels && globalScale > 0.5) {
      const label = node.name.length > 18 ? node.name.substring(0, 16) + "..." : node.name;
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Label shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillText(label, node.x! + 1, node.y! + effectiveRadius + 6);

      // Label text
      ctx.fillStyle = isHovered ? "#ffffff" : "#f6e1bd";
      ctx.fillText(label, node.x!, node.y! + effectiveRadius + 5);
    }

    ctx.restore();
  }, [hoveredNode, pulsePhase, showLabels, getNodeRadius, getGlowIntensity, connections, reduceMotion]);

  // Custom link rendering
  const paintLink = useCallback((link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const source = link.source as GraphNode;
    const target = link.target as GraphNode;
    if (!source.x || !source.y || !target.x || !target.y) return;

    const visuals = CONNECTION_VISUALS[link.connection_type];
    const lineWidth = Math.max(0.5, link.strength * 0.8);

    // Check if link should be highlighted
    const isHighlighted =
      hoveredNode === source.id ||
      hoveredNode === target.id;

    const isDimmed = hoveredNode && !isHighlighted;

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.1 : isHighlighted ? 1 : 0.5;

    // Draw gradient line
    const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
    const sourceColor = NODE_GLOW_COLORS[source.type].base;
    const targetColor = NODE_GLOW_COLORS[target.type].base;

    if (isHighlighted) {
      gradient.addColorStop(0, NODE_GLOW_COLORS[source.type].glow);
      gradient.addColorStop(1, NODE_GLOW_COLORS[target.type].glow);
    } else {
      gradient.addColorStop(0, sourceColor);
      gradient.addColorStop(1, targetColor);
    }

    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth * (isHighlighted ? 1.5 : 1);

    if (visuals.dash) {
      ctx.setLineDash(visuals.dash);
    }

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    ctx.restore();
  }, [hoveredNode]);

  // Handle node drag end - save position
  const handleNodeDragEnd = useCallback((node: GraphNode) => {
    if (node.x !== undefined && node.y !== undefined) {
      // Fix the node position
      node.fx = node.x;
      node.fy = node.y;
      onPositionUpdate(node.id, node.x, node.y);
    }
  }, [onPositionUpdate]);

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    onPartnerClick(node.partner);
  }, [onPartnerClick]);

  // Handle background click for adding new partner
  const handleBackgroundClick = useCallback((event: MouseEvent) => {
    // Only trigger on double-click
  }, []);

  const handleBackgroundDoubleClick = useCallback(() => {
    onAddPartner();
  }, [onAddPartner]);

  // Auto layout using force simulation
  const runAutoLayout = useCallback(() => {
    if (fgRef.current) {
      // Unfix all nodes to let simulation run
      graphData.nodes.forEach((node) => {
        node.fx = undefined;
        node.fy = undefined;
      });
      // Reheat simulation
      fgRef.current.d3ReheatSimulation();

      // After simulation settles, save all positions
      setTimeout(() => {
        graphData.nodes.forEach((node) => {
          if (node.x !== undefined && node.y !== undefined) {
            node.fx = node.x;
            node.fy = node.y;
            onPositionUpdate(node.id, node.x, node.y);
          }
        });
      }, 3000);
    }
  }, [graphData.nodes, onPositionUpdate]);

  // Reset view
  const resetView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50);
    }
  }, []);

  // Center on a node
  const centerOnNode = useCallback((nodeId: string) => {
    if (fgRef.current) {
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 500);
        fgRef.current.zoom(1.5, 500);
      }
    }
  }, [graphData.nodes]);

  // Get hovered node data
  const hoveredPartner = useMemo(() => {
    if (!hoveredNode) return null;
    return partners.find((p) => p.id === hoveredNode);
  }, [hoveredNode, partners]);

  // Link particle settings
  const linkParticleWidth = useCallback((link: GraphLink) => {
    return link.strength * 1.5;
  }, []);

  const linkParticleSpeed = useCallback((link: GraphLink) => {
    const visuals = CONNECTION_VISUALS[link.connection_type];
    if (!visuals.particles || reduceMotion || !animationsEnabled) return 0;
    return visuals.particleSpeed * animationSpeed;
  }, [animationSpeed, animationsEnabled, reduceMotion]);

  const linkParticleColor = useCallback((link: GraphLink) => {
    const source = link.source as GraphNode;
    if (typeof source === 'string') return "#ffffff";
    return NODE_GLOW_COLORS[source.type].glow;
  }, []);

  // Handle graph engine tick to update positions
  useEffect(() => {
    if (fgRef.current && graphMounted) {
      // Zoom to fit initially
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(400, 60);
        }
      }, 500);
    }
  }, [graphMounted]);

  return (
    <div className="relative">
      {/* Controls Panel */}
      <div className="absolute top-4 left-4 z-10 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/95 p-4 space-y-4 backdrop-blur-sm max-w-[200px]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3]">
          Controls
        </h3>

        {/* Show Labels Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#2a2a2a] bg-[#090909] text-[#F28C28] accent-[#F28C28]"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          <span className="text-xs text-[#f6e1bd]">Show Labels</span>
        </label>

        {/* Animations Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#2a2a2a] bg-[#090909] text-[#F28C28] accent-[#F28C28]"
            checked={animationsEnabled}
            onChange={(e) => setAnimationsEnabled(e.target.checked)}
          />
          <span className="text-xs text-[#f6e1bd]">Animations</span>
        </label>

        {/* Reduce Motion Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#2a2a2a] bg-[#090909] text-[#F28C28] accent-[#F28C28]"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.target.checked)}
          />
          <span className="text-xs text-[#f6e1bd]">Reduce Motion</span>
        </label>

        {/* Animation Speed Slider */}
        {animationsEnabled && !reduceMotion && (
          <div>
            <label className="text-xs text-[#737373] block mb-1">
              Animation Speed
            </label>
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.25"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer accent-[#F28C28]"
            />
            <div className="flex justify-between text-[10px] text-[#737373] mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-3 border-t border-[#1f1f1f]">
          <button
            onClick={runAutoLayout}
            className="w-full rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#F28C28] hover:text-[#F28C28] transition-colors"
          >
            Auto Layout
          </button>
          <button
            onClick={resetView}
            className="w-full rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#F28C28] hover:text-[#F28C28] transition-colors"
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
            {Object.entries(NODE_GLOW_COLORS).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${colors.gradient[2]}, ${colors.gradient[0]})`,
                    boxShadow: `0 0 6px ${colors.glow}66`,
                  }}
                />
                <span className="text-xs text-[#f6e1bd]">
                  {PARTNER_TYPE_LABELS[type as PartnerType]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mb-3">
          <p className="text-[10px] text-[#737373] mb-1">Status</p>
          <div className="space-y-1 text-xs text-[#a3a3a3]">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#3b82f6] ring-2 ring-[#60a5fa]" />
              <span>Secured (strong glow)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#3b82f6] animate-pulse" />
              <span>In Progress (pulsing)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full bg-[#3b82f6]"
                style={{ border: "1px dashed #60a5fa" }}
              />
              <span>Target (dashed ring)</span>
            </div>
          </div>
        </div>

        {/* Connection Types */}
        <div className="mb-3">
          <p className="text-[10px] text-[#737373] mb-1">Connections</p>
          <div className="space-y-1 text-xs text-[#a3a3a3]">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-6 bg-gradient-to-r from-[#22c55e] to-[#3b82f6]" />
              <span>Client/Partner</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-0.5 w-6 bg-[#6b7280]"
                style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 3px, #6b7280 3px, #6b7280 6px)" }}
              />
              <span>Works At/Knows</span>
            </div>
          </div>
        </div>

        {/* Size */}
        <div>
          <p className="text-[10px] text-[#737373] mb-1">Size = Impact (1-10)</p>
          <div className="flex items-end gap-2">
            <div
              className="rounded-full bg-gradient-to-br from-[#60a5fa] to-[#1e40af]"
              style={{ width: NODE_MIN_RADIUS * 2, height: NODE_MIN_RADIUS * 2 }}
            />
            <div
              className="rounded-full bg-gradient-to-br from-[#60a5fa] to-[#1e40af]"
              style={{ width: (NODE_MIN_RADIUS + NODE_MAX_RADIUS), height: (NODE_MIN_RADIUS + NODE_MAX_RADIUS) }}
            />
            <div
              className="rounded-full bg-gradient-to-br from-[#60a5fa] to-[#1e40af]"
              style={{ width: NODE_MAX_RADIUS * 2, height: NODE_MAX_RADIUS * 2 }}
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-[#737373] bg-[#0b0b0b]/80 px-3 py-2 rounded-lg backdrop-blur-sm">
        <p>Drag nodes to reposition • Scroll to zoom • Drag background to pan</p>
        <p>Double-click empty space to add partner • Click node to edit</p>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-[#1f1f1f] overflow-hidden relative"
        style={{ height: "70vh", minHeight: "600px" }}
      >
        {/* Background with grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at center, #0a0a0a 0%, #050505 100%),
              repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(242, 140, 40, 0.03) 50px, rgba(242, 140, 40, 0.03) 51px),
              repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(242, 140, 40, 0.03) 50px, rgba(242, 140, 40, 0.03) 51px)
            `,
            backgroundBlendMode: "normal",
          }}
        />

        {/* Constellation dots background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
                width: `${1 + (i % 3)}px`,
                height: `${1 + (i % 3)}px`,
                backgroundColor: `rgba(${100 + (i % 50)}, ${100 + (i % 50)}, ${120 + (i % 30)}, ${0.1 + (i % 5) * 0.05})`,
                animation: animationsEnabled && !reduceMotion
                  ? `twinkle ${3 + (i % 4)}s ease-in-out infinite ${i * 0.2}s`
                  : 'none',
              }}
            />
          ))}
        </div>

        {/* Force Graph */}
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData as any}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeCanvasObject={paintNode as any}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const radius = getNodeRadius((node as GraphNode).ecosystem_impact) + 5;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkCanvasObject={paintLink as any}
          linkDirectionalParticles={(link: any) => {
            const visuals = CONNECTION_VISUALS[(link as GraphLink).connection_type];
            if (!visuals.particles || reduceMotion || !animationsEnabled) return 0;
            return 3;
          }}
          linkDirectionalParticleWidth={(link: any) => (link as GraphLink).strength * 1.5}
          linkDirectionalParticleSpeed={(link: any) => {
            const visuals = CONNECTION_VISUALS[(link as GraphLink).connection_type];
            if (!visuals.particles || reduceMotion || !animationsEnabled) return 0;
            return visuals.particleSpeed * animationSpeed;
          }}
          linkDirectionalParticleColor={(link: any) => {
            const source = (link as GraphLink).source as GraphNode;
            if (typeof source === 'string') return "#ffffff";
            return NODE_GLOW_COLORS[source.type]?.glow || "#ffffff";
          }}
          onNodeHover={(node: any) => setHoveredNode(node ? (node as GraphNode).id : null)}
          onNodeClick={(node: any) => handleNodeClick(node as GraphNode)}
          onNodeDragEnd={(node: any) => handleNodeDragEnd(node as GraphNode)}
          onBackgroundClick={handleBackgroundClick as any}
          onBackgroundRightClick={handleBackgroundDoubleClick as any}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          warmupTicks={50}
          cooldownTicks={100}
          onEngineStop={() => setGraphMounted(true)}
        />
      </div>

      {/* Tooltip */}
      {hoveredPartner && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 rounded-xl border border-[#1f1f1f] bg-[#0b0b0b]/95 p-4 shadow-2xl min-w-[220px] backdrop-blur-sm">
          <div
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0b0b0b] border-l border-t border-[#1f1f1f]"
          />
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${NODE_GLOW_COLORS[hoveredPartner.type].gradient[2]}, ${NODE_GLOW_COLORS[hoveredPartner.type].gradient[0]})`,
                boxShadow: `0 0 8px ${NODE_GLOW_COLORS[hoveredPartner.type].glow}88`,
              }}
            />
            <p className="font-semibold text-[#f6e1bd]">{hoveredPartner.name}</p>
          </div>
          <div className="space-y-1 text-xs text-[#a3a3a3]">
            <p>
              Type:{" "}
              <span style={{ color: NODE_GLOW_COLORS[hoveredPartner.type].glow }}>
                {PARTNER_TYPE_LABELS[hoveredPartner.type]}
              </span>
            </p>
            <p>
              Status:{" "}
              <span className={hoveredPartner.status === "secured" ? "text-green-400" : ""}>
                {PARTNER_STATUS_LABELS[hoveredPartner.status]}
              </span>
            </p>
            <p>
              Impact:{" "}
              <span className="text-[#F28C28]">{hoveredPartner.ecosystem_impact}/10</span>
            </p>
            {hoveredPartner.location_city && (
              <p>
                📍 {hoveredPartner.location_city}, {hoveredPartner.location_state}
              </p>
            )}
            {hoveredPartner.end_game && (
              <p className="mt-2 text-[#737373] italic">"{hoveredPartner.end_game}"</p>
            )}
          </div>
          <p className="mt-2 pt-2 border-t border-[#1f1f1f] text-[10px] text-[#737373]">
            Click to edit • Right-click background to add
          </p>
        </div>
      )}

      {/* CSS for twinkle animation */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default NetworkView;

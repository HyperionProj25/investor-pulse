// Partnership types and utilities

export type PartnerType = 'ecosystem' | 'tech' | 'person';

export type PartnerStatus = 'target' | 'contacted' | 'in_progress' | 'secured' | 'inactive';

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

export type ConnectionType = 'works_at' | 'knows' | 'target_intro' | 'client_of' | 'partner_of';

export type Partner = {
  id: string;
  name: string;
  type: PartnerType;
  location_city: string | null;
  location_state: string | null;
  location_country: string;
  latitude: number | null;
  longitude: number | null;
  ecosystem_impact: number;
  population_reach: number | null;
  company_size: CompanySize | null;
  client_potential: number | null;
  status: PartnerStatus;
  end_game: string | null;
  notes: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerConnection = {
  id: string;
  from_partner_id: string;
  to_partner_id: string;
  connection_type: ConnectionType;
  strength: number;
  notes: string | null;
  created_at: string;
};

export type PartnerNodePosition = {
  id: string;
  partner_id: string;
  x_position: number;
  y_position: number;
  updated_at: string;
};

// Extended types for UI
export type PartnerWithConnections = Partner & {
  connections_from: PartnerConnection[];
  connections_to: PartnerConnection[];
  node_position?: PartnerNodePosition;
};

export type PartnerWithPosition = Partner & {
  node_position?: PartnerNodePosition;
};

// Form types for creating/editing
export type PartnerFormData = Omit<Partner, 'id' | 'created_at' | 'updated_at'>;

export type ConnectionFormData = Omit<PartnerConnection, 'id' | 'created_at'>;

// Network visualization types
export type NetworkNode = {
  id: string;
  name: string;
  type: PartnerType;
  status: PartnerStatus;
  ecosystem_impact: number;
  x?: number;
  y?: number;
};

export type NetworkEdge = {
  id: string;
  source: string;
  target: string;
  connection_type: ConnectionType;
  strength: number;
};

// Filter and sort options
export type PartnerFilters = {
  type?: PartnerType | 'all';
  status?: PartnerStatus | 'all';
  search?: string;
};

export type PartnerSortField = 'name' | 'ecosystem_impact' | 'created_at' | 'status';
export type SortDirection = 'asc' | 'desc';

// Constants for display
export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  ecosystem: 'Ecosystem',
  tech: 'Tech',
  person: 'Person',
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  target: 'Target',
  contacted: 'Contacted',
  in_progress: 'In Progress',
  secured: 'Secured',
  inactive: 'Inactive',
};

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  startup: 'Startup (1-10)',
  small: 'Small (11-50)',
  medium: 'Medium (51-200)',
  large: 'Large (201-1000)',
  enterprise: 'Enterprise (1000+)',
};

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  works_at: 'Works At',
  knows: 'Knows',
  target_intro: 'Target Intro',
  client_of: 'Client Of',
  partner_of: 'Partner Of',
};

// Color constants for visualization
export const PARTNER_TYPE_COLORS: Record<PartnerType, string> = {
  ecosystem: '#3b82f6', // Blue
  tech: '#22c55e',      // Green
  person: '#f97316',    // Orange
};

export const PARTNER_STATUS_STYLES: Record<PartnerStatus, { border: string; animation?: string }> = {
  secured: { border: 'solid', animation: undefined },
  in_progress: { border: 'solid', animation: 'pulse' },
  target: { border: 'dashed', animation: undefined },
  contacted: { border: 'dotted', animation: undefined },
  inactive: { border: 'solid', animation: undefined },
};

export const CONNECTION_TYPE_STYLES: Record<ConnectionType, { dash?: number[]; color: string }> = {
  works_at: { color: '#6b7280' },
  knows: { dash: [5, 5], color: '#9ca3af' },
  target_intro: { dash: [2, 2], color: '#fbbf24' },
  client_of: { color: '#22c55e' },
  partner_of: { color: '#3b82f6' },
};

// Default values for new partners
export const DEFAULT_PARTNER: PartnerFormData = {
  name: '',
  type: 'ecosystem',
  location_city: null,
  location_state: null,
  location_country: 'USA',
  latitude: null,
  longitude: null,
  ecosystem_impact: 5,
  population_reach: null,
  company_size: null,
  client_potential: null,
  status: 'target',
  end_game: null,
  notes: null,
  website: null,
};

import type {
  PartnerFormData,
  ConnectionFormData,
  PartnerType,
  PartnerStatus,
  CompanySize,
  ConnectionType,
} from "./partnerships";

export type ValidationError = {
  field: string;
  message: string;
};

const VALID_PARTNER_TYPES: PartnerType[] = ["ecosystem", "tech", "person"];
const VALID_PARTNER_STATUSES: PartnerStatus[] = [
  "target",
  "contacted",
  "in_progress",
  "secured",
  "inactive",
];
const VALID_COMPANY_SIZES: CompanySize[] = [
  "startup",
  "small",
  "medium",
  "large",
  "enterprise",
];
const VALID_CONNECTION_TYPES: ConnectionType[] = [
  "works_at",
  "knows",
  "target_intro",
  "client_of",
  "partner_of",
];

/**
 * Validate all fields of a partner object
 */
export function validatePartnerData(
  partner: Partial<PartnerFormData>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name is required
  if (!partner.name || partner.name.trim() === "") {
    errors.push({ field: "name", message: "Partner name is required" });
  }

  // Type validation
  if (!partner.type) {
    errors.push({ field: "type", message: "Partner type is required" });
  } else if (!VALID_PARTNER_TYPES.includes(partner.type)) {
    errors.push({
      field: "type",
      message: "Partner type must be ecosystem, tech, or person",
    });
  }

  // Ecosystem impact validation (1-10)
  if (partner.ecosystem_impact === undefined || partner.ecosystem_impact === null) {
    errors.push({
      field: "ecosystem_impact",
      message: "Ecosystem impact is required",
    });
  } else if (partner.ecosystem_impact < 1 || partner.ecosystem_impact > 10) {
    errors.push({
      field: "ecosystem_impact",
      message: "Ecosystem impact must be between 1 and 10",
    });
  }

  // Status validation
  if (!partner.status) {
    errors.push({ field: "status", message: "Status is required" });
  } else if (!VALID_PARTNER_STATUSES.includes(partner.status)) {
    errors.push({
      field: "status",
      message: "Invalid status value",
    });
  }

  // Company size validation (optional but must be valid if provided)
  if (
    partner.company_size &&
    !VALID_COMPANY_SIZES.includes(partner.company_size)
  ) {
    errors.push({
      field: "company_size",
      message: "Invalid company size value",
    });
  }

  // Latitude/Longitude validation (both or neither)
  const hasLat = partner.latitude !== null && partner.latitude !== undefined;
  const hasLng = partner.longitude !== null && partner.longitude !== undefined;
  if (hasLat !== hasLng) {
    errors.push({
      field: "coordinates",
      message: "Both latitude and longitude must be provided together",
    });
  }

  if (hasLat && (partner.latitude! < -90 || partner.latitude! > 90)) {
    errors.push({
      field: "latitude",
      message: "Latitude must be between -90 and 90",
    });
  }

  if (hasLng && (partner.longitude! < -180 || partner.longitude! > 180)) {
    errors.push({
      field: "longitude",
      message: "Longitude must be between -180 and 180",
    });
  }

  // Population reach validation (if provided, must be positive)
  if (
    partner.population_reach !== null &&
    partner.population_reach !== undefined &&
    partner.population_reach < 0
  ) {
    errors.push({
      field: "population_reach",
      message: "Population reach must be a positive number",
    });
  }

  // Client potential validation (if provided, must be positive)
  if (
    partner.client_potential !== null &&
    partner.client_potential !== undefined &&
    partner.client_potential < 0
  ) {
    errors.push({
      field: "client_potential",
      message: "Client potential must be a positive number",
    });
  }

  // Website validation (if provided, must be valid URL)
  if (partner.website && !isValidUrl(partner.website)) {
    errors.push({
      field: "website",
      message: "Website must be a valid URL",
    });
  }

  return errors;
}

/**
 * Validate connection data
 */
export function validateConnectionData(
  connection: Partial<ConnectionFormData>
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!connection.from_partner_id) {
    errors.push({
      field: "from_partner_id",
      message: "Source partner is required",
    });
  }

  if (!connection.to_partner_id) {
    errors.push({
      field: "to_partner_id",
      message: "Target partner is required",
    });
  }

  if (
    connection.from_partner_id &&
    connection.to_partner_id &&
    connection.from_partner_id === connection.to_partner_id
  ) {
    errors.push({
      field: "to_partner_id",
      message: "Cannot connect a partner to itself",
    });
  }

  if (!connection.connection_type) {
    errors.push({
      field: "connection_type",
      message: "Connection type is required",
    });
  } else if (!VALID_CONNECTION_TYPES.includes(connection.connection_type)) {
    errors.push({
      field: "connection_type",
      message: "Invalid connection type",
    });
  }

  if (connection.strength === undefined || connection.strength === null) {
    errors.push({
      field: "strength",
      message: "Connection strength is required",
    });
  } else if (connection.strength < 1 || connection.strength > 5) {
    errors.push({
      field: "strength",
      message: "Connection strength must be between 1 and 5",
    });
  }

  return errors;
}

/**
 * Check if a partner name is unique
 */
export function checkPartnerNameUniqueness(
  name: string,
  existingPartners: { id: string; name: string }[],
  excludeId?: string
): boolean {
  const normalizedName = name.toLowerCase().trim();
  return !existingPartners.some(
    (p) =>
      p.name.toLowerCase().trim() === normalizedName &&
      p.id !== excludeId
  );
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

/**
 * Format a number for display (e.g., 1000000 -> "1M")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import type {
  Partner,
  PartnerFormData,
  PartnerType,
  PartnerStatus,
  CompanySize,
} from "@/lib/partnerships";
import {
  DEFAULT_PARTNER,
  PARTNER_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  COMPANY_SIZE_LABELS,
} from "@/lib/partnerships";
import { validatePartnerData } from "@/lib/partnershipsValidation";
import { getUserFriendlyError } from "@/lib/errorMessages";

type PartnerModalProps = {
  partner: Partner | null;
  onClose: () => void;
  onSave: (partner: Partner, isNew: boolean) => void;
};

// Simple geocoding using a free API (Nominatim)
async function geocodeLocation(
  city: string,
  state: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = [city, state, country].filter(Boolean).join(", ");
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1`,
      {
        headers: {
          "User-Agent": "BaselineInvestorPulse/1.0",
        },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}

const PartnerModal = ({ partner, onClose, onSave }: PartnerModalProps) => {
  const isEditing = !!partner;
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const [formData, setFormData] = useState<PartnerFormData>(
    partner
      ? {
          name: partner.name,
          type: partner.type,
          location_city: partner.location_city,
          location_state: partner.location_state,
          location_country: partner.location_country,
          latitude: partner.latitude,
          longitude: partner.longitude,
          ecosystem_impact: partner.ecosystem_impact,
          population_reach: partner.population_reach,
          company_size: partner.company_size,
          client_potential: partner.client_potential,
          status: partner.status,
          end_game: partner.end_game,
          notes: partner.notes,
          website: partner.website,
        }
      : DEFAULT_PARTNER
  );

  const updateField = <K extends keyof PartnerFormData>(
    field: K,
    value: PartnerFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeocode = async () => {
    if (!formData.location_city && !formData.location_state) {
      toast.error("Enter a city or state to geocode");
      return;
    }

    setGeocoding(true);
    try {
      const result = await geocodeLocation(
        formData.location_city || "",
        formData.location_state || "",
        formData.location_country
      );
      if (result) {
        updateField("latitude", result.lat);
        updateField("longitude", result.lng);
        toast.success("Location geocoded successfully!");
      } else {
        toast.error("Could not find coordinates for this location");
      }
    } catch (error) {
      toast.error("Geocoding failed");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async () => {
    // Validate
    const errors = validatePartnerData(formData);
    if (errors.length > 0) {
      toast.error(errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? { id: partner.id, partner: formData }
        : { partner: formData };

      const response = await fetch("/api/admin/partnerships", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save partner");

      const data = await response.json();
      toast.success(
        isEditing ? "Partner updated successfully!" : "Partner added successfully!"
      );
      onSave(data.partner, !isEditing);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(getUserFriendlyError(err, "Failed to save partner"));
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
          <h2 className="text-xl font-semibold text-[#f6e1bd]">
            {isEditing ? "Edit Partner" : "Add New Partner"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#f6e1bd] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-[#f6e1bd] mb-3">
              Basic Information
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Name *
                <input
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Partner name"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Type *
                <select
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.type}
                  onChange={(e) => updateField("type", e.target.value as PartnerType)}
                >
                  {Object.entries(PARTNER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Status *
                <select
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as PartnerStatus)
                  }
                >
                  {Object.entries(PARTNER_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Website
                <input
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.website || ""}
                  onChange={(e) => updateField("website", e.target.value || null)}
                  placeholder="https://example.com"
                />
              </label>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold text-[#f6e1bd] mb-3">Location</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                City
                <input
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.location_city || ""}
                  onChange={(e) =>
                    updateField("location_city", e.target.value || null)
                  }
                  placeholder="City"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                State
                <input
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.location_state || ""}
                  onChange={(e) =>
                    updateField("location_state", e.target.value || null)
                  }
                  placeholder="State"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Country
                <input
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.location_country}
                  onChange={(e) => updateField("location_country", e.target.value)}
                  placeholder="USA"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding}
                className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs hover:border-[#cb6b1e] disabled:opacity-50"
              >
                {geocoding ? "Geocoding..." : "Auto-Geocode"}
              </button>
              {formData.latitude && formData.longitude && (
                <span className="text-xs text-[#737373]">
                  Lat: {formData.latitude.toFixed(4)}, Lng:{" "}
                  {formData.longitude.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-[#f6e1bd] mb-3">
              Impact Metrics
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Ecosystem Impact (1-10) *
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    className="flex-1 h-2 bg-[#1f1f1f] rounded-lg appearance-none cursor-pointer"
                    value={formData.ecosystem_impact}
                    onChange={(e) =>
                      updateField("ecosystem_impact", parseInt(e.target.value))
                    }
                  />
                  <span className="w-8 text-center text-sm text-[#f6e1bd]">
                    {formData.ecosystem_impact}
                  </span>
                </div>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Company Size
                <select
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.company_size || ""}
                  onChange={(e) =>
                    updateField(
                      "company_size",
                      (e.target.value as CompanySize) || null
                    )
                  }
                >
                  <option value="">Select size...</option>
                  {Object.entries(COMPANY_SIZE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Population Reach
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.population_reach || ""}
                  onChange={(e) =>
                    updateField(
                      "population_reach",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="e.g., 500000"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Client Potential
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.client_potential || ""}
                  onChange={(e) =>
                    updateField(
                      "client_potential",
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="e.g., 50"
                />
              </label>
            </div>
          </div>

          {/* Strategy */}
          <div>
            <h3 className="text-sm font-semibold text-[#f6e1bd] mb-3">Strategy</h3>
            <div className="space-y-4">
              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                End Game
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.end_game || ""}
                  onChange={(e) => updateField("end_game", e.target.value || null)}
                  placeholder="What's the goal with this partner?"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-[#a3a3a3]">
                Notes
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[#2a2a2a] bg-[#090909] px-3 py-2 text-sm text-[#f6e1bd] focus:border-[#cb6b1e] focus:outline-none"
                  value={formData.notes || ""}
                  onChange={(e) => updateField("notes", e.target.value || null)}
                  placeholder="Additional notes..."
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#1f1f1f]">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm hover:border-[#cb6b1e] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-[#cb6b1e] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e37a2e] disabled:opacity-50"
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Partner"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerModal;

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Cpu,
  Edit3,
  MapPin,
  Monitor,
  Plus,
  Projector,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "@/lib/toast";
import type { ApiVenue, CreateVenueInput, UpdateVenueInput } from "@/lib/api/types";
import {
  createVenue,
  deleteVenue,
  fetchVenues,
  updateVenue,
} from "@/lib/api/venues";
import { cn } from "@/lib/utils";

const MOR_BRANCHES = [
  "Addis Ababa HQ",
  "Hawassa Branch",
  "Bahir Dar Branch",
  "Adama Branch",
  "Dire Dawa Branch",
  "Jimma Branch",
  "Mekelle Branch",
  "Gondar Branch",
];

const STANDARD_FACILITIES = [
  { label: "High-Speed Wi-Fi", icon: Wifi },
  { label: "HD Projector", icon: Projector },
  { label: "Dedicated Lab PCs", icon: Cpu },
  { label: "Audio & Microphones", icon: Volume2 },
  { label: "Air Conditioning", icon: Wind },
  { label: "Interactive Smart Board", icon: Monitor },
];

export default function TrainingAdminVenuesPage() {
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<ApiVenue | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formBranch, setFormBranch] = useState(MOR_BRANCHES[0]);
  const [formCustomBranch, setFormCustomBranch] = useState("");
  const [formBuilding, setFormBuilding] = useState("");
  const [formCapacity, setFormCapacity] = useState(30);
  const [formFacilities, setFormFacilities] = useState<string[]>([
    "High-Speed Wi-Fi",
    "HD Projector",
  ]);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete modal
  const [deletingVenue, setDeletingVenue] = useState<ApiVenue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadVenues = async () => {
    setLoading(true);
    try {
      const data = await fetchVenues();
      setVenues(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVenues();
  }, []);

  const openCreateModal = () => {
    setEditingVenue(null);
    setFormName("");
    setFormBranch(MOR_BRANCHES[0]);
    setFormCustomBranch("");
    setFormBuilding("");
    setFormCapacity(30);
    setFormFacilities(["High-Speed Wi-Fi", "HD Projector"]);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (venue: ApiVenue) => {
    setEditingVenue(venue);
    setFormName(venue.name);
    if (MOR_BRANCHES.includes(venue.branch)) {
      setFormBranch(venue.branch);
      setFormCustomBranch("");
    } else {
      setFormBranch("OTHER");
      setFormCustomBranch(venue.branch);
    }
    setFormBuilding(venue.building || "");
    setFormCapacity(venue.capacity);
    setFormFacilities(venue.facilities || []);
    setFormIsActive(venue.isActive);
    setIsModalOpen(true);
  };

  const handleFacilityToggle = (facility: string) => {
    setFormFacilities((prev) =>
      prev.includes(facility)
        ? prev.filter((f) => f !== facility)
        : [...prev, facility],
    );
  };

  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a venue name.");
      return;
    }
    const finalBranch = formBranch === "OTHER" ? formCustomBranch.trim() : formBranch.trim();
    if (!finalBranch) {
      toast.error("Please specify a branch.");
      return;
    }
    if (formCapacity <= 0) {
      toast.error("Capacity must be greater than 0.");
      return;
    }

    setSaving(true);
    try {
      if (editingVenue) {
        const updatePayload: UpdateVenueInput = {
          name: formName.trim(),
          branch: finalBranch,
          building: formBuilding.trim() || undefined,
          capacity: formCapacity,
          facilities: formFacilities,
          isActive: formIsActive,
        };
        await updateVenue(editingVenue.id, updatePayload);
        toast.success("Venue updated successfully!");
      } else {
        const createPayload: CreateVenueInput = {
          name: formName.trim(),
          branch: finalBranch,
          building: formBuilding.trim() || undefined,
          capacity: formCapacity,
          facilities: formFacilities,
          isActive: formIsActive,
        };
        await createVenue(createPayload);
        toast.success("New venue registered successfully!");
      }
      setIsModalOpen(false);
      await loadVenues();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save venue.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVenue = async () => {
    if (!deletingVenue) return;
    setIsDeleting(true);
    try {
      await deleteVenue(deletingVenue.id);
      toast.success("Venue deleted successfully.");
      setDeletingVenue(null);
      await loadVenues();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete venue.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered venues
  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      if (selectedBranch !== "ALL" && v.branch !== selectedBranch) return false;
      if (selectedStatus === "ACTIVE" && !v.isActive) return false;
      if (selectedStatus === "INACTIVE" && v.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.name.toLowerCase().includes(q);
        const matchesBranch = v.branch.toLowerCase().includes(q);
        const matchesBuilding = v.building?.toLowerCase().includes(q);
        if (!matchesName && !matchesBranch && !matchesBuilding) return false;
      }
      return true;
    });
  }, [venues, selectedBranch, selectedStatus, searchQuery]);

  // Statistics
  const totalCapacity = useMemo(
    () => venues.reduce((acc, v) => acc + (v.capacity || 0), 0),
    venues,
  );
  const activeCount = useMemo(
    () => venues.filter((v) => v.isActive).length,
    venues,
  );
  const branchesList = useMemo(() => {
    const set = new Set(venues.map((v) => v.branch));
    return Array.from(set);
  }, [venues]);

  return (
    <PageShell
      role="training_admin"
      title="Venues & Facilities"
      description="Manage physical classrooms, computer training labs, and conference facilities across MoR branch offices."
      actions={
        <Button
          onClick={openCreateModal}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Register Venue
        </Button>
      }
    >
      {/* ── Key Metrics Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Total Venues</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{venues.length}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Building2 className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Total MoR Seat Capacity</p>
            <p className="mt-1 text-2xl font-bold text-primary">{totalCapacity}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Active Classrooms</p>
            <p className="mt-1 text-2xl font-bold text-success">{activeCount}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Branches Covered</p>
            <p className="mt-1 text-2xl font-bold text-accent">{branchesList.length}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <MapPin className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <PageSection
        title="Training Venue Directory"
        description="Filter and search all registered training halls, computer labs, and rooms by branch."
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-subtle-foreground" />
              <input
                type="text"
                placeholder="Search venue name, building, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs placeholder:text-subtle-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
              />
            </div>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-xl border border-border bg-card py-2 px-3 text-xs font-medium text-secondary-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Branches</option>
              {MOR_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="rounded-xl border border-border bg-card py-2 px-3 text-xs font-medium text-secondary-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadVenues}
            disabled={loading}
            className="gap-1.5 text-xs text-secondary-foreground hover:text-foreground border-border"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* ── Venues Grid ── */}
        <div className="mt-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-subtle-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mb-3 text-indigo-500" />
              <p className="text-sm">Loading venues from database...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <EmptyState
              title="No training venues found"
              description={
                searchQuery || selectedBranch !== "ALL" || selectedStatus !== "ALL"
                  ? "Try adjusting your filters or search terms."
                  : "Start by registering your first physical training classroom or lab."
              }
            >
              <Button onClick={openCreateModal} className="gap-2 bg-indigo-600 text-white mt-2">
                <Plus className="h-4 w-4" />
                Register First Venue
              </Button>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVenues.map((venue) => (
                <div
                  key={venue.id}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition hover:shadow-md",
                    venue.isActive
                      ? "border-border/90 hover:border-primary/30"
                      : "border-border/60 bg-muted/50 opacity-80",
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary border border-primary/30">
                            <MapPin className="h-3 w-3" />
                            {venue.branch}
                          </span>
                          <Badge
                            variant={venue.isActive ? "green" : "slate"}
                            className="text-[10px]"
                          >
                            {venue.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <h4 className="mt-2 text-base font-bold text-foreground leading-snug">
                          {venue.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(venue)}
                          className="rounded-lg p-1.5 text-subtle-foreground hover:bg-secondary hover:text-secondary-foreground transition"
                          title="Edit Venue"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingVenue(venue)}
                          className="rounded-lg p-1.5 text-subtle-foreground hover:bg-danger-soft hover:text-danger transition"
                          title="Delete Venue"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {venue.building ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-subtle-foreground shrink-0" />
                        {venue.building}
                      </p>
                    ) : null}

                    {/* Capacity badge */}
                    <div className="flex items-center gap-2 rounded-xl bg-muted p-2.5 border border-border/60">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-subtle-foreground uppercase tracking-wider">
                          Room Capacity
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {venue.capacity} <span className="text-xs font-normal text-muted-foreground">Learner Seats</span>
                        </p>
                      </div>
                    </div>

                    {/* Facilities badges */}
                    <div>
                      <p className="text-[11px] font-semibold text-subtle-foreground uppercase tracking-wider mb-1.5">
                        Equipped Facilities
                      </p>
                      {venue.facilities && venue.facilities.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {venue.facilities.map((fac) => (
                            <span
                              key={fac}
                              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                            >
                              <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                              {fac}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-subtle-foreground italic">No special facilities specified</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageSection>

      {/* ── Create / Edit Venue Modal ── */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingVenue ? "Edit Venue & Facility" : "Register Training Venue"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure physical room details, seating capacity, and equipment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-subtle-foreground hover:bg-secondary hover:text-secondary-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-foreground mb-1">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hall A - Executive Training Lab"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-subtle-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-secondary-foreground mb-1">
                    MoR Branch / Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    {MOR_BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="OTHER">Other Custom Location...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-foreground mb-1">
                    Seat Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {formBranch === "OTHER" ? (
                <div>
                  <label className="block text-xs font-semibold text-secondary-foreground mb-1">
                    Specify Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Semera Branch"
                    value={formCustomBranch}
                    onChange={(e) => setFormCustomBranch(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
                  />
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-secondary-foreground mb-1">
                  Building & Room Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main MoR Tower, 3rd Floor, Room 302"
                  value={formBuilding}
                  onChange={(e) => setFormBuilding(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-subtle-foreground focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Facilities Checklist */}
              <div>
                <label className="block text-xs font-semibold text-secondary-foreground mb-2">
                  Equipped Classroom Facilities
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STANDARD_FACILITIES.map(({ label, icon: Icon }) => {
                    const isChecked = formFacilities.includes(label);
                    return (
                      <label
                        key={label}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition select-none",
                          isChecked
                            ? "border-ring bg-primary-soft/80 text-primary"
                            : "border-border bg-card text-secondary-foreground hover:bg-muted",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleFacilityToggle(label)}
                          className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring"
                        />
                        <Icon className={cn("h-3.5 w-3.5", isChecked ? "text-primary" : "text-subtle-foreground")} />
                        <span className="truncate">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted p-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Active for Scheduling</p>
                  <p className="text-[11px] text-muted-foreground">
                    If disabled, trainers will not be able to allocate in-person sessions to this venue.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-border after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-input after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : editingVenue ? (
                    "Update Venue"
                  ) : (
                    "Save & Register"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Confirm Delete Modal ── */}
      {deletingVenue ? (
        <ConfirmModal
          open={true}
          title="Delete Venue"
          description={`Are you sure you want to delete venue "${deletingVenue.name}"? If there are any sessions or enrollments associated with this venue, the action will be blocked.`}
          confirmText={isDeleting ? "Deleting..." : "Delete Venue"}
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteVenue}
          onClose={() => setDeletingVenue(null)}
        />
      ) : null}
    </PageShell>
  );
}

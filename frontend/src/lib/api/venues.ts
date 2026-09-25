import { api } from "./client";
import type {
  ApiVenue,
  CreateBatchSessionInput,
  CreateVenueInput,
  UpdateVenueInput,
} from "./types";

export async function fetchVenues(
  params: { branch?: string; search?: string; isActive?: boolean } = {},
): Promise<ApiVenue[]> {
  const query: Record<string, string | number | undefined> = {};
  if (params.branch) query.branch = params.branch;
  if (params.search) query.search = params.search;
  if (params.isActive !== undefined) query.isActive = params.isActive ? "true" : "false";

  return api<ApiVenue[]>("venues", { query });
}

export async function fetchVenueDetail(id: string): Promise<ApiVenue> {
  return api<ApiVenue>(`venues/${id}`);
}

export async function createVenue(body: CreateVenueInput): Promise<ApiVenue> {
  return api<ApiVenue>("venues", { method: "POST", body });
}

export async function updateVenue(id: string, body: UpdateVenueInput): Promise<ApiVenue> {
  return api<ApiVenue>(`venues/${id}`, { method: "PATCH", body });
}

export async function deleteVenue(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`venues/${id}`, { method: "DELETE" });
}

export async function checkVenueAvailability(
  venueId: string,
  scheduledAt: string,
  durationMinutes: number,
  excludeSessionId?: string,
): Promise<{ available: boolean; venue: ApiVenue; conflictingSession: any | null }> {
  return api<{ available: boolean; venue: ApiVenue; conflictingSession: any | null }>(
    `venues/${venueId}/availability`,
    {
      query: {
        scheduledAt,
        durationMinutes,
        excludeSessionId,
      },
    },
  );
}

export async function createBatchLiveSessions(
  body: CreateBatchSessionInput,
): Promise<{ message: string; count: number; data: any[] }> {
  return api<{ message: string; count: number; data: any[] }>("live-sessions/batch", {
    method: "POST",
    body,
  });
}


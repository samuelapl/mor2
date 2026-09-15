"use client";

import { useMemo, useState } from "react";
import { Eye, Send } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge, CourseStatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";

export default function ContentStatusPage() {
  const { courses, submitForApproval } = useLms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (status !== "all" && course.status !== status) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        (course.rejectionReason ?? "").toLowerCase().includes(q)
      );
    });
  }, [courses, search, status]);
  const { page, totalPages, setPage, pageItems } = usePagination(filtered, 5);

  return (
    <PageShell
      role="course_owner"
      title="Content Status"
      description="Monitor the approval pipeline and administrator rejection feedback."
    >
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses or feedback…"
        selects={[
          {
            id: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "all", label: "All" },
              { value: "draft", label: "Draft" },
              { value: "under_review", label: "Pending approval" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setStatus("all");
        }}
        hasActiveFilters={search !== "" || status !== "all"}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No courses" description="Nothing matches the current filters." />
      ) : (
        <Table columns={["Course", "Approval status", "Publish status", "Admin feedback", ""]}>
          {pageItems.map((course) => (
            <tr key={course.id}>
              <Td>
                <span className="font-medium text-slate-900">{course.title}</span>
                <span className="block text-[11px] text-slate-400">
                  {course.code} · {course.category}
                </span>
              </Td>
              <Td>
                <CourseStatusBadge status={course.status} />
              </Td>
              <Td>
                <Badge variant={course.published ? "green" : "slate"}>
                  {course.published ? "Published" : "Not published"}
                </Badge>
              </Td>
              <Td className="max-w-[260px]">
                {course.status === "rejected" && course.rejectionReason ? (
                  <span className="text-xs text-red-600">{course.rejectionReason}</span>
                ) : course.lastRejectionReason ? (
                  <span className="text-xs text-amber-700">
                    Previous: {course.lastRejectionReason}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </Button>
                  {course.status === "draft" || course.status === "rejected" ? (
                    <Button size="sm" onClick={() => void submitForApproval(course.id)}>
                      <Send className="h-3.5 w-3.5" />
                      {course.status === "rejected" ? "Resubmit" : "Submit"}
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <CourseDetailModal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        courseId={selectedId ?? ""}
      />
    </PageShell>
  );
}

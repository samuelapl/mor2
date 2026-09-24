"use client";

import { useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { usePagination } from "@/lib/usePagination";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge, CourseStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { COURSE_CATEGORIES } from "@/constants/course-categories";
import { toast } from "@/lib/toast";

export function PendingCourseApprovals() {
  const { courses, userName, approveCourse, rejectCourse } = useLms();
  const { can } = usePermissions();
  const canApprove = can("course.approve_reject");
  const canReject = can("course.approve_reject");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const pending = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (course.status !== "under_review") return false;
      if (category !== "all" && course.category !== category) return false;
      if (!q) return true;
      const owner = userName(course.ownerId).toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        owner.includes(q)
      );
    });
  }, [courses, userName, search, category]);

  const { page, totalPages, setPage, pageItems } = usePagination(pending, 5);
  const targetCourseData = courses.find((c) => c.id === rejectId);

  const confirmReject = async () => {
    if (!rejectId) return;
    setModalBusy(true);
    const result = await rejectCourse(rejectId, reason);
    setModalBusy(false);
    if (!result.ok) {
      setReasonError(result.message);
      toast.error(result.message || "Failed to reject course.");
      return;
    }
    toast.success("Course rejected and moved back to draft. The owner has been notified with your reason.");
    setRejectId(null);
    setReason("");
    setReasonError(null);
  };

  const confirmApprove = async (courseId: string) => {
    setBusyId(courseId);
    const result = await approveCourse(courseId);
    setBusyId(null);
    if (result.ok) {
      toast.success("Course approved. It is now awaiting publication by the Training Administrator.");
    } else {
      toast.error(result.message || "Failed to approve course.");
    }
  };

  return (
    <>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search course, code or owner…"
        selects={[
          {
            id: "category",
            label: "Category",
            value: category,
            onChange: setCategory,
            options: [
              { value: "all", label: "All" },
              ...COURSE_CATEGORIES.map((item) => ({ value: item, label: item })),
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setCategory("all");
        }}
        hasActiveFilters={search !== "" || category !== "all"}
      />

      {pending.length === 0 ? (
        <EmptyState
          title="No pending course approvals"
          description="Nothing matches the current filters, or the approval queue is empty."
        />
      ) : (
        <Table columns={["Course name", "Course owner", "Created date", "Status", "Actions"]}>
          {pageItems.map((course) => (
            <tr key={course.id}>
              <Td>
                <span className="font-medium text-slate-900">{course.title}</span>
                <span className="block text-[11px] text-slate-400">{course.code}</span>
              </Td>
              <Td>{userName(course.ownerId)}</Td>
              <Td className="whitespace-nowrap">{course.createdAt}</Td>
              <Td>
                <CourseStatusBadge status={course.status} />
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                    <Eye className="h-3.5 w-3.5" />
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    isLoading={busyId === course.id}
                    loadingText="Approving…"
                    disabled={!canApprove || busyId !== null}
                    title={!canApprove ? "You no longer have permission to approve courses" : undefined}
                    onClick={() => confirmApprove(course.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!canReject || busyId !== null}
                    title={!canReject ? "You no longer have permission to reject courses" : undefined}
                    onClick={() => {
                      setRejectId(course.id);
                      setReason("");
                      setReasonError(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
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
        reviewActions={
          selectedId
            ? {
                onApprove: () => {
                  confirmApprove(selectedId);
                  setSelectedId(null);
                },
                onReject: () => {
                  setRejectId(selectedId);
                  setSelectedId(null);
                  setReason("");
                  setReasonError(null);
                },
              }
            : undefined
        }
      />

      {/* Reject Course Modal */}
      <Modal
        open={rejectId !== null}
        onClose={() => {
          setRejectId(null);
          setReason("");
          setReasonError(null);
        }}
        title="Reject Course"
        subtitle={targetCourseData ? `${targetCourseData.code} — ${targetCourseData.title}` : ""}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={modalBusy}
              onClick={() => {
                setRejectId(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={modalBusy}
              loadingText="Rejecting…"
              onClick={confirmReject}
              disabled={!reason.trim()}
            >
              Confirm Reject
            </Button>
          </>
        }
      >
        <RichTextArea
          id="rejectionReason"
          label="Reason for rejection"
          required
          rows={3}
          value={reason}
          onChange={(val) => {
            setReason(val);
            setReasonError(null);
          }}
          placeholder="Explain why this course is rejected. The course owner is notified with this reason and the course moves back to draft…"
          error={reasonError}
        />
      </Modal>

    </>
  );
}

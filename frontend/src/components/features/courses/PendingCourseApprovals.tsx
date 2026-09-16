"use client";

import { useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge, CourseStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { COURSE_CATEGORIES } from "@/constants/course-categories";

export function PendingCourseApprovals() {
  const { courses, userName, approveCourse, rejectCourse, requestChangesCourse } = useLms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [requestChangesId, setRequestChangesId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
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
  const targetCourseData = courses.find(
    (c) => c.id === (rejectId || requestChangesId),
  );

  const confirmReject = async () => {
    if (!rejectId) return;
    const result = await rejectCourse(rejectId, reason);
    if (!result.ok) {
      setReasonError(result.message);
      return;
    }
    setFlash("Course rejected. The owner can review your feedback and resubmit.");
    setRejectId(null);
    setReason("");
    setReasonError(null);
  };

  const confirmRequestChanges = async () => {
    if (!requestChangesId) return;
    const result = await requestChangesCourse(requestChangesId, reason);
    if (!result.ok) {
      setReasonError(result.message);
      return;
    }
    setFlash("Changes requested. The course owner has been notified to revise the content.");
    setRequestChangesId(null);
    setReason("");
    setReasonError(null);
  };

  const confirmApprove = async (courseId: string) => {
    const result = await approveCourse(courseId);
    setFlash(
      result.ok
        ? "Course approved. It is now awaiting publication by the Training Administrator."
        : result.message,
    );
  };

  return (
    <>
      {flash ? (
        <div className="mb-4 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-700">
          {flash}
        </div>
      ) : null}

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
                  <Button size="sm" variant="success" onClick={() => confirmApprove(course.id)}>
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRequestChangesId(course.id);
                      setReason("");
                      setReasonError(null);
                    }}
                  >
                    Request Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
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
                onRequestChanges: () => {
                  setRequestChangesId(selectedId);
                  setSelectedId(null);
                  setReason("");
                  setReasonError(null);
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
              onClick={() => {
                setRejectId(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmReject} disabled={!reason.trim()}>
              Confirm Reject
            </Button>
          </>
        }
      >
        <label htmlFor="rejectionReason" className="mb-1.5 block text-xs font-semibold text-slate-600">
          Reason for rejection *
        </label>
        <textarea
          id="rejectionReason"
          required
          rows={4}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          placeholder="Specify why this course is rejected and cannot be approved..."
          className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
        />
        {reasonError ? <p className="mt-2 text-xs text-red-600">{reasonError}</p> : null}
      </Modal>

      {/* Request Changes Modal */}
      <Modal
        open={requestChangesId !== null}
        onClose={() => {
          setRequestChangesId(null);
          setReason("");
          setReasonError(null);
        }}
        title="Request Changes"
        subtitle={targetCourseData ? `${targetCourseData.code} — ${targetCourseData.title}` : ""}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRequestChangesId(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="outline" onClick={confirmRequestChanges} disabled={!reason.trim()}>
              Send Revision Request
            </Button>
          </>
        }
      >
        <label htmlFor="changeReason" className="mb-1.5 block text-xs font-semibold text-slate-600">
          Required changes and feedback *
        </label>
        <textarea
          id="changeReason"
          required
          rows={4}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          placeholder="Describe the required updates, missing materials, or corrections the course owner needs to make before approval..."
          className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
        />
        {reasonError ? <p className="mt-2 text-xs text-red-600">{reasonError}</p> : null}
      </Modal>
    </>
  );
}

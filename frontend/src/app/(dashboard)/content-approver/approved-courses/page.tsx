"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ApprovedCoursesPage() {
  const { courses, userName } = useLms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const approved = courses.filter((c) => c.status === "approved");
  const { page, totalPages, setPage, pageItems } = usePagination(approved, 5);

  return (
    <PageShell
      role="content_approver"
      title="Approved Courses"
      description="Courses that have passed content review and are ready for publication."
    >
      {approved.length === 0 ? (
        <EmptyState title="No approved courses" description="Approved content will appear here." />
      ) : (
        <Table columns={["Course", "Owner", "Category", "Publication", "Content", ""]}>
          {pageItems.map((course) => (
            <tr key={course.id}>
              <Td>
                <span className="font-medium text-slate-900">{course.title}</span>
                <span className="block text-[11px] text-slate-400">{course.code}</span>
              </Td>
              <Td>{userName(course.ownerId)}</Td>
              <Td>
                <Badge variant="outline">{course.category}</Badge>
              </Td>
              <Td>
                <Badge variant={course.published ? "green" : "slate"}>
                  {course.published ? "Published" : "Not published"}
                </Badge>
              </Td>
              <Td>
                <span className="text-[11px] text-slate-500">
                  {course.modules.length} modules ·{" "}
                  {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons
                </span>
              </Td>
              <Td className="text-right">
                <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                  <Eye className="h-3.5 w-3.5" />
                  Details
                </Button>
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
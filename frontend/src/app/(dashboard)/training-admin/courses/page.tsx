"use client";

import { useMemo, useState } from "react";
import { Eye, Globe2 } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { usePagination } from "@/lib/usePagination";
import PageShell from "@/components/shared/PageShell";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge, CourseStatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { CourseDetailModal } from "@/components/features/courses/CourseDetailModal";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { COURSE_CATEGORIES } from "@/constants/course-categories";

export default function CourseManagementPage() {
  const { courses, publishCourse, userName } = useLms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [owner, setOwner] = useState("all");

  const owners = useMemo(() => {
    const ids = Array.from(new Set(courses.map((course) => course.ownerId)));
    return ids.map((id) => ({ id, name: userName(id) }));
  }, [courses, userName]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (status === "published" && !course.published) return false;
      if (status !== "all" && status !== "published" && course.status !== status) return false;
      if (category !== "all" && course.category !== category) return false;
      if (owner !== "all" && course.ownerId !== owner) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q) ||
        userName(course.ownerId).toLowerCase().includes(q)
      );
    });
  }, [courses, userName, search, status, category, owner]);
  const { page, totalPages, setPage, pageItems } = usePagination(filtered, 5);

  return (
    <PageShell
      role="training_admin"
      title="Course Management"
      description="All courses in the catalog with their approval and publication status."
    >
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses..."
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
              { value: "published", label: "Published" },
            ],
          },
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
          {
            id: "owner",
            label: "Owner",
            value: owner,
            onChange: setOwner,
            options: [
              { value: "all", label: "All" },
              ...owners.map((item) => ({ value: item.id, label: item.name })),
            ],
          },
        ]}
        onClear={() => {
          setSearch("");
          setStatus("all");
          setCategory("all");
          setOwner("all");
        }}
        hasActiveFilters={search !== "" || status !== "all" || category !== "all" || owner !== "all"}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No courses match" description="Clear filters to see the full catalog." />
      ) : (
        <Table columns={["Course", "Owner", "Status", "Publish", "Learners", ""]}>
          {pageItems.map((course) => (
            <tr key={course.id}>
              <Td>
                <span className="font-medium text-slate-900">{course.title}</span>
                <span className="block text-[11px] text-slate-400">
                  {course.code} · {course.category}
                </span>
              </Td>
              <Td>{userName(course.ownerId)}</Td>
              <Td>
                <CourseStatusBadge status={course.status} />
              </Td>
              <Td>
                <Badge variant={course.published ? "green" : "slate"}>
                  {course.published ? "Published" : "Not published"}
                </Badge>
              </Td>
              <Td>{course.enrolledLearnerIds.length}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedId(course.id)}>
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </Button>
                  {!course.published && course.status === "approved" ? (
                    <Button size="sm" onClick={() => void publishCourse(course.id)}>
                      <Globe2 className="h-3.5 w-3.5" />
                      Publish
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

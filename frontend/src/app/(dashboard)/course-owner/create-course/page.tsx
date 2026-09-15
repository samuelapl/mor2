"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePenLine, PackageOpen } from "lucide-react";
import PageShell from "@/components/shared/PageShell";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";
import { cn } from "@/lib/utils";

type CreationMode = "manual" | "scorm" | null;

export default function CreateCoursePage() {
  const router = useRouter();
  const [mode, setMode] = useState<CreationMode>(null);

  if (mode === "manual") {
    return (
      <PageShell
        role="course_owner"
        title="Create New Course"
        description="Add course details, attach materials, and build the final assessment in a few steps."
      >
        <div className="max-w-5xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft ring-super-soft">
          <CourseCreationWizard
            onDone={() => router.push("/course-owner/my-courses")}
            onCancel={() => setMode(null)}
          />
        </div>
      </PageShell>
    );
  }

  if (mode === "scorm") {
    return (
      <PageShell
        role="course_owner"
        title="Create New Course"
        description="Upload a SCORM package to create a course."
      >
        <div className="max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-soft ring-super-soft">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <PackageOpen className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-slate-900">
            SCORM upload — coming soon
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Uploading and importing SCORM packages isn&apos;t wired up yet. For now, build
            your course manually.
          </p>
          <button
            type="button"
            onClick={() => setMode(null)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      role="course_owner"
      title="Create New Course"
      description="Choose how you'd like to build this course."
    >
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {[
          {
            key: "manual" as const,
            icon: FilePenLine,
            title: "Create manually",
            description:
              "Build the course step by step — details, curriculum, materials and a final assessment.",
          },
          {
            key: "scorm" as const,
            icon: PackageOpen,
            title: "Upload SCORM",
            description: "Import a ready-made SCORM package as a course.",
          },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMode(option.key)}
            className={cn(
              "group flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-soft ring-super-soft transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift",
            )}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 transition-transform duration-200 group-hover:scale-110">
              <option.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
              {option.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {option.description}
            </p>
          </button>
        ))}
      </div>
    </PageShell>
  );
}

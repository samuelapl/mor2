"use client";

import Link from "next/link";
import { Award, Calendar, CheckCircle2, MapPin, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface EnrolledCourseActionsProps {
  courseId: string;
  done: boolean;
  isPerson: boolean;
  /** Shown only for in-person enrollments that have an assigned venue. */
  onViewVenue?: () => void;
}

/**
 * Card actions for a course the learner is enrolled in. Shared by Available Courses
 * and My Courses so both pages offer the same Continue / Venue / Check-In options.
 * Clicks are stopped here so they don't also trigger the card's own navigation.
 */
export function EnrolledCourseActions({ courseId, done, isPerson, onViewVenue }: EnrolledCourseActionsProps) {
  const { tBilingual } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
      <Link href={`/learner/courses/${courseId}/learn`}>
        {done ? (
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {tBilingual('Completed', 'የተጠናቀቀ')}
          </Button>
        ) : (
          <Button size="sm">
            <PlayCircle className="h-3.5 w-3.5" />
            {tBilingual('Continue', 'ቀጥል')}
          </Button>
        )}
      </Link>

      {done ? (
        <Link href="/learner/certificates">
          <Button size="sm" variant="outline">
            <Award className="h-3.5 w-3.5" />
            {tBilingual('Certificates', 'የምስክር ወረቀቶች')}
          </Button>
        </Link>
      ) : null}

      {isPerson ? (
        <>
          {onViewVenue ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewVenue}
              className="gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <MapPin className="h-3.5 w-3.5 text-indigo-600" />
              {tBilingual('Classroom Venue', 'የመማሪያ ክፍል ቦታ')}
            </Button>
          ) : null}

          <Link href="/learner/live-sessions">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              {tBilingual('Sessions & Check-In', 'ክፍለ-ጊዜዎች እና መገኘት ማረጋገጫ')}
            </Button>
          </Link>
        </>
      ) : null}
    </div>
  );
}

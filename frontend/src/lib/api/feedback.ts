'use client';

export interface CourseFeedbackItem {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCode?: string;
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  ratings: {
    curriculumRelevance: number; // 1-5
    trainerDelivery: number; // 1-5
    practicalApplicability: number; // 1-5
    materialsAndPlatform: number; // 1-5
  };
  overallRating: number; // average of ratings
  comments: string;
  recommendToColleagues: boolean;
  status: 'PENDING_REVIEW' | 'REVIEWED';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const STORAGE_KEY = 'mor_lms_course_feedback';

const DEFAULT_FEEDBACK_ITEMS: CourseFeedbackItem[] = [
  {
    id: 'fb-001',
    courseId: 'course-1',
    courseTitle: 'Tax Law Fundamentals & Compliance',
    courseCode: 'TAX-101',
    userId: 'usr-learner-1',
    userName: 'Dawit Abebe',
    userEmail: 'dawit.abebe@mor.gov.et',
    department: 'Domestic Tax Assessment',
    ratings: {
      curriculumRelevance: 5,
      trainerDelivery: 5,
      practicalApplicability: 4,
      materialsAndPlatform: 5,
    },
    overallRating: 4.8,
    comments:
      'Excellent overview of the updated proclamation. The case studies were very relevant to our field audits.',
    recommendToColleagues: true,
    status: 'REVIEWED',
    submittedAt: '2026-09-18T10:30:00Z',
    reviewedBy: 'Training Administrator',
    reviewedAt: '2026-09-19T14:15:00Z',
  },
  {
    id: 'fb-002',
    courseId: 'course-1',
    courseTitle: 'Tax Law Fundamentals & Compliance',
    courseCode: 'TAX-101',
    userId: 'usr-learner-2',
    userName: 'Bethlehem Tadesse',
    userEmail: 'bethlehem.t@mor.gov.et',
    department: 'Customs & Excise',
    ratings: {
      curriculumRelevance: 4,
      trainerDelivery: 5,
      practicalApplicability: 5,
      materialsAndPlatform: 4,
    },
    overallRating: 4.5,
    comments:
      'The live interactive sessions helped clarify withholding tax penalties. Highly recommended.',
    recommendToColleagues: true,
    status: 'PENDING_REVIEW',
    submittedAt: '2026-09-22T16:45:00Z',
  },
  {
    id: 'fb-003',
    courseId: 'course-2',
    courseTitle: 'Electronic Tax Filing (eTax) Masterclass',
    courseCode: 'ETAX-201',
    userId: 'usr-learner-3',
    userName: 'Yohannes Hailu',
    userEmail: 'yohannes.h@mor.gov.et',
    department: 'IT Systems & Automation',
    ratings: {
      curriculumRelevance: 5,
      trainerDelivery: 4,
      practicalApplicability: 5,
      materialsAndPlatform: 5,
    },
    overallRating: 4.8,
    comments:
      'Step-by-step guidance on declaration uploads and validation error resolutions was very well structured.',
    recommendToColleagues: true,
    status: 'PENDING_REVIEW',
    submittedAt: '2026-09-24T09:12:00Z',
  },
];

function getStoredFeedbacks(): CourseFeedbackItem[] {
  if (typeof window === 'undefined') return DEFAULT_FEEDBACK_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FEEDBACK_ITEMS));
      return DEFAULT_FEEDBACK_ITEMS;
    }
    return JSON.parse(raw) as CourseFeedbackItem[];
  } catch {
    return DEFAULT_FEEDBACK_ITEMS;
  }
}

function saveFeedbacks(items: CourseFeedbackItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save feedback to localStorage:', err);
  }
}

export async function fetchCourseFeedbacks(courseId?: string): Promise<CourseFeedbackItem[]> {
  const items = getStoredFeedbacks();
  if (!courseId) return items;
  return items.filter((f) => f.courseId === courseId);
}

export function hasSubmittedFeedback(courseId: string, userId: string): boolean {
  if (typeof window === 'undefined') return false;
  const quickKey = `mor_feedback_${courseId}_${userId}`;
  if (localStorage.getItem(quickKey) === 'true') return true;

  const items = getStoredFeedbacks();
  const found = items.some(
    (item) => item.courseId === courseId && (item.userId === userId || item.userEmail === userId),
  );
  if (found) {
    localStorage.setItem(quickKey, 'true');
  }
  return found;
}

export async function submitCourseFeedback(input: {
  courseId: string;
  courseTitle: string;
  courseCode?: string;
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  ratings: {
    curriculumRelevance: number;
    trainerDelivery: number;
    practicalApplicability: number;
    materialsAndPlatform: number;
  };
  comments: string;
  recommendToColleagues: boolean;
}): Promise<CourseFeedbackItem> {
  const sum =
    input.ratings.curriculumRelevance +
    input.ratings.trainerDelivery +
    input.ratings.practicalApplicability +
    input.ratings.materialsAndPlatform;
  const overallRating = Math.round((sum / 4) * 10) / 10;

  const newFeedback: CourseFeedbackItem = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    overallRating,
    status: 'PENDING_REVIEW',
    submittedAt: new Date().toISOString(),
  };

  const current = getStoredFeedbacks();
  const updated = [newFeedback, ...current];
  saveFeedbacks(updated);

  if (typeof window !== 'undefined') {
    localStorage.setItem(`mor_feedback_${input.courseId}_${input.userId}`, 'true');
  }

  return newFeedback;
}

export async function markFeedbackReviewed(
  feedbackId: string,
  reviewerName: string = 'Authorized Reviewer',
): Promise<CourseFeedbackItem | null> {
  const current = getStoredFeedbacks();
  let updatedItem: CourseFeedbackItem | null = null;

  const next = current.map((item) => {
    if (item.id === feedbackId) {
      updatedItem = {
        ...item,
        status: 'REVIEWED' as const,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
      };
      return updatedItem;
    }
    return item;
  });

  saveFeedbacks(next);
  return updatedItem;
}

export async function deleteFeedback(feedbackId: string): Promise<boolean> {
  const current = getStoredFeedbacks();
  const next = current.filter((item) => item.id !== feedbackId);
  saveFeedbacks(next);
  return true;
}

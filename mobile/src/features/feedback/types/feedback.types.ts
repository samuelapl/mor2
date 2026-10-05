export interface CourseFeedbackInput {
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
  comments: string;
  recommendToColleagues: boolean;
}

export interface CourseFeedbackRecord extends CourseFeedbackInput {
  id: string;
  overallRating: number;
  submittedAt: string;
  status: 'PENDING_REVIEW' | 'REVIEWED';
}

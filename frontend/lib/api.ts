export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

export type Submission = {
  id: string;
  user_id: string;
  organization_id: string;
  topic_id: string;
  /** Base-64 data URL written by the canvas (also exposed as image_url). */
  image_data: string;
  image_url: string;
  date: string;
  submitted_at: string | null;
  created_at: string | null;
  caption: string | null;
};

export type SubmissionPage = {
  submissions: Submission[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

/** Returns the src attribute value for a submission image. */
export function submissionSrc(sub: Submission): string {
  return sub.image_data || sub.image_url;
}

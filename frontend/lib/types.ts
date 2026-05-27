export type Role = "user" | "admin";

export type User = {
  id: string;
  username: string;
  email: string;
  role: Role;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  created_at: string | null;
};

export type Organization = {
  id: string;
  name: string;
  min_age: number | null;
  max_age: number | null;
  description: string | null;
  created_at: string | null;
};

export type HistoryEntry = {
  date: string;
  submissions: {
    submission_id: string;
    image_url: string;
    topic_title: string;
    topic_id: string;
    created_at: string | null;
  }[];
};

export type AuthResponse = {
  user: User;
  access_token: string;
};

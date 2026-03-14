// Shared Movie type used across the frontend.
export interface Movie {
  id: number;
  title: string;
  genre: string;
  year: number;
  rating: number;
  description: string;
  created_at: string;
}

export type MovieInput = Omit<Movie, "id" | "created_at">;

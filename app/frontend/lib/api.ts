// API client for communicating with the movies backend.
// NEXT_PUBLIC_API_URL is set per environment (local dev vs k8s).
import { Movie, MovieInput } from "@/types/movie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listMovies: () => request<Movie[]>("/movies"),

  getMovie: (id: number) => request<Movie>(`/movies/${id}`),

  createMovie: (data: MovieInput) =>
    request<Movie>("/movies", { method: "POST", body: JSON.stringify(data) }),

  updateMovie: (id: number, data: MovieInput) =>
    request<Movie>(`/movies/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteMovie: (id: number) =>
    request<void>(`/movies/${id}`, { method: "DELETE" }),
};

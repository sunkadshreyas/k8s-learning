// Home page — lists all movies with edit and delete actions.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Movie } from "@/types/movie";

export default function HomePage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.listMovies();
      setMovies(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load movies");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this movie?")) return;
    try {
      await api.deleteMovie(id);
      setMovies((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Movies</h1>
        <button
          onClick={() => router.push("/movies/new")}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + Add Movie
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {movies.length === 0 && !error && (
        <p className="text-gray-500">No movies yet. Add one!</p>
      )}

      <div className="grid gap-4">
        {movies.map((m) => (
          <div key={m.id} className="bg-white border rounded p-4 flex items-start justify-between">
            <div>
              <h2 className="font-semibold">{m.title}</h2>
              <p className="text-sm text-gray-500">
                {m.genre} · {m.year} · ⭐ {m.rating}
              </p>
              {m.description && (
                <p className="text-sm text-gray-600 mt-1">{m.description}</p>
              )}
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <button
                onClick={() => router.push(`/movies/${m.id}/edit`)}
                className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(m.id)}
                className="text-sm border border-red-300 text-red-600 px-3 py-1 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

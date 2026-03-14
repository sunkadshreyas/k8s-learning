// Page for creating a new movie.
"use client";

import { api } from "@/lib/api";
import { MovieInput } from "@/types/movie";
import MovieForm from "@/components/MovieForm";

export default function NewMoviePage() {
  async function handleSubmit(data: MovieInput) {
    await api.createMovie(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Movie</h1>
      <MovieForm onSubmit={handleSubmit} submitLabel="Create" />
    </div>
  );
}

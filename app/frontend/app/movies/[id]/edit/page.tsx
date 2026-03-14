// Page for editing an existing movie — fetches current data then renders the shared form.
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Movie, MovieInput } from "@/types/movie";
import MovieForm from "@/components/MovieForm";

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getMovie(Number(id))
      .then(setMovie)
      .catch(() => setError("Movie not found"));
  }, [id]);

  async function handleSubmit(data: MovieInput) {
    await api.updateMovie(Number(id), data);
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!movie) return <p className="text-gray-500">Loading...</p>;

  const initial: MovieInput = {
    title: movie.title,
    genre: movie.genre,
    year: movie.year,
    rating: movie.rating,
    description: movie.description,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Movie</h1>
      <MovieForm initial={initial} onSubmit={handleSubmit} submitLabel="Save" />
    </div>
  );
}

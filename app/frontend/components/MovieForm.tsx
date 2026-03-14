// Reusable form for creating and editing a movie.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MovieInput } from "@/types/movie";

interface Props {
  initial?: MovieInput;
  onSubmit: (data: MovieInput) => Promise<void>;
  submitLabel: string;
}

const empty: MovieInput = { title: "", genre: "", year: 2024, rating: 0, description: "" };

export default function MovieForm({ initial = empty, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<MovieInput>(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: keyof MovieInput, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(form);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Genre</label>
        <input
          value={form.genre}
          onChange={(e) => set("genre", e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Year</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => set("year", parseInt(e.target.value))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Rating (0–10)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={form.rating}
            onChange={(e) => set("rating", parseFloat(e.target.value))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="border px-4 py-2 rounded text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { FlashcardDto, FlashcardsListResponseDto } from "../types";

interface FlashcardsTableProps {
  className?: string;
}

export const FlashcardsTable: React.FC<FlashcardsTableProps> = ({ className }) => {
  const [flashcards, setFlashcards] = useState<FlashcardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const fetchFlashcards = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("sb-access-token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`/api/flashcards?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data: FlashcardsListResponseDto = await response.json();
      setFlashcards(data.data);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      console.error("Error fetching flashcards:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const handleStatusUpdate = async (id: string, status: "accepted" | "rejected") => {
    try {
      const token = localStorage.getItem("sb-access-token");
      if (!token) return;

      const response = await fetch(`/api/flashcards/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchFlashcards(pagination.page);
      } else {
        throw new Error("Failed to update flashcard status");
      }
    } catch (err) {
      console.error("Error updating flashcard status:", err);
      setError("Nie udało się zaktualizować statusu fiszki");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę fiszkę?")) {
      return;
    }

    try {
      const token = localStorage.getItem("sb-access-token");
      if (!token) return;

      const response = await fetch(`/api/flashcards/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchFlashcards(pagination.page);
      } else {
        throw new Error("Failed to delete flashcard");
      }
    } catch (err) {
      console.error("Error deleting flashcard:", err);
      setError("Nie udało się usunąć fiszki");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-100 text-green-800">Zaakceptowana</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Odrzucona</Badge>;
      case "ai-generated":
        return <Badge className="bg-blue-100 text-blue-800">Wygenerowana AI</Badge>;
      case "manual":
        return <Badge className="bg-gray-100 text-gray-800">Manualna</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <Badge className="bg-green-100 text-green-800">Łatwa</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Średnia</Badge>;
      case "hard":
        return <Badge className="bg-red-100 text-red-800">Trudna</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{difficulty}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-red-600" role="alert">
          <p className="font-medium">Nie udało się załadować fiszek</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
          <Button onClick={() => fetchFlashcards(pagination.page)} className="mt-4" variant="outline">
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Lista fiszek</h2>
        <p className="text-sm text-gray-600">Znaleziono {pagination.total} fiszek</p>
      </div>

      {flashcards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak fiszek</h3>
            <p className="mt-1 text-sm text-gray-500">Rozpocznij od utworzenia pierwszych fiszek.</p>
            <div className="mt-6">
              <a
                href="/generate"
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Generuj pierwsze fiszki
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pytanie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Odpowiedź
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Poziom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data utworzenia
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Akcje</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flashcards.map((flashcard) => (
                  <tr key={flashcard.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{flashcard.question}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{flashcard.answer}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(flashcard.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getDifficultyBadge(flashcard.difficulty)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(flashcard.created_at).toLocaleDateString("pl-PL")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {flashcard.status === "ai-generated" && (
                        <>
                          <Button
                            onClick={() => handleStatusUpdate(flashcard.id, "accepted")}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Akceptuj
                          </Button>
                          <Button
                            onClick={() => handleStatusUpdate(flashcard.id, "rejected")}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            Odrzuć
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleDelete(flashcard.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        Usuń
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {flashcards.map((flashcard) => (
              <div key={flashcard.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Pytanie:</h3>
                    <p className="text-sm text-gray-700">{flashcard.question}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Odpowiedź:</h3>
                    <p className="text-sm text-gray-700">{flashcard.answer}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadge(flashcard.status)}
                    {getDifficultyBadge(flashcard.difficulty)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Utworzono: {new Date(flashcard.created_at).toLocaleDateString("pl-PL")}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {flashcard.status === "ai-generated" && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate(flashcard.id, "accepted")}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Akceptuj
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(flashcard.id, "rejected")}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          Odrzuć
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => handleDelete(flashcard.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      Usuń
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-6">
              <div className="flex justify-between flex-1 sm:hidden">
                <Button
                  onClick={() => fetchFlashcards(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  variant="outline"
                >
                  Poprzednia
                </Button>
                <Button
                  onClick={() => fetchFlashcards(pagination.page + 1)}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  variant="outline"
                >
                  Następna
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Wyświetlanie <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> do{" "}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{" "}
                    z <span className="font-medium">{pagination.total}</span> fiszek
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchFlashcards(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    variant="outline"
                    size="sm"
                  >
                    Poprzednia
                  </Button>
                  <Button
                    onClick={() => fetchFlashcards(pagination.page + 1)}
                    disabled={pagination.page * pagination.limit >= pagination.total}
                    variant="outline"
                    size="sm"
                  >
                    Następna
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

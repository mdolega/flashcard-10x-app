import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface DashboardStats {
  totalFlashcards: number;
  pendingReview: number;
  studiedToday: number;
  accuracy: number;
}

export const DashboardCards: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("sb-access-token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch("/api/flashcards/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-red-600" role="alert">
              <p className="font-medium">Nie udało się załadować statystyk</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Wszystkie fiszki</CardTitle>
          <CardDescription>Łączna liczba fiszek</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats?.totalFlashcards || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Do powtórki</CardTitle>
          <CardDescription>Fiszki wymagające powtórki</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats?.pendingReview || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Dziś przećwiczono</CardTitle>
          <CardDescription>Fiszki z dzisiejszej sesji</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats?.studiedToday || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">Skuteczność</CardTitle>
          <CardDescription>Procent poprawnych odpowiedzi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats?.accuracy ? `${stats.accuracy}%` : "0%"}</div>
        </CardContent>
      </Card>
    </div>
  );
};

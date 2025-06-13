import React from "react";

interface SkeletonLoaderProps {
  count?: number;
}

export default function SkeletonLoader({ count = 5 }: SkeletonLoaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
      </div>

      <div className="grid gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse">
            <div className="space-y-4">
              {/* Question section */}
              <div>
                <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
              </div>

              {/* Answer section */}
              <div>
                <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-300 rounded w-4/5"></div>
                </div>
              </div>

              {/* Difficulty badge */}
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

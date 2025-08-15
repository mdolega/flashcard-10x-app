import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { ReviewGrade } from "@/types";

export interface ReviewControlsProps {
  onGrade: (grade: ReviewGrade) => void | Promise<void>;
  disabled?: boolean;
}

const GRADE_BUTTONS: { grade: ReviewGrade; label: string; intent: "destructive" | "default" | "secondary" }[] = [
  { grade: 0, label: "Again", intent: "destructive" },
  { grade: 1, label: "Poor", intent: "destructive" },
  { grade: 2, label: "Fail", intent: "destructive" },
  { grade: 3, label: "Hard", intent: "secondary" },
  { grade: 4, label: "Good", intent: "default" },
  { grade: 5, label: "Easy", intent: "default" },
];

export function ReviewControls({ onGrade, disabled = false }: ReviewControlsProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key >= "0" && e.key <= "5") {
        const g = Number(e.key) as ReviewGrade;
        onGrade(g);
      }
    },
    [disabled, onGrade]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-3xl mx-auto">
      {GRADE_BUTTONS.map(({ grade, label, intent }) => (
        <Button
          key={grade}
          variant={intent === "destructive" ? "destructive" : intent === "secondary" ? "secondary" : "default"}
          onClick={() => onGrade(grade)}
          disabled={disabled}
          aria-label={`Oceń: ${label} (${grade})`}
        >
          {label}
          <span className="ml-1 text-xs opacity-70">{grade}</span>
        </Button>
      ))}
    </div>
  );
}

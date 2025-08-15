import { useId } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ReviewCardProps {
  question: string;
  answer: string;
  is_flipped: boolean;
  onFlip: () => void;
}

export function ReviewCard({ question, answer, is_flipped, onFlip }: ReviewCardProps) {
  const contentId = useId();
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Fiszka</CardTitle>
      </CardHeader>
      <CardContent>
        <div id={contentId} aria-live="polite" className="min-h-40 rounded-md border bg-white p-4 leading-relaxed">
          {is_flipped ? <ReactMarkdown>{answer}</ReactMarkdown> : <ReactMarkdown>{question}</ReactMarkdown>}
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onFlip} aria-controls={contentId} aria-expanded={is_flipped}>
            {is_flipped ? "Pokaż pytanie" : "Pokaż odpowiedź"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

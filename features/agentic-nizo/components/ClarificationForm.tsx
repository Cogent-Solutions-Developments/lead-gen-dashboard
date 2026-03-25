"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MissingFieldsMap } from "@/features/agentic-nizo/api/types";
import type { AgenticApiError } from "@/features/agentic-nizo/api/client";

interface ClarificationFormProps {
  missingFields: MissingFieldsMap;
  existingAnswers: Record<string, string>;
  isSubmitting: boolean;
  error?: AgenticApiError | null;
  onSubmit: (answers: Record<string, string>) => Promise<void> | void;
}

function toLabel(fieldKey: string, question: string): string {
  if (question.trim().length > 0) return question;
  return fieldKey
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ClarificationForm({
  missingFields,
  existingAnswers,
  isSubmitting,
  error,
  onSubmit,
}: ClarificationFormProps) {
  const fieldEntries = useMemo(() => Object.entries(missingFields), [missingFields]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const mergedAnswers = useMemo(() => {
    const nextState: Record<string, string> = {};
    fieldEntries.forEach(([key]) => {
      const localAnswer = answers[key];
      if (typeof localAnswer === "string") {
        nextState[key] = localAnswer;
        return;
      }

      const existingAnswer = existingAnswers[key];
      nextState[key] = typeof existingAnswer === "string" ? existingAnswer : "";
    });
    return nextState;
  }, [answers, existingAnswers, fieldEntries]);

  if (fieldEntries.length === 0) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emptyFields = fieldEntries
      .filter(([key]) => !mergedAnswers[key] || mergedAnswers[key].trim().length === 0)
      .map(([key]) => key);

    if (emptyFields.length > 0) {
      setValidationError(`Please fill all fields. Missing: ${emptyFields.join(", ")}`);
      return;
    }

    setValidationError(null);
    const normalizedAnswers = Object.fromEntries(
      Object.entries(mergedAnswers).map(([key, value]) => [key, value.trim()]),
    );
    await onSubmit(normalizedAnswers);
  };

  return (
    <Card className="border-amber-200/80 bg-amber-50/45 shadow-[0_18px_34px_-28px_rgba(120,53,15,0.5)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <MessageSquareMore className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl text-zinc-900">Clarification Needed</CardTitle>
            <CardDescription>The intake agent needs these answers before continuing.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {fieldEntries.map(([key, question]) => (
            <div key={key} className="space-y-2">
              <label htmlFor={`clarification-${key}`} className="text-sm font-medium text-zinc-800">
                {toLabel(key, question)}
              </label>
              <Input
                id={`clarification-${key}`}
                value={mergedAnswers[key] ?? ""}
                onChange={(event) =>
                  setAnswers((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
                placeholder={`Answer for ${key}`}
                className="border-amber-200 bg-white/90 text-zinc-800"
              />
            </div>
          ))}

          {validationError ? <p className="text-xs font-medium text-red-700">{validationError}</p> : null}

          <Button type="submit" disabled={isSubmitting} className="btn-sidebar-noise h-10 w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting answers...
              </>
            ) : (
              "Submit Clarification Answers"
            )}
          </Button>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50/80 p-3">
            <p className="text-sm font-medium text-red-900">{error.message}</p>
            {error.detail ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-red-800">Raw error detail</summary>
                <pre className="mt-2 max-h-44 overflow-auto rounded-md bg-white/70 p-2 text-xs text-red-900">
                  {stringifyValue(error.detail)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

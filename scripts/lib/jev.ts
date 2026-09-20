// Minimal client for TypeSafe's System One endpoint. No SDK dependency: one
// POST, typed answers back, retry on the two statuses the API says to retry.
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export type Question =
  | {
      readonly type: "noul";
      readonly instructions: unknown;
      readonly criteria?: { true: string; false: string };
    }
  | {
      readonly type: "choice";
      readonly instructions: unknown;
      readonly criteria: Record<string, string | null>;
    }
  | {
      readonly type: "score";
      readonly instructions: unknown;
      readonly criteria: readonly string[];
    };

export interface NoulAnswer {
  readonly type: "noul";
  readonly noul: number;
}

export interface ChoiceAnswer {
  readonly type: "choice";
  readonly choice: string;
  readonly probabilities: Record<string, number>;
  readonly confidence: number;
}

export interface ScoreAnswer {
  readonly type: "score";
  readonly score: number;
  readonly legend: Record<string, string>;
  readonly probabilities: Record<string, number>;
  readonly confidence: number;
}

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface JevResponse {
  readonly model: string;
  readonly answers: Record<string, Answer>;
  readonly usage: { readonly input_tokens: number; readonly output_tokens: number };
}

export class JevError extends Error {}

export function requireApiKey(): string {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    throw new JevError("TYPESAFE_API_KEY is not set. Export it before running the triage pass.");
  }
  return key;
}

export async function ask(
  apiKey: string,
  state: unknown,
  questions: Record<string, Question>,
  model = "jev-latest",
): Promise<JevResponse> {
  let delay = 1000;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state, model, questions }),
    });
    if (response.ok) {
      return (await response.json()) as JevResponse;
    }
    if (response.status !== 429 && response.status !== 529) {
      throw new JevError(
        `${response.status} from TypeSafe: ${(await response.text()).slice(0, 400)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }
  throw new JevError("TypeSafe stayed rate-limited or overloaded across five attempts.");
}

// Bounded parallelism: the account's rate limit is the reason, not a style choice.
export async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]!, index);
    }
  });
  await Promise.all(runners);
  return results;
}

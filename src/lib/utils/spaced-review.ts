// Spaced-repetition reminder schedule: remind on day 1, 3, 7, 14, 30 since a topic's creation
// (matching the classic Ebbinghaus-forgetting-curve checkpoints), then stop — not "every odd
// day forever", which would nag too often for too long.
const REVIEW_SCHEDULE_DAYS = [1, 3, 7, 14, 30];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

// Returns the schedule checkpoint (1, 3, 7, 14, or 30) if the topic is due for review today and
// hasn't already been reviewed today, otherwise null. "Reviewed" is tracked via
// vocabulary_topics.last_reviewed_at, updated whenever the learner generates a story, starts an
// in-topic review session, or starts a Memory Palace session for that topic.
export function getDueReviewDay(
  createdAt: string,
  lastReviewedAt: string | null,
  now: Date = new Date(),
): number | null {
  const daysSinceCreated = daysBetween(new Date(createdAt), now);
  if (!REVIEW_SCHEDULE_DAYS.includes(daysSinceCreated)) return null;

  if (lastReviewedAt && daysBetween(new Date(lastReviewedAt), now) === 0) {
    return null;
  }

  return daysSinceCreated;
}

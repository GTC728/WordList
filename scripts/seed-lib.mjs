/** Compact seed entry helper. */
export function s(zh, en, example, blank, collocations, quiz) {
  const entry = { zh, en, example, blank };
  if (collocations?.length) entry.collocations = collocations;
  if (quiz) entry.quiz = { sentence: quiz[0], blank: quiz[1], role: quiz[2] };
  return entry;
}

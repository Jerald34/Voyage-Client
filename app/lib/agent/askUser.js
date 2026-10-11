/**
 * Helpers for the agent's ask_user questions: finding the open question, building
 * the answer the composer sends, and reading answers back for the chat history.
 */

function isChatMessage(message) {
  return message?.role === "user" || message?.role === "assistant";
}

function isQuestionList(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((question) => question && typeof question.id === "string" && Array.isArray(question.options))
  );
}

/** The questions an assistant message asked, or null. */
export function getAskUser(message) {
  const questions = message?.metadata?.askUser?.questions;
  return message?.role === "assistant" && isQuestionList(questions) ? questions : null;
}

/** The answers a user message carries, or null. */
export function getAnswers(message) {
  const answers = message?.metadata?.answers;
  return message?.role === "user" && Array.isArray(answers?.items) && answers.items.length > 0 ? answers : null;
}

/**
 * The open question: only while the newest chat message is the assistant reply
 * that asked it. Any later user or assistant message closes it; system notes don't.
 */
export function findPendingQuestion(messages) {
  if (!Array.isArray(messages)) return null;
  const last = [...messages].reverse().find(isChatMessage);
  const questions = getAskUser(last);
  return questions ? { messageId: String(last.id), questions } : null;
}

/** "pending", "answered", or "skipped" for each reply that asked, keyed by message id. */
export function askUserStatuses(messages) {
  const statuses = new Map();
  if (!Array.isArray(messages)) return statuses;
  const chat = messages.filter(isChatMessage);
  chat.forEach((message, index) => {
    if (!getAskUser(message)) return;
    const next = chat[index + 1];
    if (!next) statuses.set(message.id, "pending");
    else statuses.set(message.id, getAnswers(next)?.messageId === String(message.id) ? "answered" : "skipped");
  });
  return statuses;
}

export function emptyDraft(questions) {
  return Object.fromEntries(questions.map((question) => [question.id, { selected: [], other: "" }]));
}

export function isAnswered(entry) {
  return Boolean(entry) && (entry.selected.length > 0 || entry.other.trim().length > 0);
}

/** One line of answer text: the chosen labels, then the typed answer. */
export function answerText(item) {
  return [...(item.selected ?? []), ...(item.other ? [item.other] : [])].join(", ");
}

/**
 * Build what the composer sends: `request` for the API, `display` for the
 * optimistic answer bubble, and `text` as the message the agent reads.
 */
export function buildAnswer(pending, draft) {
  const items = pending.questions.map((question) => {
    const entry = draft[question.id] ?? { selected: [], other: "" };
    const other = entry.other.trim();
    return { questionId: question.id, selected: [...entry.selected], ...(other ? { other } : {}) };
  });
  const display = {
    messageId: pending.messageId,
    items: items.map((item, index) => ({
      ...item,
      header: pending.questions[index].header,
      question: pending.questions[index].question,
    })),
  };
  const text = display.items.map((item) => `${item.header}: ${answerText(item)}`).join("\n");
  return { request: { messageId: pending.messageId, items }, display, text };
}

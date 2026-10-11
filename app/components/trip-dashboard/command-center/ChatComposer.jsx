import { useEffect, useMemo, useState } from "react";
import ChatInput from "./ChatInput.jsx";
import AskUserPanel from "./AskUserPanel.jsx";
import { buildAnswer, findPendingQuestion } from "../../../lib/agent/askUser.js";

/**
 * The chat composer: the agent's open ask_user question as a picker, otherwise the
 * normal text box. Both composer mounts (desktop panel, mobile sheet) use it.
 * `onAnswer(text, answer)` sends the answer; every other prop goes to ChatInput.
 */
export default function ChatComposer({ messages, onAnswer, ...inputProps }) {
  const pending = useMemo(() => findPendingQuestion(messages), [messages]);
  // The question the user set aside to type a normal reply instead.
  const [dismissedId, setDismissedId] = useState(null);
  // The last submitted picks, so a failed send brings the question back as the user left it.
  const [submitted, setSubmitted] = useState(null);
  const { textareaRef, isSending, agentError, containerClassName } = inputProps;

  // The panel unmounts on dismiss; hand focus to the text box that replaces it.
  useEffect(() => {
    if (dismissedId) textareaRef?.current?.focus();
  }, [dismissedId, textareaRef]);

  if (pending && pending.messageId !== dismissedId && !isSending) {
    return (
      <AskUserPanel
        key={pending.messageId}
        questions={pending.questions}
        error={agentError}
        initialDraft={submitted?.messageId === pending.messageId ? submitted.draft : null}
        containerClassName={containerClassName}
        onDismiss={() => setDismissedId(pending.messageId)}
        onSubmit={(draft) => {
          setSubmitted({ messageId: pending.messageId, draft });
          const answer = buildAnswer(pending, draft);
          onAnswer?.(answer.text, answer);
        }}
      />
    );
  }

  return <ChatInput {...inputProps} />;
}

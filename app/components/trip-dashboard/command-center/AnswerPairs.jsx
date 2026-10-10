import React from "react";
import { answerText } from "../../../lib/agent/askUser.js";

/** An answer to the agent's ask_user questions: each header beside its answer. */
export default function AnswerPairs({ answers }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3.5 gap-y-1">
      {answers.items.map((item) => (
        <React.Fragment key={item.questionId}>
          <dt className="text-xs font-medium text-text-muted">{item.header}</dt>
          <dd className="m-0 min-w-0 font-medium">{answerText(item)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

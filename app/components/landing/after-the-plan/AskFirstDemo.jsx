"use client";

import { useEffect, useRef, useState } from "react";
import AskUserPanel from "../../trip-dashboard/command-center/AskUserPanel.jsx";
import AnswerPairs from "../../trip-dashboard/command-center/AnswerPairs.jsx";
import { buildAnswer } from "../../../lib/agent/askUser.js";
import { SAMPLE_ASK_USER_QUESTIONS } from "../sample/sampleTrip.js";
import { SECONDARY_BUTTON } from "../landingClasses.js";

const PENDING = { messageId: "landing-sample", questions: SAMPLE_ASK_USER_QUESTIONS };

// `!` because the panel's own mt-auto / pt-3 are emitted after mt-0 / pt-0 and would win.
const PANEL_SPACING = "mt-0! pt-0!";

/** The real question panel. Answers show the way the chat shows them; nothing is sent. */
export default function AskFirstDemo() {
  const [answers, setAnswers] = useState(null);
  const [round, setRound] = useState(0);
  const answersRef = useRef(null);

  // Sending unmounts the panel and the button focused in it, so focus would drop to <body>.
  // `answers` is only set by a submit, so this never runs on first render.
  useEffect(() => {
    if (answers) answersRef.current?.focus();
  }, [answers]);

  if (answers) {
    return (
      <div
        ref={answersRef}
        role="group"
        aria-label="Your answers"
        tabIndex={-1}
        className="grid gap-3 rounded-[18px] border border-border/15 bg-surface p-4 outline-none"
      >
        <div className="justify-self-end rounded-[18px] bg-secondary/15 px-4 py-3 text-sm text-text-primary">
          <AnswerPairs answers={answers} />
        </div>
        <p className="m-0 text-sm text-text-muted">With these answers, Voyage would draft the itinerary.</p>
        <button
          type="button"
          className={`${SECONDARY_BUTTON} justify-self-start`}
          onClick={() => {
            setAnswers(null);
            setRound((current) => current + 1);
          }}
        >
          Try it again
        </button>
      </div>
    );
  }

  return (
    <AskUserPanel
      key={round}
      questions={SAMPLE_ASK_USER_QUESTIONS}
      // First render never takes focus from the page. After "Try it again" the clicked button is
      // gone, so the panel's own "only if nothing has focus" rule lands on the first option.
      focusOnMount={round > 0}
      containerClassName={PANEL_SPACING}
      onSubmit={(draft) => setAnswers(buildAnswer(PENDING, draft).display)}
    />
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { emptyDraft, isAnswered } from "../../../lib/agent/askUser.js";

// Same surface as ChatInput's composer shell: the chat box changes shape, not style.
const panelSurfaceClass =
  "w-full min-w-0 rounded-[18px] border border-border bg-[rgba(255,255,255,0.88)] px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:bg-[rgba(26,29,33,0.88)]";

// Visible keyboard focus for the buttons; pointer clicks don't show it.
const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

/**
 * The composer while the agent waits on ask_user questions: one question at a time,
 * radio rows (checkboxes for multi-select), a free-text "Something else", and a way
 * back to the normal text box. Calls onSubmit(draft) once every question is answered.
 */
export default function AskUserPanel({ questions, onSubmit, onDismiss, error = "", containerClassName = "", initialDraft = null }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => initialDraft ?? emptyDraft(questions));
  const [showError, setShowError] = useState(false);
  const optionsRef = useRef(null);
  const baseId = useId();

  const question = questions[step];
  const entry = draft[question.id];
  const isLast = step === questions.length - 1;
  const errorId = `${baseId}-error`;

  // Land on the option the user already picked, or the first one.
  function focusOptions() {
    const root = optionsRef.current;
    const target =
      root?.querySelector("input[type='radio']:checked, input[type='checkbox']:checked") ??
      root?.querySelector("input[type='radio'], input[type='checkbox']");
    target?.focus({ preventScroll: true });
  }

  // On mount, take focus only if nothing has it (the text box this panel replaced
  // had it and is gone); never pull it from somewhere the user is working.
  // Moving between questions always moves focus to the new options.
  // The decision is kept per step so React's dev-only double effect run can't change it.
  const focusPlanRef = useRef(null);
  useEffect(() => {
    if (focusPlanRef.current?.step !== step) {
      const isMount = focusPlanRef.current === null;
      const active = document.activeElement;
      focusPlanRef.current = { step, focus: !isMount || !active || active === document.body };
    }
    if (focusPlanRef.current.focus) focusOptions();
  }, [step]);

  function update(patch) {
    setDraft((previous) => ({ ...previous, [question.id]: { ...previous[question.id], ...patch } }));
    setShowError(false);
  }

  function toggleOption(label) {
    if (!question.multiSelect) {
      update({ selected: [label], other: "" });
      return;
    }
    update({
      selected: entry.selected.includes(label)
        ? entry.selected.filter((value) => value !== label)
        : [...entry.selected, label],
    });
  }

  function changeOther(value) {
    // A typed answer replaces a single choice; with multi-select it adds to the picks.
    update(question.multiSelect ? { other: value } : { other: value, selected: [] });
  }

  function goBack() {
    setStep((current) => current - 1);
    setShowError(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!isAnswered(entry)) {
      setShowError(true);
      focusOptions();
      return;
    }
    if (isLast) {
      onSubmit(draft);
      return;
    }
    setStep((current) => current + 1);
  }

  function handleKeyDown(event) {
    // Browsers only submit on Enter from the text field; options should move on too.
    if (event.key === "Enter" && (event.target.type === "radio" || event.target.type === "checkbox")) {
      handleSubmit(event);
    }
  }

  return (
    <div
      className={`mt-auto pt-3 w-full transition-opacity duration-200 ease-out starting:opacity-0 ${containerClassName}`}
    >
      <p className="sr-only" aria-live="polite">
        {questions.length === 1 ? "Voyage asked you a question." : `Voyage asked you ${questions.length} questions.`}
      </p>
      <form className={panelSurfaceClass} onSubmit={handleSubmit} onKeyDown={handleKeyDown} aria-label="Questions from Voyage">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex flex-wrap gap-1.5" aria-hidden="true">
            {questions.map((item, index) => (
              <span
                key={item.id}
                className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold transition-colors duration-150 ease-out ${
                  index === step ? "border-secondary bg-secondary/10 text-text-primary" : "border-border/20 text-text-muted"
                }`}
              >
                {item.header}
              </span>
            ))}
          </div>
          {questions.length > 1 && (
            <span className="ml-auto flex-shrink-0 text-[12px] tabular-nums text-text-muted">
              {step + 1} of {questions.length}
            </span>
          )}
        </div>
        <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={showError ? errorId : undefined}>
          <legend className="mb-2.5 p-0 text-[15px] font-semibold leading-snug text-text-primary">{question.question}</legend>
          {/* p-1/-m-1 keeps the focus ring of edge rows from being clipped by the scroll area. */}
          <div ref={optionsRef} className="-m-1 grid max-h-[45vh] gap-2 overflow-y-auto p-1">
            {question.options.map((option, index) => {
              const checked = entry.selected.includes(option.label);
              const optionId = `${baseId}-${question.id}-${index}`;
              return (
                <label
                  key={option.label}
                  className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-[12px] border px-3 py-2.5 transition-[border-color,background-color,box-shadow] duration-150 ease-out has-[:focus-visible]:shadow-[0_0_0_3px_rgba(215,122,97,0.25)] ${
                    checked
                      ? "border-secondary bg-secondary/10"
                      : "border-border/15 [@media(hover:hover)_and_(pointer:fine)]:hover:border-border/35"
                  }`}
                >
                  <input
                    type={question.multiSelect ? "checkbox" : "radio"}
                    name={`${baseId}-${question.id}`}
                    value={option.label}
                    checked={checked}
                    onChange={() => toggleOption(option.label)}
                    aria-labelledby={`${optionId}-label`}
                    aria-describedby={option.description ? `${optionId}-description` : undefined}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer accent-secondary"
                  />
                  <span className="min-w-0">
                    <span id={`${optionId}-label`} className="block text-sm font-semibold text-text-primary">
                      {option.label}
                    </span>
                    {option.description && (
                      <span id={`${optionId}-description`} className="block text-[13px] leading-snug text-text-muted">
                        {option.description}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
            <label className="flex min-h-11 items-center gap-2.5 rounded-[12px] border border-dashed border-border/30 px-3 py-0.5 transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-secondary focus-within:shadow-[0_0_0_3px_rgba(215,122,97,0.25)]">
              <span className="sr-only">Something else</span>
              <input
                type="text"
                value={entry.other}
                onChange={(event) => changeOther(event.target.value)}
                placeholder="Something else? Type it here"
                maxLength={500}
                autoComplete="off"
                enterKeyHint={isLast ? "send" : "next"}
                className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-[16px] text-text-primary shadow-none outline-none placeholder:text-text-soft focus:shadow-none"
              />
            </label>
          </div>
        </fieldset>
        {showError ? (
          <p id={errorId} role="alert" className="mt-2 text-xs text-status-danger">
            Pick an option or type your own answer.
          </p>
        ) : error ? (
          <p role="alert" className="mt-2 text-xs text-status-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={onDismiss}
            className={`min-h-11 cursor-pointer rounded-md border-0 bg-transparent px-1 text-[13px] font-medium text-text-muted underline-offset-2 hover:underline ${focusRingClass}`}
          >
            Type a normal reply instead
          </button>
          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className={`h-11 cursor-pointer rounded-md border border-border/20 bg-transparent px-4 text-sm font-semibold text-text-primary transition-transform duration-150 ease-out active:scale-[0.97] ${focusRingClass}`}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className={`h-11 cursor-pointer rounded-md border-0 bg-secondary-strong px-4 text-sm font-semibold text-on-secondary-strong transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.97] ${focusRingClass}`}
            >
              {isLast ? "Send answers" : "Next"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

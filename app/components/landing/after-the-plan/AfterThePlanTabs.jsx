"use client";

import { useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import AskFirstDemo from "./AskFirstDemo.jsx";
import ShareLinkDemo from "./ShareLinkDemo.jsx";
import ClientFeedbackDemo from "./ClientFeedbackDemo.jsx";
import ApprovalDemo from "./ApprovalDemo.jsx";
import { AFTER_THE_PLAN, AFTER_THE_PLAN_TABS } from "../landingContent.js";

// jsPDF only loads once someone opens the PDF tab.
const SamplePdfDemo = dynamic(() => import("./SamplePdfDemo.jsx"), {
  ssr: false,
  loading: () => (
    <div role="status" className="rounded-[18px] border border-border/15 bg-surface p-4 text-sm text-text-muted">
      Getting the PDF tools ready…
    </div>
  ),
});

const DEMOS = { ask: AskFirstDemo, share: ShareLinkDemo, feedback: ClientFeedbackDemo, pdf: SamplePdfDemo, approve: ApprovalDemo };
const IDS = AFTER_THE_PLAN_TABS.map((tab) => tab.id);

/** WAI-ARIA tabs (automatic activation, roving tabindex) over five live demos. */
export default function AfterThePlanTabs() {
  const [active, setActive] = useState(IDS[0]);
  const tabRefs = useRef({});
  const baseId = useId();
  const tab = AFTER_THE_PLAN_TABS.find((item) => item.id === active);
  const Demo = DEMOS[active];

  function select(id) {
    setActive(id);
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(event) {
    const index = IDS.indexOf(active);
    const next = {
      ArrowRight: IDS[(index + 1) % IDS.length],
      ArrowLeft: IDS[(index - 1 + IDS.length) % IDS.length],
      Home: IDS[0],
      End: IDS[IDS.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    select(next);
  }

  return (
    <section id="after-the-plan" aria-labelledby={`${baseId}-title`} className="mx-auto w-full max-w-[1220px] scroll-mt-24 px-4 pb-24">
      <p className="m-0 text-[13px] font-semibold text-secondary-strong">{AFTER_THE_PLAN.overline}</p>
      <h2 id={`${baseId}-title`} className="m-0 mt-2 font-sans text-2xl font-semibold text-text-primary md:text-3xl">
        {AFTER_THE_PLAN.title}
      </h2>
      <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-text-muted">{AFTER_THE_PLAN.body}</p>

      {/* The divider is an inset shadow, not a border + negative margin: a scroll container would clip the selected tab's underline. */}
      <div
        role="tablist"
        aria-label="Voyage after the plan"
        onKeyDown={handleKeyDown}
        className="mt-6 flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_rgb(var(--color-border-rgb)/0.15)] [scrollbar-width:thin]"
      >
        {AFTER_THE_PLAN_TABS.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              // Focusing scrolls a half-hidden tab into view; iOS Safari doesn't focus a button on tap.
              onClick={() => select(item.id)}
              // The ring sits inside the tab: the scroll container would clip one drawn outside it.
              className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center whitespace-nowrap border-0 border-b-2 bg-transparent px-3 text-sm font-semibold transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-secondary ${
                selected ? "border-secondary-strong text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active}`}
        tabIndex={0}
        className="grid grid-cols-1 gap-6 pt-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
      >
        <div>
          <h3 className="m-0 font-sans text-lg font-semibold text-text-primary">{tab.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{tab.body}</p>
        </div>
        <Demo key={active} />
      </div>
    </section>
  );
}

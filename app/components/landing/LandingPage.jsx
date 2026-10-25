"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import LandingHeader from "./LandingHeader.jsx";
import LandingHero from "./LandingHero.jsx";
import SampleTripSection from "./SampleTripSection.jsx";
import AfterThePlanTabs from "./after-the-plan/AfterThePlanTabs.jsx";
import PricingSection from "./PricingSection.jsx";
import { BuiltOn, Faq, FinalCta, ForAgencies, HowItWorks, LandingFooter, WhatItDoes } from "./LandingSections.jsx";
import VideoModal from "./VideoModal.jsx";
import { FOCUS } from "./landingClasses.js";

const DEMO_VIDEO_URL = "https://res.cloudinary.com/dseh3ykul/video/upload/v1779104257/voyage-client-promo-review_yrrfzh.mp4";

/** The public `/` page: the pitch, a real sample trip, what happens after the plan, and the rest. */
export default function LandingPage({ onLogin, onStartPlanning }) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    // overflow-x-clip, not -hidden: hidden turns this div into a scroll container and the sticky header would stop sticking.
    // The solid bg-background covers the body gradient, so the text-secondary-strong overlines keep their contrast all the way down.
    // reducedMotion="user": with Reduce motion on, the reveals only fade (no movement) and the hero route draws in place.
    <MotionConfig reducedMotion="user">
      <div id="top" className="flex min-h-screen flex-col overflow-x-clip bg-background font-sans text-text-primary">
        <a
          href="#main"
          className={`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-pill focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-soft ${FOCUS}`}
        >
          Skip to content
        </a>
        <LandingHeader onLogin={onLogin} onStartPlanning={onStartPlanning} />
        {/* tabIndex -1 lets the skip link move focus here in every browser; scroll-mt-24 keeps the sticky header off it. */}
        <main id="main" tabIndex={-1} className="flex-1 scroll-mt-24 outline-none">
          <LandingHero onStartPlanning={onStartPlanning} onWatchDemo={() => setIsVideoOpen(true)} />
          <SampleTripSection />
          <AfterThePlanTabs />
          <WhatItDoes />
          <BuiltOn />
          <HowItWorks />
          <ForAgencies />
          <PricingSection onStartPlanning={onStartPlanning} />
          <Faq />
          <FinalCta onStartPlanning={onStartPlanning} />
        </main>
        <LandingFooter onLogin={onLogin} />
        <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} videoUrl={DEMO_VIDEO_URL} />
      </div>
    </MotionConfig>
  );
}

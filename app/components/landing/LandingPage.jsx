"use client";

import { useState } from "react";
import ThemeToggle from "../theme/ThemeToggle";
import VoyageLogo from "../brand/VoyageLogo";
import VideoModal from "./VideoModal";
import {
  SparkleIcon,
  UsersIcon,
  ZapIcon,
  ArrowRightIcon,
  ShareIcon,
  CheckCircleIcon,
  ShieldIcon,
} from "../icons/index.js";

/* ------------------------------------------------------------------ */
/*  Inline SVG icon component (not in icon library yet)               */
/* ------------------------------------------------------------------ */

function IconPlay({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

/* Replace with your Cloudinary video URL, e.g.:
   https://res.cloudinary.com/{cloud_name}/video/upload/{public_id}.mp4 */
const DEMO_VIDEO_URL = "https://res.cloudinary.com/dseh3ykul/video/upload/v1779104257/voyage-client-promo-review_yrrfzh.mp4";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const workflowSteps = [
  { num: 1, title: "Brief your AI", description: "Describe the trip, traveler preferences, dates, and pace in plain language." },
  { num: 2, title: "Review the draft", description: "Your AI co-pilot produces a structured day-by-day itinerary in seconds." },
  { num: 3, title: "Refine together", description: "Swap stops, rebalance days, and adjust pacing through conversation." },
  { num: 4, title: "Share with client", description: "Export a polished, branded itinerary your clients will love." },
];

const agencyBenefits = [
  { icon: UsersIcon, title: "Multi-client management", description: "Handle dozens of active trips across your whole team from one dashboard." },
  { icon: ShareIcon, title: "Branded share screens", description: "Client-facing itineraries match your agency's look and feel." },
  { icon: CheckCircleIcon, title: "Team collaboration", description: "Assign trips to agents, leave notes, and co-edit in real time." },
  { icon: ShieldIcon, title: "Approval workflows", description: "Built-in review stages so nothing ships without sign-off." },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage({ onLogin, onContinue }) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen font-sans text-text-primary bg-background overflow-x-hidden">

      {/* ── Sticky Header ─────────────────────────────────────── */}
      <header className="sticky top-4 z-50 mx-auto w-full max-w-[1220px] px-4">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-7 py-3 sm:py-4 bg-surface/80 backdrop-blur-md border border-border/[0.12] rounded-pill shadow-soft">
          {/* Brand */}
          <a href="#" aria-label="Voyage home" className="text-text-primary no-underline shrink-0">
            <VoyageLogo className="h-9 sm:h-10 w-auto" />
          </a>

          {/* Nav — desktop only */}
          <nav className="hidden md:flex items-center gap-2" aria-label="Landing navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-bold text-text-muted rounded-pill transition-colors duration-150 hover:text-secondary hover:bg-accent/[0.08] no-underline"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme toggle hidden on mobile to preserve space */}
            <span className="hidden sm:block">
              <ThemeToggle />
            </span>
            <button
              type="button"
              onClick={onLogin}
              className="inline-flex items-center px-3 sm:px-5 py-2 sm:py-2.5 text-sm font-extrabold text-text-primary border border-border/[0.18] rounded-pill bg-transparent transition-all duration-150 hover:bg-accent/[0.08] hover:border-accent/30 cursor-pointer"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-extrabold text-white bg-secondary rounded-pill border border-transparent transition-opacity duration-150 hover:opacity-90 cursor-pointer whitespace-nowrap"
            >
              <span className="sm:hidden">Get Access</span>
              <span className="hidden sm:inline">Get Early Access</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="w-full max-w-[1220px] mx-auto px-4 pt-24 pb-20 md:pt-36 md:pb-28 text-center flex flex-col items-center gap-6">
        {/* Overline */}
        <span className="text-text-soft uppercase tracking-[0.18em] text-xs font-extrabold">
          AI-Powered Travel Platform
        </span>

        {/* Headline */}
        <h1 className="font-serif text-3xl md:text-5xl lg:text-[3.5rem] leading-[1.08] tracking-tight text-text-primary max-w-[18ch] mx-auto">
          Itinerary Intelligence for Travel Agencies
        </h1>

        {/* Subheadline */}
        <p className="text-text-muted text-lg max-w-[52ch] mx-auto leading-relaxed">
          Build, refine, and share stunning itineraries with your AI co-pilot.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 bg-secondary text-white rounded-pill px-6 py-3 text-sm font-extrabold border border-transparent transition-opacity duration-150 hover:opacity-90 cursor-pointer"
          >
            Get Early Access
            <ArrowRightIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsVideoOpen(true)}
            className="inline-flex items-center gap-2 border border-border/20 text-text-primary rounded-pill px-6 py-3 text-sm font-extrabold bg-transparent transition-colors duration-150 hover:bg-accent/[0.08] cursor-pointer"
          >
            <IconPlay className="w-3.5 h-3.5" />
            Watch Demo
          </button>
        </div>

      </section>

      {/* ── Bento Grid ────────────────────────────────────────── */}
      <section id="features" className="w-full max-w-[1220px] mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Large Left — AI Agent Command Center */}
          <div className="md:col-span-2 md:row-span-2 group overflow-hidden bg-surface rounded-lg shadow-soft border border-border/[0.08] flex flex-col hover:-translate-y-1 transition-transform duration-200">
            {/* Visual preview area — grows to fill available space */}
            <div className="flex-1 bg-gradient-to-br from-primary/[0.06] via-secondary/20 to-accent/30 p-8 flex flex-col gap-3 min-h-[200px]">
              <div className="w-3/4 h-10 rounded-md bg-surface/80 border border-border/[0.06]" />
              <div className="w-1/2 h-10 rounded-md bg-secondary/[0.14] border border-secondary/[0.08] self-end" />
              <div className="w-2/3 h-10 rounded-md bg-surface/80 border border-border/[0.06]" />
            </div>
            {/* Description — in normal flow at the bottom */}
            <div className="p-6 md:p-8 bg-surface border-t border-border/[0.06]">
              <span className="text-secondary uppercase tracking-[0.18em] text-xs font-extrabold">
                Flagship Feature
              </span>
              <h3 className="font-serif text-2xl md:text-3xl text-text-primary mt-2 mb-2">
                AI Agent Command Center
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Chat with your AI co-pilot, watch the itinerary build in real time, and see every stop plotted on the map — all in one split-screen workspace.
              </p>
            </div>
          </div>

          {/* Top Right — Client-Ready in Seconds */}
          <div className="group relative overflow-hidden bg-surface rounded-lg shadow-soft border border-border/[0.08] p-6 flex flex-col justify-end min-h-[220px] hover:-translate-y-1 transition-transform duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.15] to-secondary/[0.06]" />
            <div className="relative">
              <ZapIcon className="w-8 h-8 text-secondary mb-3" />
              <h3 className="font-serif text-xl text-text-primary mb-1.5">
                Client-Ready in Seconds
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Generate polished, branded PDF itineraries that look hand-crafted in a fraction of the time.
              </p>
            </div>
          </div>

          {/* Bottom Right — Centralized Client Directory */}
          <div className="group relative overflow-hidden bg-surface rounded-lg shadow-soft border border-border/[0.08] p-6 flex flex-col justify-end min-h-[220px] hover:-translate-y-1 transition-transform duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-accent/[0.08]" />
            <div className="relative">
              <UsersIcon className="w-8 h-8 text-secondary mb-3" />
              <h3 className="font-serif text-xl text-text-primary mb-1.5">
                Centralized Client Directory
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Every client, trip history, and preference in one searchable directory for your entire team.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" className="w-full max-w-[1220px] mx-auto px-4 pb-24">
        <div className="text-center mb-14">
          <span className="text-text-soft uppercase tracking-[0.18em] text-xs font-extrabold">
            Workflow
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-text-primary mt-3 mb-3">
            How It Works
          </h2>
          <p className="text-text-muted text-base max-w-[52ch] mx-auto leading-relaxed">
            Four simple steps from a rough travel idea to a polished, client-ready itinerary.
          </p>
        </div>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="relative flex flex-col md:flex-row items-start md:items-stretch gap-10 md:gap-0">
          {/* Connecting dashed line (desktop only) */}
          <div className="hidden md:block absolute top-4 left-[calc(12.5%+16px)] right-[calc(12.5%+16px)] border-t-2 border-dashed border-border/20" />

          {workflowSteps.map((step, i) => (
            <div key={step.num} className="flex-1 flex flex-col items-center text-center relative px-4">
              {/* Number badge */}
              <div className="relative z-10 w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-sm font-bold mb-4 shrink-0">
                {step.num}
              </div>
              <h3 className="font-serif text-lg text-text-primary mb-2">{step.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed max-w-[28ch]">{step.description}</p>

              {/* Vertical connector on mobile (between items) */}
              {i < workflowSteps.length - 1 && (
                <div className="md:hidden w-px h-8 border-l-2 border-dashed border-border/20 mt-4" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Agency Value Props ────────────────────────────────── */}
      <section id="pricing" className="w-full max-w-[1220px] mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* Left — copy + benefit rows */}
          <div>
            <span className="text-text-soft uppercase tracking-[0.18em] text-xs font-extrabold">
              For Professionals
            </span>
            <h2 className="font-serif text-3xl md:text-4xl text-text-primary mt-3 mb-8">
              Built for Agencies
            </h2>

            <div className="flex flex-col gap-7">
              {agencyBenefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex gap-4 items-start">
                    <div className="shrink-0 w-10 h-10 rounded-sm bg-secondary/[0.1] flex items-center justify-center text-secondary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-sans text-sm font-extrabold text-text-primary mb-1">{b.title}</h4>
                      <p className="text-text-muted text-sm leading-relaxed">{b.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — placeholder illustration with glassmorphic treatment */}
          <div className="relative rounded-lg overflow-hidden min-h-[360px] md:min-h-[440px]">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-secondary/[0.12] to-primary/[0.06]" />
            {/* Glassmorphic card overlay */}
            <div className="absolute inset-6 md:inset-10 bg-surface/60 backdrop-blur-md border border-border/[0.12] rounded-md shadow-soft flex flex-col items-center justify-center gap-4 p-8 text-center">
              <SparkleIcon className="w-10 h-10 text-secondary" />
              <p className="font-serif text-xl text-text-primary">Agency Dashboard Preview</p>
              <p className="text-text-muted text-sm max-w-[32ch]">
                See your entire client portfolio, upcoming departures, and agent workload at a glance.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── CTA Footer ────────────────────────────────────────── */}
      <section className="w-full bg-sidebar py-20 md:py-28 mt-auto">
        <div className="max-w-[1220px] mx-auto px-4 text-center flex flex-col items-center gap-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white">
            Ready to transform your agency?
          </h2>
          <p className="text-white/60 text-base max-w-[44ch] mx-auto leading-relaxed">
            Get early access and be among the first agencies to plan smarter with AI-powered itinerary tools.
          </p>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center gap-2 bg-secondary text-white rounded-pill px-8 py-3.5 text-sm font-extrabold border border-transparent transition-opacity duration-150 hover:opacity-90 cursor-pointer"
          >
            Request Early Access
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </section>

      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl={DEMO_VIDEO_URL}
      />
    </div>
  );
}

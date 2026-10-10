"use client";

import { Component } from "react";

/**
 * Catches a demo that throws while it loads or renders (a lazy chunk that fails to download, jsPDF
 * throwing) so the rest of the page keeps working. It resets when its parent remounts it with a new key.
 */
export default class DemoErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Landing demo failed to load", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p role="alert" className="m-0 rounded-[18px] border border-border/15 bg-surface p-4 text-sm text-text-muted">
        {this.props.message}
      </p>
    );
  }
}

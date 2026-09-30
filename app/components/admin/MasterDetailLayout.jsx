"use client";

import DetailPane from "./DetailPane.jsx";

/**
 * Master-detail arrangement. List fills the row (full width below lg); the detail
 * is a DetailPane (static column on lg, drawer below). The pane shows `emptyState`
 * when nothing is selected and `detail` when `open` is true.
 *
 * @param {React.ReactNode} list
 * @param {React.ReactNode} detail
 * @param {string} detailTitle
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {React.ReactNode} emptyState
 * @param {string} [ariaLabel]
 */
export default function MasterDetailLayout({ list, detail, detailTitle, open, onClose, emptyState, ariaLabel }) {
  return (
    <div className="flex min-h-0 flex-1 gap-4 lg:gap-5">
      <div className="min-w-0 flex-1 overflow-y-auto">{list}</div>
      <DetailPane open={open} onClose={onClose} title={detailTitle} ariaLabel={ariaLabel}>
        {open ? detail : emptyState}
      </DetailPane>
    </div>
  );
}

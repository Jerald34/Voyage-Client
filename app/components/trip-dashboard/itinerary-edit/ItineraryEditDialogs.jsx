"use client";
// Every dialog behind the stop menus and day buttons, plus the notice for edits that
// had no dialog of their own (Move up / Move down) or that the server refused.
import { useMemo } from "react";
import StopEditDialog from "./StopEditDialog.jsx";
import MoveStopDialog from "./MoveStopDialog.jsx";
import RenameDayDialog from "./RenameDayDialog.jsx";
import ConfirmActionDialog from "./ConfirmActionDialog.jsx";
import { dayLabel, otherDayOptions, stopDisplayTitle } from "../../../lib/trip-dashboard/itineraryEditing.js";

export default function ItineraryEditDialogs({ editor, days }) {
  const { dialog } = editor;
  const stopTitle = stopDisplayTitle(dialog?.item);
  const moveDays = useMemo(
    () => (dialog?.kind === "moveStop" ? otherDayOptions(days, days.findIndex((day) => day.id === dialog.day.id)) : []),
    [dialog, days],
  );

  return (
    <>
      <StopEditDialog
        open={dialog?.kind === "editStop" || dialog?.kind === "addStop"}
        mode={dialog?.kind === "addStop" ? "add" : "edit"}
        item={dialog?.kind === "editStop" ? dialog.item : null}
        dayLabel={dialog?.day ? dayLabel(dialog.day) : ""}
        onSubmit={editor.submitStop}
        onClose={editor.closeDialog}
      />
      <MoveStopDialog
        open={dialog?.kind === "moveStop"}
        stopTitle={stopTitle}
        days={moveDays}
        onSubmit={editor.submitMove}
        onClose={editor.closeDialog}
      />
      <RenameDayDialog
        open={dialog?.kind === "renameDay"}
        day={dialog?.kind === "renameDay" ? dialog.day : null}
        onSubmit={editor.submitRenameDay}
        onClose={editor.closeDialog}
      />
      <ConfirmActionDialog
        open={dialog?.kind === "deleteStop"}
        title="Delete this stop?"
        body={dialog?.kind === "deleteStop" ? `"${stopTitle}" will be removed from ${dayLabel(dialog.day)}. This can't be undone.` : ""}
        confirmLabel="Delete stop"
        busyLabel="Deleting…"
        tone="danger"
        onConfirm={editor.confirmDelete}
        onClose={editor.closeDialog}
      />
      {editor.notice ? (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-[90] flex w-[min(92vw,420px)] -translate-x-1/2 items-start gap-3 rounded-xl border border-border/20 bg-surface-elevated px-4 py-3 text-sm text-text-primary shadow-strong"
        >
          <span className="flex-1">{editor.notice}</span>
          <button type="button" onClick={editor.dismissNotice} className="text-[0.8rem] font-semibold text-text-muted hover:text-text-primary">
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}

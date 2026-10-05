// Hand edits to one saved itinerary on the Itineraries page: which dialog is open,
// and the request behind each action. Every action resolves to { ok: true } or
// { ok: false, message } so a dialog can show the problem in place.
import { useCallback, useEffect, useState } from "react";
import {
  addItineraryStop,
  deleteItineraryStop,
  moveItineraryStop,
  renameItineraryDay,
  updateItineraryStop,
} from "../lib/api/itineraryEditing.js";
import {
  describeEditError,
  shouldReloadAfterError,
  stopPatchFromForm,
  stopPayloadFromForm,
} from "../lib/trip-dashboard/itineraryEditing.js";

const NOTHING_OPEN = { ok: false, message: "" };

export function useItineraryEditor({ agencyId, itineraryId, canEdit, onItineraryChange, reload }) {
  // null, or { kind: "editStop" | "addStop" | "moveStop" | "deleteStop" | "renameDay", day, item? }
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");

  // Another trip starts with nothing open.
  useEffect(() => {
    setDialog(null);
    setNotice("");
  }, [itineraryId]);

  // The server answers every edit with the whole itinerary. A lock or a stop that is
  // gone means this page is out of date: close the dialog, say why, and reload.
  const send = useCallback(
    async (request) => {
      try {
        onItineraryChange(await request());
        return { ok: true };
      } catch (error) {
        const message = describeEditError(error);
        if (shouldReloadAfterError(error)) {
          setDialog(null);
          setNotice(message);
          reload();
        }
        return { ok: false, message };
      }
    },
    [onItineraryChange, reload],
  );

  const sendAndClose = useCallback(
    async (request) => {
      const result = await send(request);
      if (result.ok) setDialog(null);
      return result;
    },
    [send],
  );

  const open = useCallback(
    (next) => {
      if (!canEdit) return;
      setNotice("");
      setDialog(next);
    },
    [canEdit],
  );
  const openEditStop = useCallback((day, item) => open({ kind: "editStop", day, item }), [open]);
  const openAddStop = useCallback((day) => open({ kind: "addStop", day }), [open]);
  const openMoveStop = useCallback((day, item) => open({ kind: "moveStop", day, item }), [open]);
  const openDeleteStop = useCallback((day, item) => open({ kind: "deleteStop", day, item }), [open]);
  const openRenameDay = useCallback((day) => open({ kind: "renameDay", day }), [open]);
  const closeDialog = useCallback(() => setDialog(null), []);
  const dismissNotice = useCallback(() => setNotice(""), []);

  const submitStop = useCallback(
    async (form) => {
      if (dialog?.kind === "addStop") {
        return sendAndClose(() => addItineraryStop(agencyId, itineraryId, dialog.day.id, stopPayloadFromForm(form)));
      }
      if (dialog?.kind !== "editStop") return NOTHING_OPEN;
      const patch = stopPatchFromForm(form, dialog.item);
      if (Object.keys(patch).length === 0) {
        setDialog(null);
        return { ok: true };
      }
      return sendAndClose(() => updateItineraryStop(agencyId, itineraryId, dialog.item.id, patch));
    },
    [agencyId, itineraryId, dialog, sendAndClose],
  );

  const submitMove = useCallback(
    async (toDayId) => {
      if (dialog?.kind !== "moveStop") return NOTHING_OPEN;
      return sendAndClose(() => moveItineraryStop(agencyId, itineraryId, dialog.item.id, { toDayId }));
    },
    [agencyId, itineraryId, dialog, sendAndClose],
  );

  const confirmDelete = useCallback(async () => {
    if (dialog?.kind !== "deleteStop") return NOTHING_OPEN;
    return sendAndClose(() => deleteItineraryStop(agencyId, itineraryId, dialog.item.id));
  }, [agencyId, itineraryId, dialog, sendAndClose]);

  const submitRenameDay = useCallback(
    async (title) => {
      if (dialog?.kind !== "renameDay") return NOTHING_OPEN;
      return sendAndClose(() => renameItineraryDay(agencyId, itineraryId, dialog.day.id, title.trim()));
    },
    [agencyId, itineraryId, dialog, sendAndClose],
  );

  // Up and down have no dialog, so a failure shows as the notice. The server's
  // toSortOrder is the stop's 1-based position among the day's other stops.
  const moveStopBy = useCallback(
    async (day, itemIndex, delta) => {
      const item = day?.items?.[itemIndex];
      if (!canEdit || !item) return NOTHING_OPEN;
      const result = await send(() =>
        moveItineraryStop(agencyId, itineraryId, item.id, { toDayId: day.id, toSortOrder: itemIndex + 1 + delta }),
      );
      setNotice(result.ok ? "" : result.message);
      return result;
    },
    [agencyId, itineraryId, canEdit, send],
  );

  return {
    canEdit,
    dialog,
    notice,
    dismissNotice,
    closeDialog,
    openEditStop,
    openAddStop,
    openMoveStop,
    openDeleteStop,
    openRenameDay,
    submitStop,
    submitMove,
    confirmDelete,
    submitRenameDay,
    moveStopBy,
  };
}

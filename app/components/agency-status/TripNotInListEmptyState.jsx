export default function TripNotInListEmptyState({ ownerName, ownerEmail }) {
  return (
    <div className="mx-auto mt-24 max-w-md px-6 text-center">
      <p className="text-sm text-text-muted">
        This trip isn&apos;t on your list.
        {ownerName ? (
          <>
            {" "}Ask <span className="text-text-primary">{ownerName}</span> if you should be assigned.
          </>
        ) : null}
      </p>
      {ownerEmail && (
        <a
          href={`mailto:${ownerEmail}`}
          className="mt-3 inline-block text-sm text-text-primary underline-offset-4 hover:underline"
        >
          {ownerEmail}
        </a>
      )}
    </div>
  );
}

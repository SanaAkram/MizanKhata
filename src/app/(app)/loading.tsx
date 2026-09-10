/**
 * Instant skeleton shown the moment a link is tapped, while the server
 * component fetches. Makes navigation feel immediate on a slow connection.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden>
      <div className="h-24 rounded-2xl border border-line bg-card" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl border border-line bg-card" />
        <div className="h-20 rounded-2xl border border-line bg-card" />
      </div>
      <div className="h-10 rounded-xl border border-line bg-card" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-line bg-card"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}

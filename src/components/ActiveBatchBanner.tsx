import { BookOpen, CircleAlert } from "lucide-react";

type ActiveBatch = {
  name: string;
  year: number;
  state: string;
} | null;

export default function ActiveBatchBanner({
  activeBatch,
  isLoading,
  isError,
}: {
  activeBatch: ActiveBatch | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div
        aria-label="Loading active batch"
        className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
      />
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex items-center gap-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm"
      >
        <CircleAlert className="h-8 w-8 flex-shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">Active batch unavailable</p>
          <p className="mt-1 text-sm">
            Unable to load the active batch. Refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!activeBatch) {
    return (
      <div
        role="alert"
        className="flex items-center gap-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm"
      >
        <CircleAlert className="h-8 w-8 flex-shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">No active batch</p>
          <p className="mt-1 text-sm">
            Ask an administrator to activate a batch before continuing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center gap-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 shadow-sm"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <BookOpen className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">
          Active batch
        </p>
        <p className="mt-1 text-xl font-bold text-emerald-950 sm:text-2xl">
          {activeBatch.name}
        </p>
        <p className="mt-0.5 text-sm font-medium capitalize text-emerald-800">
          {activeBatch.state} · {activeBatch.year}
        </p>
      </div>
    </div>
  );
}

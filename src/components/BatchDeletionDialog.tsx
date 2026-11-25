import { useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { downloadCsvWithProgress } from "@/lib/downloadCsv";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BatchTarget = {
  id: number;
  name: string;
};

export default function BatchDeletionDialog({
  batch,
  onOpenChange,
}: {
  batch: BatchTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [csvDownloaded, setCsvDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const deleteBatch = trpc.batches.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.batches.list.invalidate(),
        utils.stats.dashboard.invalidate(),
        utils.corpsMembers.list.invalidate(),
      ]);
      onOpenChange(false);
    },
  });

  const handleDownloadCsv = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      await downloadCsvWithProgress(batch.id, setDownloadProgress);
      setCsvDownloaded(true);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <AlertDialogTitle>Delete Batch: {batch.name}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                This will <span className="font-semibold text-red-700">permanently delete</span> this
                batch along with <span className="font-semibold">all corps members, evaluations,
                comments, and education records</span> in it. This cannot be undone.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="font-semibold text-amber-800 mb-2">Step 1 — Download the data first</p>
                <p className="text-amber-700 text-xs mb-3">
                  You must download the CSV backup before the delete button is enabled.
                  This is your only chance to keep a record of this batch.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={isDownloading || csvDownloaded}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center ${
                    csvDownloaded
                      ? "bg-green-100 text-green-700 cursor-default"
                      : "bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  {isDownloading
                    ? `Downloading... ${downloadProgress}%`
                    : csvDownloaded
                      ? "✓ CSV Downloaded"
                      : "Download CSV Backup"}
                </button>
                {isDownloading && (
                  <div className="mt-3">
                    <Progress value={downloadProgress} />
                  </div>
                )}
                {downloadError && <p role="alert" className="text-xs text-red-600 mt-2">{downloadError}</p>}
              </div>
              {deleteBatch.error && (
                <p role="alert" className="text-sm text-red-600">{deleteBatch.error.message}</p>
              )}
              {csvDownloaded && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-semibold text-red-800">Step 2 — Confirm permanent deletion</p>
                  <p className="text-red-700 text-xs mt-1">
                    The delete button below is now unlocked. Proceed only if you are absolutely certain.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteBatch.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              deleteBatch.mutate({ id: batch.id });
            }}
            disabled={!csvDownloaded || deleteBatch.isPending}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleteBatch.isPending ? "Deleting..." : "Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

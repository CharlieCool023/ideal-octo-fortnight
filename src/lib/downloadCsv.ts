export async function downloadCsvWithProgress(
  batchId: number | undefined,
  onProgress: (percent: number) => void
): Promise<void> {
  const url = batchId
    ? `/api/export/csv-stream?batchId=${batchId}`
    : "/api/export/csv-stream";

  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Export failed (${response.status})`);
  }

  const filenameMatch = response.headers
    .get("content-disposition")
    ?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] || "export.csv";

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body?.getReader();

  if (!reader) {
    const blob = await response.blob();
    triggerBlobDownload(blob, filename);
    onProgress(100);
    return;
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (contentLength > 0) {
      onProgress(Math.min(100, Math.round((received / contentLength) * 100)));
    }
  }

  const blob = new Blob(chunks as BlobPart[], { type: "text/csv" });
  triggerBlobDownload(blob, filename);
  onProgress(100);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

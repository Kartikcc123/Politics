// A small, deliberately serial queue for memory-heavy PDF OCR.  The HTTP
// request returns immediately; closing the app does not stop the queued job.
// Keep this at one until the server has enough RAM for a separate worker host.
let tail = Promise.resolve();
let pending = 0;

const enqueuePdfImport = (task) => {
  pending += 1;
  const run = tail.catch(() => {}).then(async () => {
    pending -= 1;
    return task();
  });
  tail = run.catch(() => {});
  return run;
};

const queuedPdfImports = () => pending;

module.exports = { enqueuePdfImport, queuedPdfImports };
// Runs the shared bounded parser in an isolated Node worker for local administration.
import { parentPort, workerData } from 'node:worker_threads';
import { parseWorkbookInProcess } from '../src/lib/workbook-parser.mjs';

try {
  parentPort.postMessage({ preview: parseWorkbookInProcess(new Uint8Array(workerData.bytes)) });
} catch (error) {
  parentPort.postMessage({
    error: error instanceof Error ? error.message : 'Cannot read this workbook.',
  });
}

export interface OcrProgress {
  /** 0..1 while text is being recognised, otherwise 0. */
  progress: number;
  /** Human-readable stage, e.g. "Loading text recogniser…". */
  label: string;
}

export class OcrCancelledError extends Error {
  constructor() {
    super('Scan cancelled.');
    this.name = 'OcrCancelledError';
  }
}

export interface OcrJob {
  promise: Promise<string>;
  cancel: () => Promise<void>;
}

const STAGE_LABELS: Record<string, string> = {
  'loading tesseract core': 'Loading the text reader…',
  'initializing tesseract': 'Starting the text reader…',
  'loading language traineddata': 'Downloading language data…',
  'initializing api': 'Getting ready…',
  'recognizing text': 'Reading receipt…',
};

/**
 * Runs Tesseract OCR in the browser. The library (and its language data) is
 * loaded on demand, so it only costs bandwidth on the Scan Receipt page.
 */
export function startOcr(file: File, onProgress?: (progress: OcrProgress) => void): OcrJob {
  let cancelled = false;
  let terminate: (() => Promise<unknown>) | null = null;
  let rejectCancel: (reason: Error) => void = () => undefined;
  const cancelSignal = new Promise<never>((_, reject) => {
    rejectCancel = reject;
  });
  cancelSignal.catch(() => undefined);

  const run = async (): Promise<string> => {
    const { createWorker } = await import('tesseract.js');
    if (cancelled) throw new OcrCancelledError();
    const worker = await createWorker('eng', 1, {
      logger: (message) => {
        if (!onProgress || cancelled) return;
        onProgress({
          progress: message.status === 'recognizing text' ? message.progress : 0,
          label:
            message.status === 'recognizing text'
              ? `Reading receipt… ${Math.round(message.progress * 100)}%`
              : (STAGE_LABELS[message.status] ?? 'Working…'),
        });
      },
    });
    terminate = () => worker.terminate();
    try {
      if (cancelled) throw new OcrCancelledError();
      const result = await worker.recognize(file);
      return result.data.text;
    } finally {
      await worker.terminate().catch(() => undefined);
      terminate = null;
    }
  };

  const promise = Promise.race([run(), cancelSignal]);
  return {
    promise,
    cancel: async () => {
      cancelled = true;
      rejectCancel(new OcrCancelledError());
      await terminate?.().catch(() => undefined);
    },
  };
}

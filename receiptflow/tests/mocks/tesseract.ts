/**
 * Offline stand-in for tesseract.js (used by `npm run dev:mock` and tests).
 * It "reads" any image as the same sample receipt, with realistic progress events.
 */
export const SAMPLE_RECEIPT_TEXT = `Kape Kabisera
Official Receipt No. 004281
Date: 21/11/2026
Cashier: Mia
Iced latte x2   190.00
Ensaymada x1    65.00
Pandesal x6     36.00
Subtotal        291.00
Total           ₱291.00
Cash            300.00
Change            9.00`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface LoggerMessage {
  status: string;
  progress: number;
}

export async function createWorker(_langs?: string, _oem?: number, options?: { logger?: (message: LoggerMessage) => void }) {
  const log = options?.logger;
  const fast = typeof window !== 'undefined' && window.localStorage?.getItem('rf-mock-fast-ocr') === '1';
  const step = fast ? 0 : 90;
  return {
    async recognize(_image: unknown) {
      for (const status of ['loading tesseract core', 'initializing tesseract', 'loading language traineddata', 'initializing api']) {
        log?.({ status, progress: 1 });
        await sleep(step);
      }
      for (let i = 1; i <= 10; i += 1) {
        log?.({ status: 'recognizing text', progress: i / 10 });
        await sleep(step);
      }
      return { data: { text: SAMPLE_RECEIPT_TEXT } };
    },
    async terminate() {
      return undefined;
    },
  };
}

export default { createWorker };

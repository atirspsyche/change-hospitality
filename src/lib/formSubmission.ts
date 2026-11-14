const REFERENCE_PATTERN = /^CH-(?:APP|TEMP|HIRE)-\d{8}-[A-F0-9]{12}$/;
const UNCERTAIN_MESSAGE = 'We could not confirm receipt. Your details have been kept here. Please contact the recruitment team before resubmitting to avoid a duplicate.';

export class SubmissionError extends Error {
  public readonly fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'SubmissionError';
    this.fieldErrors = fieldErrors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validReference(value: unknown): value is string {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value);
}

export async function submitForm(action: string, options: RequestInit) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 65_000);
  try {
    const response = await fetch(action, {
      ...options, signal: controller.signal, cache: 'no-store', redirect: 'error',
    });
    if (response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
      throw new SubmissionError(UNCERTAIN_MESSAGE);
    }
    const result: unknown = await response.json();
    if (!isRecord(result)) throw new SubmissionError(UNCERTAIN_MESSAGE);
    if (!response.ok || result.ok !== true) {
      const fieldErrors: Record<string, string> = {};
      if (response.status === 422 && isRecord(result.errors)) {
        for (const [field, message] of Object.entries(result.errors)) {
          if (typeof message === 'string' && message.trim() && message.length <= 500) fieldErrors[field] = message;
        }
      }
      const message = result.ok === false && typeof result.message === 'string' && result.message.trim() && result.message.length <= 500
        ? result.message : UNCERTAIN_MESSAGE;
      throw new SubmissionError(
        validReference(result.reference) ? `${message} Reference ${result.reference}.` : message,
        fieldErrors,
      );
    }
    if (!validReference(result.reference) || typeof result.message !== 'string' ||
      !result.message.trim() || result.message.length > 500) {
      throw new SubmissionError(UNCERTAIN_MESSAGE);
    }
    return { reference: result.reference, message: result.message };
  } catch (error) {
    if (error instanceof SubmissionError) throw error;
    // A broken connection or unreadable response cannot establish whether SMTP accepted the message.
    throw new SubmissionError(UNCERTAIN_MESSAGE);
  } finally {
    clearTimeout(deadline);
  }
}

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function clearFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('[data-submission-error]').forEach((error) => {
    form.querySelectorAll<HTMLElement>('[data-server-invalid]').forEach((control) => {
      const descriptions = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== error.id);
      if (descriptions.length) control.setAttribute('aria-describedby', descriptions.join(' '));
      else control.removeAttribute('aria-describedby');
    });
    error.remove();
  });
  form.querySelectorAll<HTMLElement>('[data-server-invalid]').forEach((control) => {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('data-server-invalid');
  });
}

export function showFieldErrors(
  form: HTMLFormElement,
  errors: Record<string, string>,
  reveal?: (control: FormControl) => void,
) {
  clearFieldErrors(form);
  const controls = Array.from(form.querySelectorAll<FormControl>('input:not([type="hidden"]), textarea, select'));
  let first: FormControl | undefined;
  for (const [name, message] of Object.entries(errors)) {
    const matching = controls.filter((control) => control.name === name);
    if (!matching.length) continue;
    const control = matching[0];
    const container = matching.length > 1 ? control.closest('fieldset') : control.closest('label');
    if (!container) continue;
    const error = document.createElement('span');
    error.id = `submission-error-${crypto.randomUUID()}`;
    error.dataset.submissionError = '';
    error.textContent = message;
    container.append(error);
    matching.forEach((input) => {
      input.setAttribute('aria-invalid', 'true');
      input.dataset.serverInvalid = '';
      input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby') || ''} ${error.id}`.trim());
    });
    first ??= control;
  }
  if (first) {
    reveal?.(first);
    first.focus();
  }
}

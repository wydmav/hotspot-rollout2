/**
 * Universal clipboard copy helper that works reliably across:
 * - HTTPS & localhost contexts (via navigator.clipboard.writeText)
 * - Non-secure HTTP contexts (e.g., http://169.58.98.92:3000)
 * - Embedded cross-origin iframes & mobile browsers (via off-screen textarea + execCommand('copy'))
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const value = String(text ?? '');

  // 1. Try modern Clipboard API first if available in a secure context
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to synchronous execCommand fallback
    }
  }

  // 2. Synchronous DOM textarea fallback for HTTP / restricted iframe contexts
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);

      const selection = document.getSelection();
      const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, value.length);

      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (savedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }

      if (ok) {
        return true;
      }
    } catch {
      // Ignore error
    }
  }

  return false;
}

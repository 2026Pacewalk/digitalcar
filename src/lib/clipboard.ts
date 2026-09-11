/* Clipboard helpers.
 *
 * Lives on its own because the dashboard signature page and the public
 * signature generator both need the rich-text copy, and a second copy of this
 * logic is exactly the kind of thing that quietly diverges — one gets a fix,
 * the other keeps pasting raw HTML into people's signature boxes.
 */

/**
 * Copy `html` to the clipboard as RICH TEXT.
 *
 * navigator.clipboard.writeText() would paste the HTML *source* into the
 * signature box — the classic way this feature ships broken. A real text/html
 * flavour goes on the clipboard (plus text/plain for plain-text composers).
 * Where ClipboardItem isn't available we select the rendered node and use
 * execCommand("copy"), which also yields rich text.
 */
export async function copyRichHtml(html: string, plain: string): Promise<boolean> {
  try {
    if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch { /* fall through to the selection-based copy */ }

  try {
    const host = document.createElement("div");
    host.setAttribute("contenteditable", "true");
    host.style.cssText = "position:fixed;left:-99999px;top:0;white-space:normal;";
    host.innerHTML = html;
    document.body.appendChild(host);
    const range = document.createRange();
    range.selectNodeContents(host);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    const ok = document.execCommand("copy");
    sel?.removeAllRanges();
    document.body.removeChild(host);
    return ok;
  } catch { return false; }
}

/** Plain-text copy, with the legacy fallback for browsers without the async API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through */ }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;left:-99999px;top:0;";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch { return false; }
}

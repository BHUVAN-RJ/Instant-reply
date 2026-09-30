import { renderedText } from "./text";

// Reads and replaces the text of a Gmail reply editor, leaving the signature alone.

const SIGNATURE = ".gmail_signature, [data-smartmail='gmail_signature']";

function bodyRange(editor: HTMLElement): Range {
  const range = document.createRange();
  range.selectNodeContents(editor);
  const block = signatureBlock(editor);
  if (block) range.setEndBefore(block);
  return range;
}

/** The signature block Gmail put in the box, if any: the editor's child that holds it. */
function signatureBlock(editor: HTMLElement): Element | null {
  const signature = editor.querySelector(SIGNATURE);
  if (!signature) return null;
  let top = signature as Element;
  while (top.parentElement && top.parentElement !== editor) top = top.parentElement;
  return top;
}

/** The signature Gmail put in the box, as plain text, without Gmail's "-- " separator line. */
export function readSignature(editor: HTMLElement): string {
  const signature = editor.querySelector<HTMLElement>(SIGNATURE);
  return signature ? renderedText(signature).replace(/^\s*--\s*\n/, "").trim() : "";
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

export function readBox(editor: HTMLElement): string {
  return renderedText(bodyRange(editor).cloneContents());
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Goes through execCommand so Gmail sees a normal edit and Cmd+Z restores the old text.
 * The draft picks its own sign-off. When Gmail put a signature in the box and the draft ends with that
 * signature, the draft's copy is dropped and Gmail's (with its links and formatting) stays under it.
 * When the draft signs with just a name, Gmail's signature is replaced too, so it is not signed twice.
 */
export function writeBox(editor: HTMLElement, text: string): void {
  editor.focus();
  const block = signatureBlock(editor);
  const signature = readSignature(editor);
  let range = bodyRange(editor);
  if (block && signature) {
    const lines = text.trimEnd().split("\n");
    const sigLines = signature.split("\n").filter((l) => l.trim()).length;
    const tail = lines.slice(-sigLines).join("\n");
    if (squash(tail) === squash(signature)) {
      text = lines.slice(0, -sigLines).join("\n").trimEnd();
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
    }
  }
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  const html = text
    .split("\n")
    .map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`)
    .join("");
  document.execCommand("insertHTML", false, html);
}

import { renderedText } from "./text";

// Reads and replaces the text of a Gmail reply editor, leaving the signature alone.

const SIGNATURE = ".gmail_signature, [data-smartmail='gmail_signature']";

function bodyRange(editor: HTMLElement): Range {
  const range = document.createRange();
  range.selectNodeContents(editor);
  const signature = editor.querySelector(SIGNATURE);
  if (signature) {
    let top = signature as Element;
    while (top.parentElement && top.parentElement !== editor) top = top.parentElement;
    range.setEndBefore(top);
  }
  return range;
}

export function readBox(editor: HTMLElement): string {
  return renderedText(bodyRange(editor).cloneContents());
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Goes through execCommand so Gmail sees a normal edit and Cmd+Z restores the old text. */
export function writeBox(editor: HTMLElement, text: string): void {
  editor.focus();
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(bodyRange(editor));
  const html = text
    .split("\n")
    .map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`)
    .join("");
  document.execCommand("insertHTML", false, html);
}

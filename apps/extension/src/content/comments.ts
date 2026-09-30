import type { DraftComment } from "@instant-reply/core";

// Comments pinned to passages of a reply box. Selecting text in the box opens a small note box under
// it; a saved note marks its passage (drawn by the browser over the text through the CSS Highlight API,
// so nothing is ever written into the email) and gets a numbered pin at its end. Refactor sends the
// comments with the box, and they are cleared once the new draft lands. Kept in memory per box.

interface Pinned {
  quote: string;
  note: string;
  range: Range;
  /** The passage can no longer be found (it was edited away). Kept, but not sent or marked. */
  stale: boolean;
  pin: HTMLButtonElement;
}

const HIGHLIGHT = "ir-comment";
const EDITOR = '[contenteditable="true"][role="textbox"]';
const SIGNATURE = ".gmail_signature, [data-smartmail='gmail_signature']";

const byBox = new Map<HTMLElement, Pinned[]>();
let changed: (box: HTMLElement) => void = () => {};

// The note box: one for the page, moved into whichever reply box it is working on.
const note = document.createElement("div");
note.className = "ir-note";
note.hidden = true;
note.innerHTML =
  '<textarea rows="2" placeholder="What should change here?" aria-label="Comment on the selected text"></textarea>' +
  '<div class="ir-note-row"><span class="ir-note-hint">Enter to pin, Esc to close</span><button type="button" class="ir-note-delete">Delete</button></div>';
const noteText = note.querySelector("textarea")!;
const noteDelete = note.querySelector<HTMLButtonElement>(".ir-note-delete")!;
let target: { box: HTMLElement; range: Range; editing?: Pinned } | null = null;

const commentsOf = (box: HTMLElement) => byBox.get(box) ?? [];

function paintHighlights(): void {
  if (typeof Highlight === "undefined" || !CSS.highlights) return;
  const ranges = [...byBox.values()].flat().filter((c) => !c.stale).map((c) => c.range);
  CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
}

function relativeTo(box: HTMLElement, rect: DOMRect | undefined) {
  const b = box.getBoundingClientRect();
  return rect ? { left: rect.left - b.left, top: rect.top - b.top, right: rect.right - b.left, bottom: rect.bottom - b.top, width: b.width } : null;
}

function hideNote(): void {
  note.hidden = true;
  target = null;
  noteText.value = "";
}

function showNote(box: HTMLElement, range: Range, editing?: Pinned): void {
  target = { box, range: range.cloneRange(), editing };
  if (note.parentElement !== box) box.append(note);
  noteText.value = editing?.note ?? "";
  noteDelete.hidden = !editing;
  note.hidden = false;
  const rects = range.getClientRects();
  const r = relativeTo(box, rects[rects.length - 1] ?? range.getBoundingClientRect());
  if (!r) return;
  note.style.left = `${Math.max(8, Math.min(r.left, r.width - note.offsetWidth - 8))}px`;
  note.style.top = `${r.bottom + 8}px`;
  if (editing) noteText.focus();
}

function save(): void {
  if (!target) return;
  const text = noteText.value.trim();
  const { box, range, editing } = target;
  if (editing) {
    if (text) editing.note = text;
    else remove(box, editing);
  } else if (text) {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "ir-pin";
    const comment: Pinned = { quote: range.toString(), note: text, range, stale: false, pin };
    pin.addEventListener("mousedown", (event) => event.preventDefault());
    pin.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showNote(box, comment.range, comment);
    });
    byBox.set(box, [...commentsOf(box), comment]);
    box.append(pin);
  }
  hideNote();
  refresh(box);
}

function remove(box: HTMLElement, comment: Pinned): void {
  comment.pin.remove();
  byBox.set(box, commentsOf(box).filter((c) => c !== comment));
}

/** The reply box and editor a selection sits in, if it is a passage of an active box's body. */
function selectedPassage(): { box: HTMLElement; range: Range } | null {
  const selection = getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const start = range.commonAncestorContainer;
  const el = start instanceof Element ? start : start.parentElement;
  const editor = el?.closest<HTMLElement>(EDITOR);
  const box = editor?.closest<HTMLElement>(".ir-active-box");
  if (!editor || !box || !range.toString().trim()) return null;
  const signature = editor.querySelector(SIGNATURE);
  if (signature && range.intersectsNode(signature)) return null;
  return { box, range };
}

let pendingSelection = 0;
function onSelection(): void {
  clearTimeout(pendingSelection);
  pendingSelection = window.setTimeout(() => {
    if (note.contains(document.activeElement)) return;
    const passage = selectedPassage();
    if (passage) showNote(passage.box, passage.range);
    else if (!noteText.value.trim()) hideNote();
  }, 180);
}

noteText.addEventListener("keydown", (event) => {
  event.stopPropagation();
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    save();
  } else if (event.key === "Escape") {
    event.preventDefault();
    hideNote();
  }
});
noteDelete.addEventListener("click", () => {
  if (target?.editing) remove(target.box, target.editing);
  const box = target?.box;
  hideNote();
  if (box) refresh(box);
});

/** Finds `quote` in the editor's text again, for when Gmail rebuilt the nodes a range pointed into. */
function find(editor: HTMLElement, quote: string): Range | null {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let text = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement?.closest(SIGNATURE)) break;
    nodes.push(n as Text);
    text += (n as Text).data;
  }
  const at = text.indexOf(quote);
  if (at < 0 || !quote) return null;
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (const node of nodes) {
    const end = offset + node.data.length;
    if (!started && at < end) {
      range.setStart(node, at - offset);
      started = true;
    }
    if (started && at + quote.length <= end) {
      range.setEnd(node, at + quote.length - offset);
      return range;
    }
    offset = end;
  }
  return null;
}

function refresh(box: HTMLElement): void {
  const editor = box.querySelector<HTMLElement>(EDITOR);
  commentsOf(box).forEach((c, i) => {
    // A range follows edits on its own; edits inside the passage just update the quote. Only when Gmail
    // swapped out the nodes it pointed into (the range collapses or leaves the editor) is it found again.
    const live = editor && !c.range.collapsed && editor.contains(c.range.commonAncestorContainer);
    if (live) {
      c.quote = c.range.toString();
      c.stale = false;
    } else {
      const found = editor && find(editor, c.quote);
      if (found) c.range = found;
      c.stale = !found;
    }
    c.pin.textContent = c.stale ? "?" : String(i + 1);
    c.pin.classList.toggle("ir-stale", c.stale);
    c.pin.title = c.stale ? `The text this was on changed: ${c.note}` : c.note;
    const rects = c.range.getClientRects();
    const r = relativeTo(box, rects[rects.length - 1]);
    c.pin.hidden = !r;
    if (r) {
      c.pin.style.left = `${r.right + 2}px`;
      c.pin.style.top = `${r.top - 10}px`;
    }
  });
  paintHighlights();
  changed(box);
}

// --- Used by gmail.ts -------------------------------------------------------------------------------

export function initComments(onChange: (box: HTMLElement) => void): void {
  changed = onChange;
  document.addEventListener("selectionchange", onSelection);
  // Typing moves passages along a line without adding nodes, which the page sync does not see.
  document.addEventListener("input", (event) => {
    const box = (event.target as Element | null)?.closest?.<HTMLElement>(".ir-active-box");
    if (box && commentsOf(box).length) refresh(box);
  }, true);
}

/** Keeps marks and pins on their passages; called on every sync. Forgets boxes Gmail removed. */
export function syncComments(box: HTMLElement): void {
  for (const old of byBox.keys()) if (!old.isConnected) byBox.delete(old);
  if (commentsOf(box).length) refresh(box);
}

export function commentCount(box: HTMLElement): number {
  return commentsOf(box).filter((c) => !c.stale).length;
}

export function takeComments(box: HTMLElement): DraftComment[] {
  return commentsOf(box).filter((c) => !c.stale).map(({ quote, note }) => ({ quote, note }));
}

export function clearComments(box: HTMLElement): void {
  if (!byBox.has(box) && target?.box !== box) return;
  for (const c of commentsOf(box)) c.pin.remove();
  byBox.delete(box);
  if (target?.box === box) hideNote();
  paintHighlights();
  changed(box);
}

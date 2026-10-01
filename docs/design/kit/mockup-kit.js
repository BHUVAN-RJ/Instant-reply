/*
 * Instant Reply mockup kit. A theme mockup is one HTML page that writes theme CSS against the same
 * selectors the real theme pack uses (.ir-active-box, [data-ir-card], .ir-skin, .ir-toggle, .ir-refactor,
 * [data-ir-icon], data-ir-layout, data-ir-head-style, data-ir-variant, data-ir-theme...), so the CSS
 * moves into the pack's styles.ts almost unchanged. The kit draws Gmail around it, using the same stand
 * in as the preview: inline replies and Gmail's compose window, light and dark, every state forced side
 * by side, the cursors, comments, a Refactor button that runs the mockup's swoosh, option tabs to compare
 * directions, and sliders for tuning numbers.
 *
 * Start from docs/design/kit/starter.html. Open the page straight from disk, no build or server needed.
 *
 * A <style data-mk-shared> block applies to every option (put what the options have in common there).
 * The coverage panel at the top lists every element a theme must design (REQUIRED below) and marks the
 * ones the active option still leaves as Gmail draws them. The tests read the same list.
 *
 * MockupKit.start({
 *   title: "Theme name",
 *   note: "One line on what to look at in this round.",
 *   options: [{ id: "a", label: "A: ...", style: "theme-a", skin: "<i class='x'></i>", swoosh: {...} }],
 *   variants: ["dawn", "dusk"],              // set as data-ir-variant on the box and avatar
 *   skin: "<i class='...'></i>",             // default skin markup (an option may override)
 *   labels: { refactor: "Refactor", working: "Refactoring" },
 *   tune: [{ name: "sweepMs", label: "Sweep", min: 200, max: 3000, step: 50, value: 900 }],
 *   swoosh: { before(ctx) { return stop }, async during(ctx, write) { write(); return state }, after(ctx, state) {} },
 *   ornament(box, avatar) {},                // optional: extra elements around the box
 * });
 *
 * The swoosh gets ctx = { host, editor, variant, showNew, tune, area(), layer(tag, className), ghost(className) }
 * with the same meaning as the real contract (apps/extension/src/content/theme/contract.ts).
 */
(function () {
  "use strict";

  const ICONS = [
    ["Formatting options", "format", "A"], ["Attach files", "attach", "📎"], ["Insert link", "link", "🔗"],
    ["Insert emoji", "emoji", "☺"], ["Insert files using Drive", "drive", "△"], ["Insert photo", "photo", "▣"],
    ["Insert signature", "signature", "✎"], ["Set up a time to meet", "meet", "▦"], ["More options", "more", "⋮"],
  ];
  // Every element a theme must design. Read by the coverage panel and by apps/extension/test/mockups.test.ts
  // (keep it valid JSON between the markers). Each pattern is a regular expression matched against the
  // option's CSS.
  const REQUIRED = /*REQUIRED*/[
    ["Card edge", "\\.ir-skin"],
    ["To line rule (default)", "\\[data-ir-head-style=\"rule\"\\]"],
    ["To line band (opt in)", "\\[data-ir-head-style=\"band\"\\]"],
    ["Compose window", "\\[data-ir-layout=\"window\"\\]"],
    ["Switch", "\\.ir-toggle\\b"],
    ["Switch on", "\\.ir-toggle\\[data-active=\"true\"\\]"],
    ["Refactor", "\\.ir-refactor"],
    ["Send", "\\.dC[^{}]*\\.(T-I|aoO)"],
    ["Send hover", "\\.dC[^{}]*:hover"],
    ["Send press", "\\.dC[^{}]*:active"],
    ["Schedule arrow", "\\.hG"],
    ["Icon: formatting", "\\[data-ir-icon=\"format\"\\]"],
    ["Icon: attach", "\\[data-ir-icon=\"attach\"\\]"],
    ["Icon: link", "\\[data-ir-icon=\"link\"\\]"],
    ["Icon: emoji", "\\[data-ir-icon=\"emoji\"\\]"],
    ["Icon: Drive", "\\[data-ir-icon=\"drive\"\\]"],
    ["Icon: photo", "\\[data-ir-icon=\"photo\"\\]"],
    ["Icon: signature", "\\[data-ir-icon=\"signature\"\\]"],
    ["Icon: meeting", "\\[data-ir-icon=\"meet\"\\]"],
    ["Icon: more", "\\[data-ir-icon=\"more\"\\]"],
    ["Icon hover", "\\[data-ir-icon[^{}]*:hover"],
    ["Discard", "\\[data-ir-icon=\"trash\"\\]"],
    ["Formatting bar", "\\.J-Z"],
    ["Avatar", "\\[data-ir-avatar"],
    ["Caret", "caret-color"],
    ["Cursors", "cursor:\\s*url\\("],
    ["Selection", "::selection"],
    ["Comment mark", "::highlight\\(ir-comment\\)"],
    ["Comment pin", "\\.ir-pin"],
    ["Comment note", "\\.ir-note"]
  ]/*END*/;

  const DRAFTS = [
    "Hi Alex,<br><br>Thursday works for me. I'll bring the updated slides and the numbers from last quarter, so we can go through them together.<br><br>Thanks,<br>Sam",
    "Hey Alex,<br><br>Thursday at 3 is perfect. I'll have the slides ready and send them over the night before.<br><br>Sam",
  ];
  const ORIGINAL = "Hi Alex,<br><br>Can we move the review to Thursday? I still need to finish the slides.<br><br>Sam";

  let cfg, option, boxCount = 0, draftIndex = 0;
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const state = { variant: "", band: false, showNew: true, thinking: 2500, tune: {} };
  const storeKey = "mockup-kit:" + location.pathname;

  // --- markup, built like Gmail's (and like the preview's stand in) ------------------------------------

  const iconButtons = (cls = "") => ICONS.map(([label, , glyph]) => `<div role="button" class="${cls}" data-tooltip="${label}"><span>${glyph}</span></div>`).join("");
  const toggle = (on, cls = "") => `<button type="button" class="ir-toggle ${cls}" data-active="${on}" aria-pressed="${on}" title="Instant Reply"><span class="ir-dot"></span>Instant Reply</button>`;
  const sendRow = (on) => `<div class="aDj"><table><tbody><tr>
      <td><div class="dC"><div class="T-I aoO" role="button">Send</div><div class="T-I hG" role="button"><span>▾</span></div></div>${on ? '<button type="button" class="ir-refactor"></button>' : toggle(false)}</td>
      <td class="pv-grow"><span class="pv-icons">${iconButtons()}</span></td>
      ${on ? `<td class="ir-toggle-cell">${toggle(true)}</td>` : ""}
      <td class="pv-discard"><div role="button" data-tooltip="Discard draft"><span>🗑</span></div></td>
    </tr></tbody></table></div>`;
  const editor = (html) => `<table class="iN"><tbody><tr><td><div class="pv-editor" contenteditable="true" role="textbox" aria-label="Message Body">${html}</div></td></tr></tbody></table>`;
  const formatBar = `<div class="J-Z" role="toolbar"><div role="listbox">Sans Serif</div><div class="J-Z-axR"></div><div role="button"><b>B</b></div><div role="button"><i>I</i></div><div role="button"><u>U</u></div><div class="J-Z-axR"></div><div role="button">≡</div></div>`;

  function replyBox(on) {
    return `<div><div class="pv-msg"><div class="pv-av">A</div><div><div class="pv-from">Alex Rivera</div><div class="pv-snip">Quick one: are we still on for the quarterly review this week?</div></div></div>
<div class="aoI" data-compose-id="mk${++boxCount}">
  <div class="pv-avatar-col"><div class="pv-avatar-wrap"><div class="pv-avatar"></div></div></div>
  <div class="pv-card" data-ir-card>
    <div class="pv-head"><span>To</span><span class="pv-chip">Alex Rivera</span><span class="pv-grow"></span><div role="button" data-tooltip="Pop out reply">⤢</div></div>
    ${editor(ORIGINAL)}${formatBar}${sendRow(on)}
  </div>
</div></div>`;
  }

  function windowBox(kind, on) {
    const title = kind === "compose" ? "New Message" : "Re: Quarterly review";
    const head = kind === "compose"
      ? `<div class="pv-wrow"><span class="pv-wlabel">To</span><input class="pv-winput" value="alex.rivera@example.com" aria-label="To recipients"><span class="pv-wlabel">Cc Bcc</span></div>
         <div class="pv-wrow"><input class="pv-winput" placeholder="Subject" aria-label="Subject"></div>`
      : `<div class="pv-wrow"><span class="pv-wlabel">↩ ▾</span><span>Alex Rivera (alex.rivera@example.com)</span></div>`;
    return `<div class="pv-window" role="dialog" aria-label="${title}"><div class="pv-wtitle"><span>${title}</span><span class="pv-wctl">_ ⤢ ✕</span></div>
  <div class="aoI" data-compose-id="mk${++boxCount}">${head}${editor(ORIGINAL)}${formatBar}${sendRow(on)}</div></div>`;
  }

  // --- what gmail.ts does to an active box --------------------------------------------------------------

  function themeOf(node) {
    for (; node; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = (bg.match(/[\d.]+/g) || []).map(Number);
      if (!bg || bg === "transparent" || m[3] === 0) continue;
      const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
      return { theme: lum < 0.4 ? "dark" : "light", paper: bg };
    }
    return { theme: "light", paper: "#fff" };
  }

  function tagIcons(box) {
    for (const node of box.querySelectorAll("[data-tooltip]")) {
      const hit = ICONS.find(([label]) => node.dataset.tooltip.startsWith(label));
      if (hit) node.dataset.irIcon = hit[1];
      if (node.dataset.tooltip.startsWith("Discard draft")) node.dataset.irIcon = "trash";
    }
  }

  function layoutSkin(box) {
    const card = $("[data-ir-card]", box) || box;
    let skin = $(":scope > .ir-skin", box);
    if (!skin) {
      skin = el(`<div class="ir-skin" aria-hidden="true">${option.skin ?? cfg.skin ?? ""}</div>`);
      box.prepend(skin);
    }
    const b = box.getBoundingClientRect(), c = card.getBoundingClientRect();
    Object.assign(skin.style, { left: `${c.left - b.left}px`, top: `${c.top - b.top}px`, width: `${c.width}px`, height: `${c.height}px` });
    const body = $("table.iN", card);
    const bodyTop = body ? body.getBoundingClientRect().top : c.top;
    skin.style.setProperty("--ir-head", `${Math.max(0, bodyTop - c.top)}px`);
    for (const child of card.children) {
      if (child === body || child === skin) continue;
      child.toggleAttribute("data-ir-head", child.getBoundingClientRect().bottom <= bodyTop + 1);
    }
    const avatar = $("[data-ir-avatar]", box);
    if (cfg.ornament) cfg.ornament(box, avatar);
  }

  function dress(box, variant, seed) {
    const card = $("[data-ir-card]", box) || box;
    const layout = box.closest('[role="dialog"]') ? "window" : "card";
    const { theme, paper } = themeOf(card);
    box.dataset.irLayout = layout;
    box.dataset.irHeadStyle = layout === "card" && state.band ? "band" : "rule";
    box.dataset.irTheme = theme;
    box.style.setProperty("--ir-paper", paper);
    box.classList.add("ir-active-box");
    box.dataset.irVariant = variant;
    const avatar = $(".pv-avatar", box);
    if (avatar) {
      avatar.dataset.irAvatar = box.dataset.composeId;
      avatar.dataset.irVariant = variant;
      avatar.parentElement.setAttribute("data-ir-avatar-wrap", "");
      avatar.parentElement.dataset.irVariant = variant;
    }
    tagIcons(box);
    requestAnimationFrame(() => { layoutSkin(box); if (seed) seedComments(box, seed); });
    new ResizeObserver(() => layoutSkin(box)).observe(card);
    const button = $(".ir-refactor", box);
    if (button) {
      button.textContent = labels().refactor;
      button.addEventListener("click", () => refactor(box, button, variant));
    }
  }

  const labels = () => Object.assign({ refactor: "Refactor", working: "Refactoring" }, cfg.labels, option.labels);

  // --- comments shown without selecting anything -------------------------------------------------------

  function wordRange(editorEl, word) {
    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const at = n.data.indexOf(word);
      if (at < 0) continue;
      const r = document.createRange();
      r.setStart(n, at); r.setEnd(n, at + word.length);
      return r;
    }
    return null;
  }
  const marked = [];
  function seedComments(box, kind) {
    box.querySelectorAll(".mk-seed").forEach((n) => n.remove());
    const ed = $('[role="textbox"]', box), b = box.getBoundingClientRect();
    const pin = (range, label, stale) => {
      const r = range && range.getClientRects()[0];
      if (!r) return null;
      const p = el(`<button type="button" class="ir-pin mk-seed${stale ? " ir-stale" : ""}">${label}</button>`);
      Object.assign(p.style, { left: `${r.right - b.left + 2}px`, top: `${r.top - b.top - 10}px` });
      box.append(p);
      return r;
    };
    const thursday = wordRange(ed, "Thursday");
    const rect = pin(thursday, "1", false);
    pin(wordRange(ed, "slides"), "?", true);
    if (thursday) marked.push(thursday);
    if (window.Highlight && CSS.highlights) CSS.highlights.set("ir-comment", new Highlight(...marked.filter((r) => r.startContainer.isConnected)));
    if (rect && kind === "note") {
      const note = el(`<div class="ir-note mk-seed"><textarea rows="2" aria-label="Comment">Make this sound less like a request</textarea><div class="ir-note-row"><span class="ir-note-hint">Enter to pin, Esc to close</span><button type="button" class="ir-note-delete">Delete</button></div></div>`);
      Object.assign(note.style, { left: `${rect.left - b.left}px`, top: `${rect.bottom - b.top + 8}px` });
      box.append(note);
    }
  }

  // --- Refactor with a fake model, running the mockup's swoosh ------------------------------------------

  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function swooshContext(box, ed, variant) {
    const area = () => {
      const h = box.getBoundingClientRect(), e = ed.getBoundingClientRect();
      return { left: e.left - h.left, top: e.top - h.top, width: e.width, height: e.height };
    };
    const place = (node) => {
      const a = area();
      Object.assign(node.style, { position: "absolute", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, pointerEvents: "none" });
      box.append(node);
      return node;
    };
    return {
      host: box, editor: ed, variant, showNew: state.showNew, tune: { ...state.tune }, area,
      /** An element laid over the writing area (a canvas is sized for the screen). */
      layer(tag, className) {
        const node = place(document.createElement(tag || "div"));
        node.className = className || "";
        if (node instanceof HTMLCanvasElement) {
          const a = area(), d = devicePixelRatio || 1;
          node.width = Math.round(a.width * d); node.height = Math.round(a.height * d);
          node.getContext("2d").setTransform(d, 0, 0, d, 0, 0);
        }
        return node;
      },
      /** A still copy of the editor's current text, laid over it, for the old text to leave. */
      ghost(className) {
        const cs = getComputedStyle(ed), node = document.createElement("div");
        for (const p of ["font", "lineHeight", "color", "padding", "letterSpacing"]) node.style[p] = cs[p];
        node.innerHTML = ed.innerHTML;
        node.className = className || "";
        node.style.overflow = "hidden";
        return place(node);
      },
    };
  }

  async function refactor(box, button, variant) {
    if (button.disabled) return;
    const ed = $('[role="textbox"]', box), sw = option.swoosh || cfg.swoosh || {};
    const ctx = swooshContext(box, ed, variant);
    let written = false;
    const write = () => { if (!written) { written = true; ed.innerHTML = DRAFTS[draftIndex++ % DRAFTS.length]; } };
    button.disabled = true;
    button.textContent = labels().working;
    ed.classList.add("ir-busy");
    const stop = !reducedMotion() && sw.before ? sw.before(ctx) : null;
    await sleep(state.thinking);
    if (typeof stop === "function") stop();
    ed.classList.remove("ir-busy");
    box.querySelectorAll(".mk-seed").forEach((n) => n.remove());
    try {
      if (reducedMotion() || !sw.during) write();
      else {
        const s = await sw.during(ctx, write);
        write();
        if (sw.after) sw.after(ctx, s);
      }
    } catch (error) {
      console.error("[mockup] swoosh", error);
      write();
    }
    button.disabled = false;
    button.textContent = labels().refactor;
  }

  // --- the page --------------------------------------------------------------------------------------

  const forced = (css) => css.replace(/:(hover|active|focus-visible)(?![\w-])/g, (_, s) => `:is(:${s}, .mk-${s})`);

  /** The CSS of the active option, with the shared blocks. */
  function optionCss() {
    const shared = [...document.querySelectorAll("style[data-mk-shared]")].map((s) => s.textContent);
    const src = document.getElementById(option.style);
    return shared.join("\n") + "\n" + (src ? src.textContent : "");
  }

  function applyOption(id) {
    option = cfg.options.find((o) => o.id === id) || cfg.options[0];
    for (const o of cfg.options) {
      const s = document.getElementById(o.style);
      if (s) s.media = "not all";
    }
    document.querySelectorAll("style[data-mk-shared]").forEach((s) => (s.media = "not all"));
    let out = $("#mk-active");
    if (!out) document.head.append((out = el('<style id="mk-active"></style>')));
    out.textContent = forced(optionCss());
    document.querySelectorAll(".mk-tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === option.id)));
  }

  /** Which required elements the active option designs, and which it still leaves to Gmail. */
  function coverage() {
    const css = optionCss().replace(/\/\*[\s\S]*?\*\//g, "");
    return REQUIRED.map(([label, pattern]) => ({ label, done: new RegExp(pattern).test(css) }));
  }

  function section(title, note) {
    const app = $("#mk-app");
    app.append(el(`<h2>${title}${note ? ` <small>${note}</small>` : ""}</h2>`));
    const div = document.createElement("div");
    app.append(div);
    return div;
  }
  const gmail = (mode, html, caption) => el(`<div><p class="mk-cap">${caption}</p><div class="pv-gmail pv-${mode}">${html}</div></div>`);

  function render() {
    const app = $("#mk-app");
    app.innerHTML = cfg.note ? `<p class="mk-note">${cfg.note}</p>` : "";
    const cov = coverage(), missing = cov.filter((c) => !c.done);
    app.append(el(`<div class="mk-coverage ${missing.length ? "mk-incomplete" : "mk-complete"}">
      <strong>${missing.length ? `${missing.length} of ${cov.length} elements still look like Gmail` : `All ${cov.length} elements designed`}</strong>
      <div>${cov.map((c) => `<span class="${c.done ? "mk-done" : "mk-missing"}">${c.done ? "✓" : "✗"} ${c.label}</span>`).join("")}</div>
    </div>`));
    marked.length = 0;
    const variants = state.variant === "all" ? cfg.variants : [state.variant];

    let cols = section("Reply box", "inline in a thread; Refactor runs the mockup's swoosh with a fake model");
    let grid = el('<div class="mk-cols mk-boxes"></div>');
    cols.append(grid);
    let first = true;
    for (const v of variants) for (const mode of ["light", "dark"]) {
      const node = gmail(mode, replyBox(true), `${v}, ${mode} Gmail, To line ${state.band ? "band" : "rule"}`);
      grid.append(node);
      dress($(".aoI", node), v, first ? "note" : "pins");
      first = false;
    }
    grid.append(gmail("light", replyBox(false), "thread off: plain Gmail"));

    cols = section("Compose window", "a new email and a reply popped out: Gmail's 600px window, no card, no avatar");
    grid = el('<div class="mk-cols mk-windows"></div>');
    cols.append(grid);
    for (const mode of ["light", "dark"]) for (const kind of ["compose", "popped"]) {
      const node = gmail(mode, windowBox(kind, true), `${kind === "compose" ? "new email" : "popped out reply"}, ${variants[0]}, ${mode} Gmail`);
      grid.append(node);
      dress($(".aoI", node), variants[0]);
    }

    cols = section("Send row and toolbar icons", "Send, the schedule arrow, every toolbar icon and Discard, large, at rest and on hover");
    grid = el('<div class="mk-cols"></div>');
    cols.append(grid);
    for (const mode of ["light", "dark"]) {
      const cell = (label, inner) => `<div class="mk-state">${inner}<small>${label}</small></div>`;
      const icon = (name, label, glyph, cls) => `<div role="button" class="${cls}" data-tooltip="${label}"><span>${glyph}</span></div>`;
      const row = (cls) => ICONS.map(([label, name, glyph]) => cell(name, `<span class="pv-icons">${icon(name, label, glyph, cls)}</span>`)).join("")
        + cell("discard", `<span class="pv-discard">${icon("trash", "Discard draft", "🗑", cls)}</span>`);
      const node = gmail(mode, `<div class="aoI mk-states mk-gallery" data-compose-id="mkg-${mode}">
        <span class="mk-label">Send</span><div class="mk-row">${cell("rest", `<div class="dC"><div class="T-I aoO" role="button">Send</div><div class="T-I hG" role="button"><span>▾</span></div></div>`)}${cell("hover", `<div class="dC mk-hover"><div class="T-I aoO mk-hover" role="button">Send</div><div class="T-I hG" role="button"><span>▾</span></div></div>`)}${cell("arrow hover", `<div class="dC"><div class="T-I aoO" role="button">Send</div><div class="T-I hG mk-hover" role="button"><span>▾</span></div></div>`)}</div>
        <span class="mk-label">Icons, rest</span><div class="mk-row">${row("")}</div>
        <span class="mk-label">Icons, hover</span><div class="mk-row">${row("mk-hover")}</div>
      </div>`, `${variants[0]}, ${mode} Gmail`);
      grid.append(node);
      const box = $(".aoI", node);
      Object.assign(box.dataset, { irTheme: mode, irVariant: variants[0], irLayout: "card", irHeadStyle: "rule" });
      box.style.setProperty("--ir-paper", mode === "light" ? "#ffffff" : "#2c2c2c");
      box.style.background = "var(--ir-paper)";
      box.classList.add("ir-active-box");
      tagIcons(box);
    }

    cols = section("States", "every state forced side by side");
    grid = el('<div class="mk-cols"></div>');
    cols.append(grid);
    const st = (label, html) => `<div class="mk-state">${html}<small>${label}</small></div>`;
    const send = (c) => `<div class="dC ${c}"><div class="T-I aoO ${c}" role="button">Send</div><div class="T-I hG" role="button"><span>▾</span></div></div>`;
    const rf = (c, text = labels().refactor, dis = false) => `<button type="button" class="ir-refactor ${c}"${dis ? " disabled" : ""}>${text}</button>`;
    for (const mode of ["light", "dark"]) {
      const node = gmail(mode, `<div class="aoI mk-states" data-compose-id="mks-${mode}">
        <span class="mk-label">Switch</span><div class="mk-row">${st("off", toggle(false))}${st("off, hover", toggle(false, "mk-hover"))}${st("on", toggle(true))}${st("on, hover", toggle(true, "mk-hover"))}${st("focus", toggle(true, "mk-focus-visible"))}</div>
        <span class="mk-label">Refactor</span><div class="mk-row">${st("rest", rf(""))}${st("hover", rf("mk-hover"))}${st("press", rf("mk-hover mk-active"))}${st("working", rf("", labels().working, true))}${st("2 comments", rf("", `${labels().refactor} (2)`))}${st("focus", rf("mk-focus-visible"))}</div>
        <span class="mk-label">Send</span><div class="mk-row">${st("rest", send(""))}${st("hover", send("mk-hover"))}${st("press", send("mk-hover mk-active"))}${st("focus", send("mk-focus-visible"))}</div>
        <span class="mk-label">Icons</span><div class="mk-row">${st("rest", `<span class="pv-icons">${iconButtons()}</span>`)}${st("hover", `<span class="pv-icons">${iconButtons("mk-hover")}</span>`)}</div>
        <span class="mk-label">Discard</span><div class="mk-row">${st("rest", '<span class="pv-discard"><div role="button" data-tooltip="Discard draft"><span>🗑</span></div></span>')}${st("hover", '<span class="pv-discard"><div role="button" class="mk-hover" data-tooltip="Discard draft"><span>🗑</span></div></span>')}</div>
      </div>`, `${variants[0]}, ${mode} Gmail`);
      grid.append(node);
      const box = $(".aoI", node);
      Object.assign(box.dataset, { irTheme: mode, irVariant: variants[0], irLayout: "card", irHeadStyle: "rule" });
      box.style.setProperty("--ir-paper", mode === "light" ? "#ffffff" : "#2c2c2c");
      box.style.background = "var(--ir-paper)";
      box.classList.add("ir-active-box");
      tagIcons(box);
    }

    cols = section("Cursors", "move over each area: arrow, hand, text cursor");
    for (const mode of ["light", "dark"]) {
      const node = gmail(mode, `<div class="aoI mk-try" data-compose-id="mkc-${mode}"><div>Arrow</div><div role="button">Hand</div><div contenteditable="true" role="textbox">Text cursor</div></div>`, mode);
      node.style.marginBottom = "12px";
      cols.append(node);
      const box = $(".aoI", node);
      Object.assign(box.dataset, { irTheme: mode, irVariant: variants[0], irLayout: "card" });
      box.classList.add("ir-active-box");
    }

    if (cfg.tune && cfg.tune.length) {
      cols = section("Numbers", "tune, then Refactor again; copy the numbers into DESIGN.md when one feels right");
      const panel = el('<div><div class="mk-tune"></div><div class="mk-tune-actions"><button type="button" id="mk-copy">Copy numbers</button><button type="button" id="mk-reset">Reset</button></div></div>');
      cols.append(panel);
      for (const t of cfg.tune) {
        const row = el(`<label>${t.label || t.name}<output></output><input type="range" min="${t.min}" max="${t.max}" step="${t.step || 1}"></label>`);
        const input = $("input", row), out = $("output", row);
        input.value = state.tune[t.name];
        out.textContent = input.value;
        input.addEventListener("input", () => {
          state.tune[t.name] = Number(input.value);
          out.textContent = input.value;
          save();
        });
        $(".mk-tune", panel).append(row);
      }
      $("#mk-copy", panel).addEventListener("click", () => navigator.clipboard?.writeText(JSON.stringify(state.tune, null, 2)));
      $("#mk-reset", panel).addEventListener("click", () => {
        for (const t of cfg.tune) state.tune[t.name] = t.value;
        save();
        render();
      });
    }
  }

  function save() {
    try { localStorage.setItem(storeKey, JSON.stringify({ tune: state.tune, option: option && option.id })); } catch (e) { /* storage off */ }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch (e) { return {}; }
  }

  function start(config) {
    cfg = Object.assign({ variants: ["default"], options: [] }, config);
    if (!cfg.options.length) throw new Error("MockupKit: give at least one option with the id of its <style> element");
    const saved = load();
    state.variant = cfg.variants[0];
    for (const t of cfg.tune || []) state.tune[t.name] = saved.tune && t.name in saved.tune ? saved.tune[t.name] : t.value;
    document.title = `${cfg.title || "Theme"} mockup`;
    document.body.prepend(el(`<header class="mk-bar">
      <h1>${cfg.title || "Theme"}: mockup</h1>
      <div class="mk-tabs">${cfg.options.map((o) => `<button type="button" data-id="${o.id}">${o.label || o.id}</button>`).join("")}</div>
      <label>Variant <select id="mk-variant">${cfg.variants.map((v) => `<option>${v}</option>`).join("")}${cfg.variants.length > 1 ? '<option value="all">all variants</option>' : ""}</select></label>
      <label><input type="checkbox" id="mk-band"> To line band</label>
      <label><input type="checkbox" id="mk-new" checked> "New" mark</label>
      <label>Thinking <select id="mk-thinking"><option value="1200">1.2s</option><option value="2500" selected>2.5s</option><option value="6000">6s</option></select></label>
    </header>`));
    if (!$("#mk-app")) document.body.append(el('<main id="mk-app"></main>'));
    document.querySelectorAll(".mk-tabs button").forEach((b) => b.addEventListener("click", () => { applyOption(b.dataset.id); save(); render(); }));
    $("#mk-variant").addEventListener("change", (e) => { state.variant = e.target.value; render(); });
    $("#mk-band").addEventListener("change", (e) => { state.band = e.target.checked; render(); });
    $("#mk-new").addEventListener("change", (e) => { state.showNew = e.target.checked; });
    $("#mk-thinking").addEventListener("change", (e) => { state.thinking = Number(e.target.value); });
    applyOption(saved.option || cfg.options[0].id);
    render();
  }

  window.MockupKit = { start };
})();

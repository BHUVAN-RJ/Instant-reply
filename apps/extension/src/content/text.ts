/**
 * innerText only honours CSS (hidden preheaders, line breaks) on rendered nodes,
 * so render the node offscreen, read it, and remove it again.
 */
export function renderedText(node: Node): string {
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;opacity:0;pointer-events:none;";
  holder.append(node);
  document.body.append(holder);
  const text = holder.innerText;
  holder.remove();
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

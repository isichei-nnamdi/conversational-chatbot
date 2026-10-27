import React from "react";

// A tiny, safe subset: paragraphs, "- " bullets and **bold** and _italic_. Never raw HTML.
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|(?<![\w])_[^_]+_(?![\w]))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith("_") && part.endsWith("_")) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function Prose({ text }) {
  const blocks = [];
  let list = null;
  for (const line of String(text).split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      if (!list) blocks.push((list = { ul: [] }));
      list.ul.push(bullet[1]);
    } else {
      list = null;
      if (line.trim()) blocks.push({ p: line.trim() });
    }
  }
  return blocks.map((b, i) =>
    b.ul ? (
      <ul key={i}>{b.ul.map((li, j) => <li key={j}>{inline(li)}</li>)}</ul>
    ) : (
      <p key={i}>{inline(b.p)}</p>
    ),
  );
}

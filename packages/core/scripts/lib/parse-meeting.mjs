const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseMeetingFile(raw) {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    return null;
  }

  const [, frontmatterBlock, body] = match;
  const fields = {};

  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim().replace(/^"(.*)"$/, '$1');
    fields[key] = value;
  }

  return { ...fields, body: body.trim() };
}

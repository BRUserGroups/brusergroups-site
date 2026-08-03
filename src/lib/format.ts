export function formatDateTime(value: string | Date | null) {
  if (!value) {
    return 'Date to be announced';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date to be announced';
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago'
  }).format(date);
}

export function stripMarkdown(text: string, maxLength = 220): string {
  const plain = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/[*_`#>~]+/g, '')               // bold, italic, code, headers
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLength ? plain.slice(0, maxLength).replace(/\s\S*$/, '') + '…' : plain;
}

export function formatDate(value: string | Date | null) {
  if (!value) return 'Date TBD';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date TBD';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}
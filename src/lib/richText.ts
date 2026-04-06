const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toRenderableRichText(value: string) {
  if (!value.trim()) {
    return '';
  }

  if (HTML_TAG_PATTERN.test(value)) {
    return value;
  }

  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

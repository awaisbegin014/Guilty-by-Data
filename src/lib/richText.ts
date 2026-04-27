const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);
const ALLOWED_GLOBAL_ATTRIBUTES = new Set(['class']);
const ALLOWED_ATTRIBUTES_BY_TAG: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeUrl(value: string) {
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function isAllowedAttribute(tagName: string, attributeName: string) {
  if (attributeName.startsWith('on') || attributeName === 'style') {
    return false;
  }

  return ALLOWED_GLOBAL_ATTRIBUTES.has(attributeName)
    || Boolean(ALLOWED_ATTRIBUTES_BY_TAG[tagName]?.has(attributeName));
}

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent ?? '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tagName)) {
    const fragment = document.createDocumentFragment();
    for (const child of Array.from(element.childNodes)) {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) {
        fragment.appendChild(sanitizedChild);
      }
    }

    return fragment;
  }

  const sanitizedElement = document.createElement(tagName);
  for (const attribute of Array.from(element.attributes)) {
    const attributeName = attribute.name.toLowerCase();
    const attributeValue = attribute.value.trim();

    if (!isAllowedAttribute(tagName, attributeName)) {
      continue;
    }

    if (attributeName === 'href' && !isSafeUrl(attributeValue)) {
      continue;
    }

    sanitizedElement.setAttribute(attributeName, attributeValue);
  }

  if (tagName === 'a') {
    sanitizedElement.setAttribute('rel', 'noopener noreferrer');
  }

  for (const child of Array.from(element.childNodes)) {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      sanitizedElement.appendChild(sanitizedChild);
    }
  }

  return sanitizedElement;
}

function sanitizeHtml(value: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return escapeHtml(value);
  }

  const template = document.createElement('template');
  template.innerHTML = value;
  const sanitized = document.createElement('div');

  for (const child of Array.from(template.content.childNodes)) {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      sanitized.appendChild(sanitizedChild);
    }
  }

  return sanitized.innerHTML;
}

export function toRenderableRichText(value: string) {
  if (!value.trim()) {
    return '';
  }

  if (HTML_TAG_PATTERN.test(value)) {
    return sanitizeHtml(value);
  }

  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

/**
 * Normalize chat message text for storage and retrieval.
 * Stores plain text with newlines and indentation preserved (not raw HTML).
 */

const MAX_MESSAGE_LENGTH = Number(process.env.MAX_MESSAGE_LENGTH) || 10000;

const HTML_ENTITY_MAP = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

function decodeBasicEntities(text) {
  return text.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, (match) => {
    const key = match.toLowerCase();
    return Object.prototype.hasOwnProperty.call(HTML_ENTITY_MAP, key)
      ? HTML_ENTITY_MAP[key]
      : match;
  });
}

function htmlToPlainText(html) {
  let text = String(html);
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeBasicEntities(text);
  return text;
}

/**
 * Prepare message body for PostgreSQL TEXT column:
 * - normalize line endings to \n
 * - convert accidental HTML to plain text (paragraphs / line breaks kept)
 * - trim only leading/trailing whitespace on the whole message
 * - reject over-length content
 */
function normalizeMessageText(raw) {
  if (raw == null) return '';
  let text = String(raw);
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = htmlToPlainText(text);
  }

  text = text.replace(/^\s+|\s+$/g, '');

  if (text.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    err.code = 'MESSAGE_TOO_LONG';
    throw err;
  }

  return text;
}

function hasMessageContent(text) {
  return typeof text === 'string' && text.replace(/\s/g, '').length > 0;
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  normalizeMessageText,
  hasMessageContent,
};

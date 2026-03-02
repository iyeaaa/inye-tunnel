/**
 * Markdown Renderer Utility
 *
 * Renders markdown content to sanitized HTML using marked + DOMPurify + highlight.js.
 * Used by the file browser to render markdown file previews.
 */
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { Marked } from 'marked';
import { createLogger } from './logger.js';

const logger = createLogger('markdown-renderer');

// Register highlight.js languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('java', java);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('diff', diff);

logger.debug('highlight.js languages registered');

// Configure marked with GFM and highlight.js
const markedInstance = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }: { text: string; lang?: string }): string {
      const language = lang && hljs.getLanguage(lang) ? lang : null;
      let highlighted: string;
      if (language) {
        logger.debug(`highlighting code block with language: ${language}`);
        highlighted = hljs.highlight(text, { language }).value;
      } else {
        logger.debug('code block has no recognized language, using auto-detect');
        highlighted = hljs.highlightAuto(text).value;
      }
      const langClass = language ? ` class="language-${language}"` : '';
      return `<pre><code${langClass}>${highlighted}</code></pre>`;
    },
  },
});

// Configure DOMPurify: allow standard HTML tags and class attributes, strip dangerous content
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'ins',
    'a',
    'img',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'div',
    'span',
    'input',
    'details',
    'summary',
    'sup',
    'sub',
  ],
  ALLOWED_ATTR: [
    'class',
    'href',
    'src',
    'alt',
    'title',
    'target',
    'rel',
    'type',
    'checked',
    'disabled',
    'id',
    'width',
    'height',
    'align',
    'colspan',
    'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
};

/**
 * Render markdown content to sanitized HTML.
 *
 * Parses the markdown with marked (GFM enabled, highlight.js for code blocks),
 * then sanitizes the output with DOMPurify to prevent XSS.
 *
 * @param content - Raw markdown string
 * @returns Sanitized HTML string
 */
export function renderMarkdown(content: string): string {
  logger.debug(`renderMarkdown called, content length: ${content.length}`);

  const rawHtml = markedInstance.parse(content);
  if (typeof rawHtml !== 'string') {
    throw new Error('marked returned a Promise unexpectedly; async mode is not supported here');
  }
  logger.debug(`marked parsing complete, raw HTML length: ${rawHtml.length}`);

  const sanitizedHtml = DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
  logger.debug(`DOMPurify sanitization complete, sanitized HTML length: ${sanitizedHtml.length}`);

  return sanitizedHtml;
}

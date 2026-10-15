import { sanitizeRichHtml, sanitizePlainText, ALLOWED_RICH_TAGS } from './sanitize.util';

describe('Sanitization Utilities', () => {
  describe('sanitizeRichHtml', () => {
    it('returns null for null, and undefined for undefined', () => {
      expect(sanitizeRichHtml(null)).toBeNull();
      expect(sanitizeRichHtml(undefined)).toBeUndefined();
    });

    it('returns empty string for empty or whitespace-only input', () => {
      expect(sanitizeRichHtml('')).toBe('');
      expect(sanitizeRichHtml('   ')).toBe('');
    });

    it('preserves valid semantic HTML and rich formatting tags', () => {
      const richContent = [
        '<h1>Heading 1</h1>',
        '<h2>Heading 2</h2>',
        '<p>This is <strong>bold</strong> and <em>italic</em> and <u>underlined</u>.</p>',
        '<blockquote>A wise quote</blockquote>',
        '<ul><li>Item 1</li><li>Item 2</li></ul>',
        '<ol><li>Step 1</li></ol>',
        '<pre><code>const a = 1;</code></pre>',
        '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>',
        '<hr />',
      ].join('');

      const sanitized = sanitizeRichHtml(richContent);
      expect(sanitized).toBe(richContent);
    });

    it('completely removes malicious <script> tags and their contents', () => {
      const dirty = '<p>Safe text</p><script>alert("hacked")</script>';
      const cleaned = sanitizeRichHtml(dirty);
      expect(cleaned).toBe('<p>Safe text</p>');
      expect(cleaned).not.toContain('script');
      expect(cleaned).not.toContain('hacked');
    });

    it('strips iframes, objects, and embeds', () => {
      const dirty = '<p>Video:</p><iframe src="https://evil.com"></iframe><embed src="malware.swf">';
      const cleaned = sanitizeRichHtml(dirty);
      expect(cleaned).toBe('<p>Video:</p>');
    });

    it('strips inline event handlers (onerror, onload, onclick, onmouseover)', () => {
      const dirty = '<img src="x" onerror="alert(1)"><p onclick="stealData()" onmouseover="run()">Click</p>';
      const cleaned = sanitizeRichHtml(dirty);
      expect(cleaned).toBe('<p>Click</p>');
      expect(cleaned).not.toContain('onclick');
      expect(cleaned).not.toContain('onerror');
      expect(cleaned).not.toContain('onmouseover');
    });

    it('discards disallowed tag attributes', () => {
      const dirty = '<h2 style="color:red;" class="danger" id="title">Module Title</h2>';
      const cleaned = sanitizeRichHtml(dirty);
      expect(cleaned).toBe('<h2>Module Title</h2>');
    });
  });

  describe('sanitizePlainText', () => {
    it('returns null for null, and undefined for undefined', () => {
      expect(sanitizePlainText(null)).toBeNull();
      expect(sanitizePlainText(undefined)).toBeUndefined();
    });

    it('returns empty string for empty or whitespace-only input', () => {
      expect(sanitizePlainText('')).toBe('');
      expect(sanitizePlainText('   ')).toBe('');
    });

    it('strips all HTML tags and collapses spaces', () => {
      const input = '  <b>Course</b>  <i>Title</i>   with <script>bad()</script> extra   spaces  ';
      const result = sanitizePlainText(input);
      expect(result).toBe('Course Title with extra spaces');
    });

    it('decodes entities correctly', () => {
      const input = 'Safety &amp; Compliance &lt;Law &gt; &#39;MoR&#39; &quot;Guide&quot;';
      const result = sanitizePlainText(input);
      expect(result).toBe('Safety & Compliance <Law > \'MoR\' "Guide"');
    });
  });
});

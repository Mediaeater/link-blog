import { describe, test, expect } from 'vitest';
import {
  suggestTagsFromUrl,
  validateTag,
  suggestTagCompletions,
  getRelatedTags,
} from '../src/utils/tagSuggestions.js';

// --- suggestTagsFromUrl ---

describe('suggestTagsFromUrl', () => {
  describe('domain mapping', () => {
    test.each([
      ['https://github.com/user/repo', ['github', 'open-source', 'code']],
      ['https://dev.to/post/something', ['article', 'blog', 'dev-community']],
      ['https://news.ycombinator.com/item?id=123', ['hackernews', 'tech-news']],
      ['https://stackoverflow.com/questions/123', ['stackoverflow', 'programming', 'help']],
      ['https://www.youtube.com/watch?v=abc', ['video', 'youtube']],
    ])('maps %s to include %j', (url, expectedTags) => {
      const result = suggestTagsFromUrl(url);
      for (const tag of expectedTags) {
        expect(result).toContain(tag);
      }
    });
  });

  describe('path analysis', () => {
    test.each([
      ['https://example.com/blog/my-post', 'blog'],
      ['https://example.com/tutorial/react', 'tutorial'],
      ['https://example.com/docs/api', 'documentation'],
      ['https://example.com/documentation/ref', 'documentation'],
      ['https://example.com/api/v2/users', 'api'],
      ['https://example.com/guide/setup', 'guide'],
      ['https://example.com/demo/widget', 'demo'],
      ['https://example.com/reference/classes', 'reference'],
    ])('detects %s -> %s', (url, expectedTag) => {
      const result = suggestTagsFromUrl(url);
      expect(result).toContain(expectedTag);
    });
  });

  describe('keyword extraction from title/description', () => {
    test('detects programming keywords in title', () => {
      const result = suggestTagsFromUrl(
        'https://example.com/post',
        'Building a React app with TypeScript',
      );
      expect(result).toContain('react');
      expect(result).toContain('typescript');
    });

    test('detects tutorial phrases', () => {
      const result = suggestTagsFromUrl(
        'https://example.com/post',
        'How to deploy a Node app',
      );
      expect(result).toContain('tutorial');
    });

    test('detects news phrases', () => {
      const result = suggestTagsFromUrl(
        'https://example.com/post',
        'Breaking: Major announcement from tech company',
      );
      expect(result).toContain('news');
    });
  });

  describe('file extension detection', () => {
    test.each([
      ['https://example.com/file.pdf', 'pdf'],
      ['https://example.com/clip.mp4', 'video'],
      ['https://example.com/song.mp3', 'audio'],
      ['https://example.com/archive.zip', 'download'],
    ])('detects %s -> %s', (url, expectedTag) => {
      const result = suggestTagsFromUrl(url);
      expect(result).toContain(expectedTag);
    });
  });

  describe('content pattern matching', () => {
    test('detects tips/best practices', () => {
      const result = suggestTagsFromUrl(
        'https://example.com',
        '10 best practices for writing clean code',
      );
      expect(result).toContain('tips');
    });

    test('detects free/open source', () => {
      const result = suggestTagsFromUrl(
        'https://example.com',
        'A free open source alternative',
      );
      expect(result).toContain('free');
    });
  });

  describe('edge cases', () => {
    test('handles invalid URL gracefully', () => {
      const result = suggestTagsFromUrl('not-a-url');
      expect(result).toEqual([]);
    });

    test('handles empty string', () => {
      const result = suggestTagsFromUrl('');
      expect(result).toEqual([]);
    });

    test('limits to 8 tags max', () => {
      // YouTube URL + many keywords should generate lots of tags
      const result = suggestTagsFromUrl(
        'https://youtube.com/watch?v=abc',
        'React JavaScript TypeScript tutorial guide for machine learning AI',
      );
      expect(result.length).toBeLessThanOrEqual(8);
    });

    test('returns array for URL with no matches', () => {
      const result = suggestTagsFromUrl('https://unknown-domain.xyz/page');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// --- validateTag ---

describe('validateTag', () => {
  describe('valid tags', () => {
    test.each([
      ['javascript', 'javascript'],
      ['  JavaScript  ', 'javascript'],
      ['web-development', 'web-development'],
      ['react_hooks', 'react_hooks'],
      ['css3', 'css3'],
    ])('cleans %s -> %s', (input, expected) => {
      expect(validateTag(input)).toBe(expected);
    });
  });

  describe('special character cleaning', () => {
    test.each([
      ['hello world', 'hello-world'],
      ['c++lang', 'c-lang'],
      ['node.js', 'node-js'],
      ['foo---bar', 'foo-bar'],
      ['--leading--', 'leading'],
    ])('cleans %s -> %s', (input, expected) => {
      expect(validateTag(input)).toBe(expected);
    });
  });

  describe('invalid inputs', () => {
    test.each([
      [null, null],
      [undefined, null],
      ['', null],
      ['a', null], // too short
      [123, null], // not a string
      ['  ', null], // whitespace only -> empty after trim
    ])('rejects %s -> null', (input, expected) => {
      expect(validateTag(input)).toBe(expected);
    });
  });

  describe('length limits', () => {
    test('accepts tag with 30 chars', () => {
      const tag = 'a'.repeat(30);
      expect(validateTag(tag)).toBe(tag);
    });

    test('rejects tag over 30 chars', () => {
      const tag = 'a'.repeat(31);
      expect(validateTag(tag)).toBeNull();
    });

    test('rejects tag that becomes too short after cleaning', () => {
      expect(validateTag('!@')).toBeNull();
    });

    test('rejects c++ (single char after stripping)', () => {
      expect(validateTag('c++')).toBeNull();
    });
  });
});

// --- suggestTagCompletions ---

describe('suggestTagCompletions', () => {
  const existingTags = ['react', 'react-hooks', 'redux', 'ruby', 'rust'];

  test('matches prefix from existing tags', () => {
    const result = suggestTagCompletions('rea', existingTags);
    expect(result).toContain('react');
    expect(result).toContain('react-hooks');
    expect(result).not.toContain('redux');
  });

  test('matches prefix from COMMON_TAGS', () => {
    const result = suggestTagCompletions('java', []);
    expect(result).toContain('javascript');
  });

  test('prioritizes exact match', () => {
    const result = suggestTagCompletions('react', existingTags);
    expect(result[0]).toBe('react');
  });

  test('sorts shorter matches before longer ones', () => {
    const result = suggestTagCompletions('re', existingTags);
    const reactIndex = result.indexOf('react');
    const hooksIndex = result.indexOf('react-hooks');
    if (reactIndex !== -1 && hooksIndex !== -1) {
      expect(reactIndex).toBeLessThan(hooksIndex);
    }
  });

  test('limits to 10 results', () => {
    // Use a prefix that matches many COMMON_TAGS
    const result = suggestTagCompletions('a', []);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  test('returns empty for empty input', () => {
    expect(suggestTagCompletions('', existingTags)).toEqual([]);
  });

  test('deduplicates between existing and common tags', () => {
    // 'react' is in both existingTags and COMMON_TAGS
    const result = suggestTagCompletions('react', existingTags);
    const reactCount = result.filter((t) => t === 'react').length;
    expect(reactCount).toBe(1);
  });
});

// --- getRelatedTags ---

describe('getRelatedTags', () => {
  const links = [
    { tags: ['react', 'javascript', 'frontend'] },
    { tags: ['react', 'typescript', 'frontend'] },
    { tags: ['react', 'nodejs', 'backend'] },
    { tags: ['python', 'machine-learning', 'data-science'] },
    { tags: ['javascript', 'nodejs', 'backend'] },
  ];

  test('finds co-occurring tags sorted by frequency', () => {
    const result = getRelatedTags(['react'], links);
    // 'frontend' co-occurs with react twice, 'javascript' once, etc.
    expect(result[0]).toBe('frontend');
    expect(result).toContain('javascript');
    expect(result).toContain('typescript');
    expect(result).toContain('nodejs');
  });

  test('excludes current tags from results', () => {
    const result = getRelatedTags(['react'], links);
    expect(result).not.toContain('react');
  });

  test('limits to 5 results', () => {
    const result = getRelatedTags(['react'], links);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  test('returns empty for empty currentTags', () => {
    expect(getRelatedTags([], links)).toEqual([]);
  });

  test('returns empty for empty allLinks', () => {
    expect(getRelatedTags(['react'], [])).toEqual([]);
  });

  test('returns empty when no co-occurrences exist', () => {
    const isolatedLinks = [{ tags: ['solo'] }];
    expect(getRelatedTags(['solo'], isolatedLinks)).toEqual([]);
  });

  test('handles links with fewer than 2 tags', () => {
    const sparseLinks = [
      { tags: ['react'] },
      { tags: ['react', 'javascript'] },
    ];
    const result = getRelatedTags(['react'], sparseLinks);
    expect(result).toEqual(['javascript']);
  });
});

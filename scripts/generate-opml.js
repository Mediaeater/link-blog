import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Escapes special XML characters
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates OPML 2.0 format blogroll from links.json
 */
const generateOPML = async () => {
  // Read links.json
  const linksPath = path.join(__dirname, '../data/links.json');
  const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  // Get current date in RFC-822 format
  const now = new Date();
  const dateCreated = now.toUTCString();

  // Organize links by tags
  const linksByTag = new Map();
  const untaggedLinks = [];

  linksData.links.forEach(link => {
    if (link.tags && link.tags.length > 0) {
      link.tags.forEach(tag => {
        if (!linksByTag.has(tag)) {
          linksByTag.set(tag, []);
        }
        linksByTag.get(tag).push(link);
      });
    } else {
      untaggedLinks.push(link);
    }
  });

  // Sort tags alphabetically
  const sortedTags = Array.from(linksByTag.keys()).sort();

  // Start building OPML
  let opml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  opml += '<opml version="2.0">\n';
  opml += '  <head>\n';
  opml += '    <title>Mediaeater Digest - Blogroll</title>\n';
  opml += `    <dateCreated>${dateCreated}</dateCreated>\n`;
  opml += `    <dateModified>${dateCreated}</dateModified>\n`;
  opml += '    <ownerName>Mediaeater</ownerName>\n';
  opml += '    <ownerEmail>mediaeater@example.com</ownerEmail>\n';
  opml += '    <docs>http://opml.org/spec2.opml</docs>\n';
  opml += '  </head>\n';
  opml += '  <body>\n';

  // Add tagged links organized by category
  sortedTags.forEach(tag => {
    const links = linksByTag.get(tag);
    opml += `    <outline text="${escapeXml(tag)}" title="${escapeXml(tag)}">\n`;

    links.forEach(link => {
      const title = escapeXml(link.source || 'Untitled');
      const url = escapeXml(link.url);
      const description = escapeXml(link.pullQuote || '');
      const created = link.timestamp ? new Date(link.timestamp).toUTCString() : dateCreated;

      opml += `      <outline `;
      opml += `type="link" `;
      opml += `text="${title}" `;
      opml += `title="${title}" `;
      opml += `url="${url}" `;
      opml += `htmlUrl="${url}" `;
      if (description) {
        opml += `description="${description}" `;
      }
      opml += `created="${created}" `;
      if (link.tags && link.tags.length > 0) {
        opml += `category="${escapeXml(link.tags.join(','))}" `;
      }
      if (link.isPinned) {
        opml += `isPinned="true" `;
      }
      if (link.visits) {
        opml += `visits="${link.visits}" `;
      }
      opml += `/>\n`;
    });

    opml += `    </outline>\n`;
  });

  // Add untagged links if any exist
  if (untaggedLinks.length > 0) {
    opml += `    <outline text="Uncategorized" title="Uncategorized">\n`;

    untaggedLinks.forEach(link => {
      const title = escapeXml(link.source || 'Untitled');
      const url = escapeXml(link.url);
      const description = escapeXml(link.pullQuote || '');
      const created = link.timestamp ? new Date(link.timestamp).toUTCString() : dateCreated;

      opml += `      <outline `;
      opml += `type="link" `;
      opml += `text="${title}" `;
      opml += `title="${title}" `;
      opml += `url="${url}" `;
      opml += `htmlUrl="${url}" `;
      if (description) {
        opml += `description="${description}" `;
      }
      opml += `created="${created}" `;
      if (link.isPinned) {
        opml += `isPinned="true" `;
      }
      if (link.visits) {
        opml += `visits="${link.visits}" `;
      }
      opml += `/>\n`;
    });

    opml += `    </outline>\n`;
  }

  opml += '  </body>\n';
  opml += '</opml>\n';

  // Write OPML file to public/data/
  const opmlPath = path.join(__dirname, '../public/data/blogroll.opml');

  // Ensure directory exists
  const opmlDir = path.dirname(opmlPath);
  if (!fs.existsSync(opmlDir)) {
    fs.mkdirSync(opmlDir, { recursive: true });
  }

  fs.writeFileSync(opmlPath, opml, 'utf8');

  console.log(`✓ OPML blogroll generated successfully at ${opmlPath}`);
  console.log(`  Total links: ${linksData.links.length}`);
  console.log(`  Categories: ${sortedTags.length}`);
  console.log(`  Untagged: ${untaggedLinks.length}`);
};

generateOPML().catch(console.error);

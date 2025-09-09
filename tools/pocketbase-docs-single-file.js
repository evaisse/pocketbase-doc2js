const { chromium } = require('playwright');
const TurndownService = require('turndown');
const fs = require('fs').promises;
const path = require('path');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'indented'  // Use indented code blocks
});

// Handle div.code-wrapper elements
turndownService.addRule('codeWrapper', {
  filter: function(node) {
    return node.nodeName === 'DIV' && node.classList && node.classList.contains('code-wrapper');
  },
  replacement: function(content, node) {
    const codeText = node.innerText || node.textContent || '';
    if (!codeText.trim()) return '';
    // Convert to indented code block with 4 spaces per line, preserving empty lines
    const lines = codeText.split('\n');
    const indentedCode = lines.map(line => '    ' + line).join('\n');
    return '\n\n' + indentedCode + '\n\n';
  }
});

// Handle pre elements (convert to indented code blocks)
turndownService.addRule('preElements', {
  filter: 'pre',
  replacement: function(content, node) {
    // Use innerHTML to preserve line breaks, then decode HTML entities
    let html = node.innerHTML;
    if (!html.trim()) return '';
    
    // Decode HTML entities while preserving line breaks
    const textWithLineBreaks = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&');
    
    // Convert to indented code block with 4 spaces per line
    const lines = textWithLineBreaks.split('\n');
    const indentedCode = lines.map(line => '    ' + line).join('\n');
    return '\n\n' + indentedCode + '\n\n';
  }
});

// Override default code block handling to use indented style
turndownService.addRule('codeBlocks', {
  filter: function (node) {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild &&
      node.firstChild.nodeName === 'CODE'
    )
  },
  replacement: function (content, node) {
    const codeElement = node.firstChild;
    // Use innerHTML to preserve line breaks, then decode HTML entities
    let html = codeElement.innerHTML;
    if (!html.trim()) return '';
    
    // Decode HTML entities while preserving line breaks
    const textWithLineBreaks = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&');
    
    // Convert to indented code block with 4 spaces per line
    const lines = textWithLineBreaks.split('\n');
    const indentedCode = lines.map(line => '    ' + line).join('\n');
    return '\n\n' + indentedCode + '\n\n';
  }
});

// Add rule to convert PocketBase links to internal anchors
turndownService.addRule('pocketbaseLinks', {
  filter: function(node) {
    return node.nodeName === 'A' && node.getAttribute('href');
  },
  replacement: function(content, node) {
    let href = node.getAttribute('href');
    
    // Convert PocketBase JS documentation links to internal anchors
    if (href) {
      // Match absolute URLs
      const absoluteMatch = href.match(/^https?:\/\/pocketbase\.io\/docs\/(js-[^\/\#]*)/);
      if (absoluteMatch) {
        href = `#${absoluteMatch[1]}`;
      }
      // Match relative URLs
      else if (href.startsWith('/docs/js-')) {
        const relativeMatch = href.match(/^\/docs\/(js-[^\/\#]*)/);
        if (relativeMatch) {
          href = `#${relativeMatch[1]}`;
        }
      }
      // Convert hash links within the same page
      else if (href.startsWith('#')) {
        // Keep as is, but we might need to prefix with section ID
        href = href;
      }
    }
    
    // Return markdown link
    return '[' + content + '](' + href + ')';
  }
});

async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
  }
}

async function extractPageContent(page, sectionId) {
  return await page.evaluate((sectionId) => {
    const contentElement = document.querySelector('.page-content');
    if (!contentElement) return null;

    // Convert div.code-wrapper to proper pre elements with preserved formatting
    const codeWrappers = contentElement.querySelectorAll('div.code-wrapper');
    codeWrappers.forEach(wrapper => {
      const pre = document.createElement('pre');
      const codeElement = wrapper.querySelector('code');
      if (codeElement) {
        // Extract text while preserving line breaks
        let codeText = codeElement.innerText || codeElement.textContent || '';
        pre.textContent = codeText;
      } else {
        // Fallback to wrapper content
        pre.textContent = wrapper.innerText || wrapper.textContent || '';
      }
      wrapper.replaceWith(pre);
    });

    // Update internal hash links to include section prefix
    const hashLinks = contentElement.querySelectorAll('a[href^="#"]');
    hashLinks.forEach(link => {
      const originalHref = link.getAttribute('href');
      if (originalHref && originalHref.startsWith('#')) {
        // Prefix with section ID to make anchors unique across the document
        link.setAttribute('href', `#${sectionId}-${originalHref.substring(1)}`);
      }
    });

    // Update heading IDs to include section prefix
    const headings = contentElement.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    headings.forEach(heading => {
      const originalId = heading.getAttribute('id');
      if (originalId) {
        heading.setAttribute('id', `${sectionId}-${originalId}`);
      }
    });

    return contentElement.innerHTML;
  }, sectionId);
}

async function crawlPage(browser, url, sectionId) {
  const page = await browser.newPage();
  try {
    console.log(`Crawling: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const content = await extractPageContent(page, sectionId);
    if (content) {
      return turndownService.turndown(content);
    } else {
      console.log(`No content found at ${url}`);
      return null;
    }
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return null;
  } finally {
    await page.close();
  }
}

async function findJsDocLinks(page) {
  return await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    const uniqueUrls = new Set();
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const fullUrl = new URL(href, window.location.origin).href;
        if (fullUrl.includes('/docs/js-') && fullUrl !== 'https://pocketbase.io/docs/js-overview/') {
          uniqueUrls.add(fullUrl);
        }
      }
    });
    
    return Array.from(uniqueUrls);
  });
}

function generateTableOfContents(sections) {
  let toc = '# Table of Contents\n\n';
  
  sections.forEach((section, index) => {
    const indent = index === 0 ? '' : '  ';
    toc += `${indent}- [${section.title}](#${section.id})\n`;
  });
  
  return toc + '\n';
}

async function main() {
  await ensureDirectory('./jsdocs');
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    const mainUrl = 'https://pocketbase.io/docs/js-overview/';
    const mainPage = await browser.newPage();
    
    console.log('Starting crawl of PocketBase JS documentation...');
    await mainPage.goto(mainUrl, { waitUntil: 'networkidle' });
    
    // Collect all pages to crawl
    const sections = [
      { id: 'js-overview', url: mainUrl, title: 'JavaScript SDK Overview' }
    ];
    
    const jsDocLinks = await findJsDocLinks(mainPage);
    console.log(`Found ${jsDocLinks.length} JS documentation pages`);
    
    // Map URLs to section info
    const sectionTitles = {
      'js-event-hooks': 'Event Hooks',
      'js-routing': 'Routing',
      'js-database': 'Database',
      'js-records': 'Record Operations',
      'js-collections': 'Collection Operations',
      'js-migrations': 'Migrations',
      'js-jobs-scheduling': 'Jobs Scheduling',
      'js-sending-emails': 'Sending Emails',
      'js-rendering-templates': 'Rendering Templates',
      'js-console-commands': 'Console Commands',
      'js-sending-http-requests': 'Sending HTTP Requests',
      'js-realtime': 'Realtime Messaging',
      'js-filesystem': 'Filesystem',
      'js-logging': 'Logging'
    };
    
    for (const link of jsDocLinks) {
      const pageName = link.match(/\/docs\/(js-[^\/]*)/)?.[1];
      if (pageName && pageName !== 'js-overview') {
        sections.push({
          id: pageName,
          url: link,
          title: sectionTitles[pageName] || pageName
        });
      }
    }
    
    // Sort sections in a logical order
    const sectionOrder = [
      'js-overview',
      'js-event-hooks',
      'js-routing',
      'js-database',
      'js-records',
      'js-collections',
      'js-migrations',
      'js-jobs-scheduling',
      'js-sending-emails',
      'js-rendering-templates',
      'js-console-commands',
      'js-sending-http-requests',
      'js-realtime',
      'js-filesystem',
      'js-logging'
    ];
    
    sections.sort((a, b) => {
      const aIndex = sectionOrder.indexOf(a.id);
      const bIndex = sectionOrder.indexOf(b.id);
      return aIndex - bIndex;
    });
    
    // Compile all content
    let fullDocument = '# PocketBase JavaScript SDK Documentation\n\n';
    fullDocument += generateTableOfContents(sections);
    fullDocument += '\n---\n\n';
    
    for (const section of sections) {
      const content = await crawlPage(browser, section.url, section.id);
      if (content) {
        fullDocument += `<a id="${section.id}"></a>\n\n`;
        fullDocument += `# ${section.title}\n\n`;
        fullDocument += content;
        fullDocument += '\n\n---\n\n';
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    await mainPage.close();
    
    // Save the complete document
    const outputPath = path.join('./jsdocs', 'pocketbase-js-sdk-complete.md');
    await fs.writeFile(outputPath, fullDocument, 'utf8');
    console.log(`\nSaved complete documentation to: ${outputPath}`);
    console.log('Crawling completed successfully!');
    
  } catch (error) {
    console.error('Error during crawling:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
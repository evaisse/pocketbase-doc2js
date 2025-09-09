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
    // Convert to indented code block with 4 spaces per line
    const indentedCode = codeText.trim().split('\n').map(line => '    ' + line).join('\n');
    return '\n' + indentedCode + '\n';
  }
});

// Handle pre elements (convert to indented code blocks)
turndownService.addRule('preElements', {
  filter: 'pre',
  replacement: function(content, node) {
    const codeText = node.innerText || node.textContent || '';
    // Convert to indented code block with 4 spaces per line
    const indentedCode = codeText.trim().split('\n').map(line => '    ' + line).join('\n');
    return '\n' + indentedCode + '\n';
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
    const codeText = codeElement.innerText || codeElement.textContent || '';
    // Convert to indented code block with 4 spaces per line
    const indentedCode = codeText.trim().split('\n').map(line => '    ' + line).join('\n');
    return '\n' + indentedCode + '\n';
  }
});

// Add rule to convert PocketBase JS documentation links to relative markdown links
turndownService.addRule('pocketbaseLinks', {
  filter: function(node) {
    return node.nodeName === 'A' && node.getAttribute('href');
  },
  replacement: function(content, node) {
    let href = node.getAttribute('href');
    
    // Convert PocketBase JS documentation links to relative markdown links
    if (href) {
      // Match absolute URLs
      const absoluteMatch = href.match(/^https?:\/\/pocketbase\.io\/docs\/(js-[^\/\#]*)/);
      if (absoluteMatch) {
        href = `./${absoluteMatch[1]}.md`;
      }
      // Match relative URLs
      else if (href.startsWith('/docs/js-')) {
        const relativeMatch = href.match(/^\/docs\/(js-[^\/\#]*)/);
        if (relativeMatch) {
          href = `./${relativeMatch[1]}.md`;
        }
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

async function extractPageContent(page) {
  return await page.evaluate(() => {
    const contentElement = document.querySelector('.page-content');
    if (!contentElement) return null;

    const codeWrappers = contentElement.querySelectorAll('div.code-wrapper');
    codeWrappers.forEach(wrapper => {
      const pre = document.createElement('pre');
      pre.textContent = wrapper.innerText || wrapper.textContent || '';
      wrapper.replaceWith(pre);
    });

    return contentElement.innerHTML;
  });
}

async function saveMarkdown(fileName, content) {
  const markdown = turndownService.turndown(content);
  const filePath = path.join('./jsdocs', fileName);
  await fs.writeFile(filePath, markdown, 'utf8');
  console.log(`Saved: ${filePath}`);
}

async function crawlPage(browser, url, fileName) {
  const page = await browser.newPage();
  try {
    console.log(`Crawling: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const content = await extractPageContent(page);
    if (content) {
      await saveMarkdown(fileName, content);
      return true;
    } else {
      console.log(`No content found at ${url}`);
      return false;
    }
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return false;
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

async function main() {
  await ensureDirectory('./jsdocs');
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    const mainUrl = 'https://pocketbase.io/docs/js-overview/';
    const mainPage = await browser.newPage();
    
    console.log('Starting crawl of PocketBase JS documentation...');
    await mainPage.goto(mainUrl, { waitUntil: 'networkidle' });
    
    const mainContent = await extractPageContent(mainPage);
    if (mainContent) {
      await saveMarkdown('js-overview.md', mainContent);
    }
    
    const jsDocLinks = await findJsDocLinks(mainPage);
    console.log(`Found ${jsDocLinks.length} JS documentation pages`);
    
    for (const link of jsDocLinks) {
      const pageName = link.match(/\/docs\/(js-[^\/]*)/)?.[1];
      if (pageName) {
        await crawlPage(browser, link, `${pageName}.md`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    await mainPage.close();
    console.log('Crawling completed successfully!');
    
  } catch (error) {
    console.error('Error during crawling:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
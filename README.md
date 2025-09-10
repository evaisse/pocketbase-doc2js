# PocketBase Documentation Compiler

A Node.js tool that compiles all PocketBase JavaScript documentation into a single markdown file.

## Features

- Crawls PocketBase JavaScript documentation from https://pocketbase.io/docs/js-overview/
- Extracts page content from `.page-content` div elements
- Converts HTML content to clean markdown format with proper code block formatting
- Handles code blocks by converting `div.code-wrapper` elements to indented code blocks
- Automatically discovers and crawls all JS documentation pages (matching `/docs/js-*/` pattern)
- Compiles all documentation into a single markdown file with table of contents
- Includes caching mechanism to avoid redundant requests (24-hour cache duration)
- Converts internal links to anchors for easy navigation within the single document

## Installation

```bash
npm install
```

## Usage

Run the documentation compiler:

```bash
npm run crawl
```

Force refresh (ignore cache):

```bash
npm run crawl:force
```

## Output

The tool creates a `./jsdocs` directory containing:

- `pocketbase-js-sdk-complete.md` - Complete documentation with all sections combined

The single file includes:
- Table of Contents with links to all sections
- JavaScript SDK overview
- Event hooks documentation
- Routing documentation
- Database operations
- Record management
- Collection management
- Database migrations
- Job scheduling
- Email functionality
- Template rendering
- Console commands
- HTTP requests
- Realtime features
- Filesystem operations
- Logging functionality

## Dependencies

- **playwright** - Browser automation for crawling web pages
- **turndown** - HTML to Markdown converter

## How It Works

1. Launches a headless Chromium browser using Playwright
2. Navigates to the main PocketBase JS documentation page
3. Extracts the main page content and converts it to markdown
4. Finds all links to other JS documentation pages
5. Crawls each page sequentially with a 500ms delay between requests
6. Processes code blocks by extracting innerText from `div.code-wrapper` elements
7. Converts HTML content to markdown using Turndown
8. Saves each page as a separate markdown file

## Script Structure

- `ensureDirectory()` - Creates the output and cache directories if they don't exist
- `extractPageContent()` - Extracts and preprocesses page content from the DOM, handling section IDs for anchors
- `crawlPage()` - Crawls a single documentation page with caching support
- `findJsDocLinks()` - Discovers all JS documentation links on a page
- `generateTableOfContents()` - Creates a table of contents with anchor links
- `getCachedContent()` / `setCachedContent()` - Cache management functions
- `main()` - Orchestrates the entire crawling and compilation process
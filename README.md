# PocketBase Documentation Crawler

A Node.js crawler that scrapes PocketBase JavaScript documentation and converts it to markdown files.

## Features

- Crawls PocketBase JavaScript documentation from https://pocketbase.io/docs/js-overview/
- Extracts page content from `.page-content` div elements
- Converts HTML content to clean markdown format
- Handles code blocks by converting `div.code-wrapper` elements to pre blocks
- Automatically discovers and crawls all JS documentation pages (matching `/docs/js-*/` pattern)
- Saves all documentation as markdown files in the `./jsdocs` directory

## Installation

```bash
npm install
```

## Usage

Run the crawler:

```bash
node tools/pocketbase-docs-crawler.js
```

## Output

The crawler will create a `./jsdocs` directory containing markdown files for each documentation page:

- `js-overview.md` - JavaScript SDK overview
- `js-event-hooks.md` - Event hooks documentation
- `js-routing.md` - Routing documentation
- `js-database.md` - Database operations
- `js-records.md` - Record management
- `js-collections.md` - Collection management
- `js-migrations.md` - Database migrations
- `js-jobs-scheduling.md` - Job scheduling
- `js-sending-emails.md` - Email functionality
- `js-rendering-templates.md` - Template rendering
- `js-console-commands.md` - Console commands
- `js-sending-http-requests.md` - HTTP requests
- `js-realtime.md` - Realtime features
- `js-filesystem.md` - Filesystem operations
- `js-logging.md` - Logging functionality

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

- `ensureDirectory()` - Creates the output directory if it doesn't exist
- `extractPageContent()` - Extracts and preprocesses page content from the DOM
- `saveMarkdown()` - Converts HTML to markdown and saves to file
- `crawlPage()` - Crawls a single documentation page
- `findJsDocLinks()` - Discovers all JS documentation links on a page
- `main()` - Orchestrates the entire crawling process
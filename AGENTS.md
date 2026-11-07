<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Path segments are English words (`/listings`, `/auth/login`, `/owner/properties`). Do not add routes whose segments are Vietnamese (`/tim-nha`, `/tin-dang`). Visible labels can stay Vietnamese.

When the same component is rendered on more than one page, put it in the layout that wraps those pages so navigation does not mount a new copy. Use a route-group layout when only some routes under a segment share it.

## Figma design source

Every new or changed screen follows [rentOS Design - MAIN EM4](https://www.figma.com/design/lQSW9bPS82CPlMnf6Py6GG/rentOS-Design---MAIN-EM4-?node-id=470-1451&m=dev). Before implementing UI, load the Figma design-to-code skill and read the matching frame with `get_design_context`. If the user does not attach a screenshot or a more specific node, open this file, find the screen by name on canvas `470:1451`, and read that frame before implementing UI. Adapt it to the app’s existing components and omit prototype-only controls.

## List reads

A list page loads one page from one endpoint.

Include every column that table shows in that page query. Load related
rows with one `include` filtered by parent id, not a request or query
per row.

Do not walk every page on the server to return the full set to a table.

Filter in the query. Reset to page 1 when the filter changes.

A detail endpoint is for opening one record.

## Code Style & Formatting Rules
- Strictly adhere to a maximum line length of 80 characters for both code and comments.
- Break long method chains, complex conditional statements, and multi-argument function calls onto multiple lines using language-standard indentation (e.g., hanging indents).
- Explicitly inject newline characters (\n) to prevent horizontal scrolling.
- Never let string literals or comments stretch infinitely; use string concatenation or multi-line comment structures.

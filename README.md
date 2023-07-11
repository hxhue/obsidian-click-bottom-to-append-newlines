# Click Bottom to Append New Lines

This plugin allows you to easily add new lines to your document by clicking at the bottom. No configuration is required.

## How does it work?

This plugin registers DOM events to check if a click occurs at the bottom of the page. If the click position goes beyond the last non-empty paragraph and exceeds a distance of two lines (because there should be an empty line between adjacent paragraphs in Markdown), the plugin will insert additional empty lines at the end of the document and move the cursor there.

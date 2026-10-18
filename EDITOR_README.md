# SORI browser-local editor

Open `editor.html`, or the deployed `/editor.html`. No login, server upload or publishing endpoint exists. Drafts and uploaded images are stored only in each browser's IndexedDB. Export JSON for backup, transfer, and Codex review. Do not add GitHub tokens or secrets to this tool.

The public site has no link to the editor. The editor URL is not access control; it contains only the already-public site template. Imported JSON is version/hash checked and restricted to known text/image IDs and validated property values. Arbitrary HTML, scripts, external image URLs and styles cannot be imported.

After changing the canonical index.html, run `node tools/build-editor-template.cjs` before publishing. Keep old draft exports for migration; mismatched template hashes are intentionally rejected rather than silently applying changes to the wrong elements. Importing an unsupported existing IndexedDB draft does not delete it. Exported HTML needs the matching styles.css and current site.js in the same directory. Embedded images are data URLs; OG metadata is not automatically updated.

Do not publish owner drafts or feedback JSON to the repository. User text can alter layout; preview both desktop and mobile before merging exports. Free-position drag-and-drop, authentication and server publication are intentionally out of scope.

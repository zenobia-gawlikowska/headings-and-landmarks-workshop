# Headings & Landmarks — screen reader workshop

Nearly 70% of screen reader users navigate a long page by headings first, and around 30% use landmarks when they are available ([WebAIM Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey10/)). If the page structure is wrong, those users are lost.

This repo is the hands-on material for a workshop on getting it right.

**Live site:** https://zenobia-gawlikowska.github.io/headings-and-landmarks-workshop/

## What's inside

| Page | What it is |
| --- | --- |
| [`index.html`](index.html) | The workshop: why structure matters, heading and landmark rules, how to check your own work, exercises. |
| [`cheatsheet.html`](cheatsheet.html) | NVDA and VoiceOver keys for navigating by headings and landmarks. |
| [`exercises/broken.html`](exercises/broken.html) | A library event page with **broken** headings and landmarks (on purpose). |
| [`exercises/fixed.html`](exercises/fixed.html) | The **same page, same look**, with correct structure. Comments in the source explain each choice. |
| [`exercises/worksheet.html`](exercises/worksheet.html) | Audit checklist for exercise 3. |
| [`exercises/playground.html`](exercises/playground.html) | An HTML editor with live preview and structure report, loaded with the broken page for students to fix. **Full screen** shows the edited page on its own, so screen reader lists contain only its headings and landmarks. |
| [`exercises/answers.html`](exercises/answers.html) | Every problem on the broken page, what the user hears, and the fix. |
| [`assets/inspector.js`](assets/inspector.js) | A small structure inspector: lists headings and landmarks and flags common problems. |

## Exercises

1. **Find it by headings** — on the broken page, then the fixed page, find the Sunday programme, opening hours and accessibility info using only heading navigation.
2. **Find it by landmarks** — jump to the main content, search and footer links using the landmarks list.
3. **Audit the broken page** — fill in the worksheet, then compare with the inspector and the answers.
4. **Fix it in the playground** — edit the broken page's HTML until the structure report is clean, then check the preview with a screen reader.
5. **Audit your own work** — run the inspector and a screen reader's headings list on a page you build.

## Before the session

Make sure you can run a screen reader:

- **Windows:** install [NVDA](https://www.nvaccess.org/download/) (free).
- **macOS:** VoiceOver is built in — turn it on with <kbd>Cmd</kbd>+<kbd>F5</kbd>.

## The structure inspector

Use it on any page:

- **Bookmarklet:** drag the "Page structure" button from the workshop page to your bookmarks bar.
- **Console:** paste the contents of `assets/inspector.js` into DevTools.

It flags missing/multiple `h1`, skipped levels, empty headings, missing `main`, duplicate unlabeled landmarks and content outside landmarks. It's a teaching aid that approximates the accessibility tree — always confirm with a real screen reader.

## Run locally

No build step. Open `index.html` in a browser, or serve the folder (the playground needs a server):

```bash
python3 -m http.server 8000
```

## License

MIT

/*
 * Headings & Landmarks Inspector
 *
 * Shows the page the way a screen reader user "skims" it: as a list of
 * headings and a list of landmarks, with common problems flagged.
 *
 * Use it three ways:
 *   1. It runs automatically on the demo pages (toggle with the button).
 *   2. As a bookmarklet on any page (see index.html).
 *   3. Paste this file into the DevTools console.
 *
 * Add data-hl-ignore to any element the scan should skip.
 *
 * It is a teaching aid, not a full accessibility checker. It approximates
 * the accessibility tree; always confirm with a real screen reader.
 */
(function () {
  "use strict";

  var ROOT_ATTR = "data-hl-inspector";
  var existing = document.querySelector("div[" + ROOT_ATTR + "]");
  if (existing) {
    // Running the bookmarklet twice toggles the panel.
    existing.hidden = !existing.hidden;
    return;
  }

  // ---------- helpers ----------

  function isHidden(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n.hasAttribute(ROOT_ATTR) || n.hasAttribute("data-hl-ignore")) return true;
      if (n.hidden || n.getAttribute("aria-hidden") === "true") return true;
      var cs = (n.ownerDocument.defaultView || window).getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return true;
    }
    return false;
  }

  function textOf(el) {
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function accessibleName(el) {
    var ids = el.getAttribute("aria-labelledby");
    if (ids) {
      var parts = ids.split(/\s+/).map(function (id) {
        var ref = el.ownerDocument.getElementById(id);
        return ref ? textOf(ref) : "";
      });
      var joined = parts.join(" ").trim();
      if (joined) return joined;
    }
    var label = el.getAttribute("aria-label");
    if (label && label.trim()) return label.trim();
    if (el.tagName === "IMG") return (el.getAttribute("alt") || "").trim();
    return "";
  }

  function headingName(el) {
    // Headings take their name from content (incl. img alt) unless labelled.
    var explicit = accessibleName(el);
    if (explicit) return explicit;
    var out = "";
    (function walk(node) {
      node.childNodes.forEach(function (c) {
        if (c.nodeType === 3) out += c.nodeValue;
        else if (c.nodeType === 1 && !isHidden(c)) {
          if (c.tagName === "IMG") out += " " + (c.getAttribute("alt") || "") + " ";
          else walk(c);
        }
      });
    })(el);
    return out.replace(/\s+/g, " ").trim();
  }

  var SECTIONING = "article, aside, main, nav, section";

  // Map an element to its landmark role, or null if it is not a landmark.
  function landmarkRole(el) {
    var role = (el.getAttribute("role") || "").trim().split(/\s+/)[0];
    var named = !!accessibleName(el);
    if (role) {
      if (["banner", "navigation", "main", "complementary", "contentinfo", "search"].indexOf(role) > -1) return role;
      if ((role === "region" || role === "form") && named) return role;
      return null;
    }
    switch (el.tagName) {
      case "MAIN": return "main";
      case "NAV": return "navigation";
      case "ASIDE": return "complementary";
      case "SEARCH": return "search";
      case "HEADER": return el.parentElement && el.parentElement.closest(SECTIONING) ? null : "banner";
      case "FOOTER": return el.parentElement && el.parentElement.closest(SECTIONING) ? null : "contentinfo";
      case "SECTION": return named ? "region" : null;
      case "FORM": return named ? "form" : null;
    }
    return null;
  }

  // ---------- scan ----------

  // Scan any same-origin document (defaults to this page).
  function scan(doc) {
    doc = doc || document;
    var headings = [];
    doc.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']").forEach(function (el) {
      if (isHidden(el)) return;
      var level = el.getAttribute("role") === "heading"
        ? parseInt(el.getAttribute("aria-level") || "2", 10)
        : parseInt(el.tagName.charAt(1), 10);
      headings.push({ el: el, level: level, name: headingName(el), issues: [] });
    });

    var prev = 0;
    var h1Count = 0;
    headings.forEach(function (h, i) {
      if (h.level === 1) h1Count++;
      if (!h.name) h.issues.push("Empty heading: announced as just “heading level " + h.level + "”");
      if (i === 0 && h.level !== 1) h.issues.push("First heading is not an h1");
      if (prev && h.level > prev + 1) h.issues.push("Skips from h" + prev + " to h" + h.level);
      prev = h.level;
    });

    var landmarks = [];
    doc.querySelectorAll("header, footer, main, nav, aside, section, form, search, [role]").forEach(function (el) {
      if (isHidden(el)) return;
      var role = landmarkRole(el);
      if (role) landmarks.push({ el: el, role: role, name: accessibleName(el), issues: [] });
    });

    // Landmarks of the same role need distinct names to be told apart.
    var byRole = {};
    landmarks.forEach(function (l) { (byRole[l.role] = byRole[l.role] || []).push(l); });
    Object.keys(byRole).forEach(function (role) {
      var list = byRole[role];
      if (list.length < 2) return;
      var seen = {};
      list.forEach(function (l) {
        if (!l.name) l.issues.push(list.length + " “" + role + "” landmarks — this one has no label");
        else if (seen[l.name]) l.issues.push("Same label as another " + role + " landmark");
        seen[l.name] = true;
      });
    });

    var pageIssues = [];
    if (!headings.length) pageIssues.push("No headings at all — heading navigation finds nothing.");
    else if (h1Count === 0) pageIssues.push("No h1 — users can’t jump straight to the page topic.");
    else if (h1Count > 1) pageIssues.push(h1Count + " h1 headings — usually there should be one, for the page topic.");
    var mains = byRole.main ? byRole.main.length : 0;
    if (mains === 0) pageIssues.push("No main landmark — no quick way to jump past repeated content.");
    if (mains > 1) pageIssues.push(mains + " main landmarks — there should be exactly one.");
    if (!landmarks.length) pageIssues.push("No landmarks at all — the landmarks list/rotor is empty.");

    // Content outside any landmark is easy to miss when navigating by landmarks.
    var orphan = 0;
    doc.querySelectorAll("body p, body li, body h1, body h2, body h3, body h4, body h5, body h6, body table").forEach(function (el) {
      if (isHidden(el)) return;
      for (var n = el; n; n = n.parentElement) {
        if (n !== doc.body && landmarkRole(n)) return;
      }
      orphan++;
    });
    if (orphan) pageIssues.push(orphan + " block(s) of content sit outside every landmark.");

    return { headings: headings, landmarks: landmarks, pageIssues: pageIssues };
  }

  // The playground reuses the checks without the panel.
  window.hlStructure = { scan: scan, landmarkRole: landmarkRole };
  if (window.HL_INSPECTOR_NO_UI) return;

  // ---------- UI ----------

  var css = [
    "[data-hl-inspector]{position:fixed;z-index:2147483647;top:0;right:0;bottom:0;width:min(24rem,100vw);overflow:auto;",
    "background:#111317;color:#f2f2f4;font:14px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;",
    "box-shadow:-4px 0 24px rgba(0,0,0,.35);padding:0 0 2rem;text-align:left}",
    "[data-hl-inspector][hidden]{display:none}",
    "[data-hl-inspector] *{box-sizing:border-box;font:inherit;color:inherit;letter-spacing:normal}",
    "[data-hl-inspector] .hli-bar{position:sticky;top:0;display:flex;gap:.5rem;align-items:center;justify-content:space-between;padding:.75rem 1rem;background:#1c1f26;border-bottom:1px solid #333}",
    "[data-hl-inspector] .hli-title{font-weight:700;font-size:15px;margin:0}",
    "[data-hl-inspector] button{background:#2b3140;border:1px solid #4a5263;border-radius:6px;padding:.3rem .6rem;cursor:pointer}",
    "[data-hl-inspector] button:focus-visible,[data-hl-inspector] a:focus-visible{outline:3px solid #ffb37a;outline-offset:2px}",
    "[data-hl-inspector] .hli-tabs{display:flex;gap:.25rem;padding:.75rem 1rem 0}",
    "[data-hl-inspector] .hli-tabs button[aria-pressed=true]{background:#7fb2f0;color:#0e1116;border-color:#7fb2f0}",
    "[data-hl-inspector] .hli-sec{padding:0 1rem}",
    "[data-hl-inspector] .hli-sec p.hli-label{margin:1rem 0 .4rem;font-weight:700;text-transform:uppercase;font-size:12px;color:#a8b0c0}",
    "[data-hl-inspector] ul{list-style:none;margin:0;padding:0}",
    "[data-hl-inspector] li{margin:0;padding:0}",
    "[data-hl-inspector] .hli-item{display:block;width:100%;text-align:left;background:none;border:0;border-radius:4px;padding:.3rem .4rem;margin:1px 0}",
    "[data-hl-inspector] .hli-item:hover{background:#262a33}",
    "[data-hl-inspector] .hli-tag{display:inline-block;min-width:2.6em;margin-right:.4rem;padding:0 .3em;border-radius:3px;background:#2e3a4f;color:#bcd6ff;font:12px/1.6 ui-monospace,Menlo,monospace;text-align:center}",
    "[data-hl-inspector] .hli-issue{display:block;color:#ffb4ab;font-size:12.5px;margin-top:.1rem}",
    "[data-hl-inspector] .hli-issue::before{content:'\\26A0  '}",
    "[data-hl-inspector] .hli-ok{color:#9fe0a8}",
    "[data-hl-inspector] .hli-page li{color:#ffb4ab;margin:.25rem 0}",
    "[data-hl-inspector] .hli-empty{color:#a8b0c0;font-style:italic}",
    ".hli-flash{outline:4px solid #ff7a00 !important;outline-offset:3px !important;transition:outline-color .2s}"
  ].join("");

  var style = document.createElement("style");
  style.setAttribute(ROOT_ATTR, "");
  style.textContent = css;
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.setAttribute(ROOT_ATTR, "");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "hli-title");
  document.body.appendChild(panel);

  var view = "headings";

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  function flash(target) {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("hli-flash");
    setTimeout(function () { target.classList.remove("hli-flash"); }, 1600);
  }

  function itemButton(tagText, label, indent, issues, target) {
    var li = el("li");
    var b = el("button", { type: "button", class: "hli-item" });
    b.style.paddingLeft = (0.4 + indent) + "rem";
    b.appendChild(el("span", { class: "hli-tag" }, tagText));
    b.appendChild(document.createTextNode(label));
    issues.forEach(function (msg) { b.appendChild(el("span", { class: "hli-issue" }, msg)); });
    b.addEventListener("click", function () { flash(target); });
    li.appendChild(b);
    return li;
  }

  function render() {
    var data = scan();
    panel.textContent = "";

    var bar = el("div", { class: "hli-bar" });
    bar.appendChild(el("p", { class: "hli-title", id: "hli-title" }, "Page structure"));
    var actions = el("div");
    var refresh = el("button", { type: "button" }, "Rescan");
    refresh.addEventListener("click", render);
    var close = el("button", { type: "button", "aria-label": "Close structure panel" }, "✕");
    close.addEventListener("click", function () { panel.hidden = true; });
    actions.appendChild(refresh);
    actions.appendChild(document.createTextNode(" "));
    actions.appendChild(close);
    bar.appendChild(actions);
    panel.appendChild(bar);

    var tabs = el("div", { class: "hli-tabs", role: "group", "aria-label": "View" });
    [["headings", "Headings (" + data.headings.length + ")"], ["landmarks", "Landmarks (" + data.landmarks.length + ")"]].forEach(function (t) {
      var b = el("button", { type: "button", "aria-pressed": String(view === t[0]) }, t[1]);
      b.addEventListener("click", function () { view = t[0]; render(); });
      tabs.appendChild(b);
    });
    panel.appendChild(tabs);

    var sec = el("div", { class: "hli-sec" });

    sec.appendChild(el("p", { class: "hli-label" }, "Page-level checks"));
    if (data.pageIssues.length) {
      var ul = el("ul", { class: "hli-page" });
      data.pageIssues.forEach(function (m) { ul.appendChild(el("li", null, "⚠ " + m)); });
      sec.appendChild(ul);
    } else {
      sec.appendChild(el("p", { class: "hli-ok" }, "✓ No page-level problems found."));
    }

    if (view === "headings") {
      sec.appendChild(el("p", { class: "hli-label" }, "Headings, in reading order"));
      if (!data.headings.length) sec.appendChild(el("p", { class: "hli-empty" }, "None."));
      var hl = el("ul");
      data.headings.forEach(function (h) {
        hl.appendChild(itemButton("h" + h.level, h.name || "(empty)", (h.level - 1) * 1.1, h.issues, h.el));
      });
      sec.appendChild(hl);
    } else {
      sec.appendChild(el("p", { class: "hli-label" }, "Landmarks, in reading order"));
      if (!data.landmarks.length) sec.appendChild(el("p", { class: "hli-empty" }, "None."));
      var ll = el("ul");
      data.landmarks.forEach(function (l) {
        var depth = 0;
        for (var n = l.el.parentElement; n; n = n.parentElement) if (landmarkRole(n)) depth++;
        ll.appendChild(itemButton(l.role, l.name ? "“" + l.name + "”" : "", depth * 1.1, l.issues, l.el));
      });
      sec.appendChild(ll);
    }

    panel.appendChild(sec);
  }

  render();
  if (window.HL_INSPECTOR_HIDDEN) panel.hidden = true;
  panel.addEventListener("keydown", function (e) {
    if (e.key === "Escape") panel.hidden = true;
  });

  window.hlInspector = {
    show: function () { render(); panel.hidden = false; },
    hide: function () { panel.hidden = true; },
    toggle: function () { if (panel.hidden) { render(); panel.hidden = false; } else panel.hidden = true; }
  };
})();

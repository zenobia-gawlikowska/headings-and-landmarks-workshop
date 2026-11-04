/*
 * Playground: edit a broken exercise page and see the preview and
 * structure report update. Uses window.hlStructure from inspector.js.
 */
(function () {
  "use strict";

  var editor = document.getElementById("pg-editor");
  var frame = document.getElementById("pg-frame");
  var starter = document.getElementById("pg-starter");
  var auto = document.getElementById("pg-auto");
  var tabIndent = document.getElementById("pg-tab");
  var report = document.getElementById("pg-report-body");
  var count = document.getElementById("pg-count");
  var status = document.getElementById("pg-status");

  var originals = {};
  var lastAnnounced = null;
  var pendingScroll = 0;

  // ---------- storage (best effort) ----------

  function storeKey() { return "hl-playground:" + starter.value; }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function forget(key) { try { localStorage.removeItem(key); } catch (e) {} }

  // ---------- starter pages ----------

  // Strip the workshop banner and scripts so students edit only the page itself.
  function cleanStarter(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(".demo-banner, script").forEach(function (n) {
      var prev = n.previousSibling;
      if (prev && prev.nodeType === 3 && !prev.nodeValue.trim()) prev.remove();
      n.remove();
    });
    // The parser drops the whitespace around <head> and <body>; put line breaks back.
    var out = doc.documentElement.outerHTML
      .replace(/^(<html[^>]*>)<head>/, "$1\n<head>")
      .replace("</head><body>", "</head>\n<body>");
    return "<!doctype html>\n" + out + "\n";
  }

  function fetchStarter(name) {
    if (originals[name]) return Promise.resolve(originals[name]);
    return fetch(name)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        originals[name] = cleanStarter(html);
        return originals[name];
      });
  }

  function openStarter(fresh) {
    var saved = fresh ? null : load(storeKey());
    if (saved) {
      editor.value = saved;
      update(true);
      return;
    }
    fetchStarter(starter.value).then(function (html) {
      editor.value = html;
      forget(storeKey());
      pendingScroll = 0;
      update(true);
    }).catch(function () {
      report.innerHTML = "";
      report.appendChild(el("p", { class: "pg-problem" },
        "Couldn’t load " + starter.value + ". Open this page through a web server " +
        "(for example: python3 -m http.server 8000), not as a file."));
    });
  }

  // ---------- preview ----------

  function update(announce) {
    try { pendingScroll = frame.contentWindow.scrollY || 0; } catch (e) {}
    frame.dataset.announce = announce ? "1" : "";
    frame.srcdoc = editor.value;
  }

  frame.addEventListener("load", function () {
    var doc = frame.contentDocument;
    if (!doc || !doc.body) return;
    frame.contentWindow.scrollTo(0, pendingScroll);
    renderReport(window.hlStructure.scan(doc), frame.dataset.announce === "1");
  });

  // ---------- report ----------

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  function flash(target) {
    target.scrollIntoView({ block: "center" });
    var old = target.style.outline;
    var oldOffset = target.style.outlineOffset;
    target.style.outline = "4px solid #ff7a00";
    target.style.outlineOffset = "3px";
    setTimeout(function () { target.style.outline = old; target.style.outlineOffset = oldOffset; }, 1600);
  }

  // Blank out comments so tags mentioned in them aren't matched.
  function maskComments(src) {
    return src.replace(/<!--[\s\S]*?-->/g, function (m) { return m.replace(/[^\n]/g, " "); });
  }

  // Find the start tag of `target` in the source: the nth <tag in document order.
  function goToCode(target) {
    var tag = target.tagName.toLowerCase();
    var all = Array.prototype.indexOf.call(target.ownerDocument.getElementsByTagName(tag), target);
    var re = new RegExp("<" + tag + "\\b[^>]*>", "gi");
    var src = maskComments(editor.value);
    var m, i = 0;
    while ((m = re.exec(src))) {
      if (i++ === all) {
        editor.focus();
        editor.setSelectionRange(m.index, m.index + m[0].length);
        var line = src.slice(0, m.index).split("\n").length - 1;
        var lh = parseFloat(getComputedStyle(editor).lineHeight) || 20;
        editor.scrollTop = Math.max(0, line * lh - editor.clientHeight / 3);
        return;
      }
    }
    editor.focus();
  }

  function item(tagText, label, indent, issues, target) {
    var li = el("li", { class: "pg-item" });
    li.style.paddingLeft = indent + "rem";
    var show = el("button", { type: "button", class: "pg-show" });
    show.appendChild(el("span", { class: "pg-tag" }, tagText));
    show.appendChild(document.createTextNode(label));
    show.addEventListener("click", function () { flash(target); });
    var code = el("button", {
      type: "button", class: "pg-goto",
      "aria-label": "Go to code: " + tagText + " " + label
    }, "Code");
    code.addEventListener("click", function () { goToCode(target); });
    li.appendChild(show);
    li.appendChild(code);
    if (issues.length) {
      var ul = el("ul", { class: "pg-issues" });
      issues.forEach(function (m) { ul.appendChild(el("li", null, m)); });
      li.appendChild(ul);
    }
    return li;
  }

  function renderReport(data, announce) {
    var problems = data.pageIssues.length;
    data.headings.forEach(function (h) { problems += h.issues.length; });
    data.landmarks.forEach(function (l) { problems += l.issues.length; });

    report.textContent = "";
    count.textContent = problems ? problems + (problems === 1 ? " problem" : " problems") : "all clear";
    count.className = "pg-count " + (problems ? "bad" : "good");

    report.appendChild(el("h3", null, "Page-level checks"));
    if (data.pageIssues.length) {
      var pl = el("ul", { class: "pg-page" });
      data.pageIssues.forEach(function (m) { pl.appendChild(el("li", null, m)); });
      report.appendChild(pl);
    } else {
      report.appendChild(el("p", { class: "pg-ok" }, "No page-level problems found."));
    }

    report.appendChild(el("h3", null, "Headings (" + data.headings.length + ")"));
    if (!data.headings.length) report.appendChild(el("p", { class: "pg-empty" }, "None."));
    else {
      var hl = el("ul", { class: "pg-list" });
      data.headings.forEach(function (h) {
        hl.appendChild(item("h" + h.level, h.name || "(empty)", (h.level - 1) * 0.9, h.issues, h.el));
      });
      report.appendChild(hl);
    }

    report.appendChild(el("h3", null, "Landmarks (" + data.landmarks.length + ")"));
    if (!data.landmarks.length) report.appendChild(el("p", { class: "pg-empty" }, "None."));
    else {
      var ll = el("ul", { class: "pg-list" });
      data.landmarks.forEach(function (l) {
        var depth = 0;
        for (var n = l.el.parentElement; n; n = n.parentElement) if (window.hlStructure.landmarkRole(n)) depth++;
        ll.appendChild(item(l.role, l.name ? "“" + l.name + "”" : "", depth * 0.9, l.issues, l.el));
      });
      report.appendChild(ll);
    }

    // Speak only when asked, or when the number of problems changes.
    if (announce || problems !== lastAnnounced) {
      status.textContent = problems
        ? "Preview updated. " + count.textContent + " found."
        : "Preview updated. No problems found.";
      lastAnnounced = problems;
    }
  }

  // ---------- editor ----------

  var timer;
  editor.addEventListener("input", function () {
    save(storeKey(), editor.value);
    if (!auto.checked) return;
    clearTimeout(timer);
    timer = setTimeout(function () { update(false); }, 500);
  });

  var escaped = false;
  editor.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { escaped = true; return; }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); update(true); return; }
    if (e.key !== "Tab" || !tabIndent.checked || e.shiftKey || escaped) { escaped = false; return; }
    e.preventDefault();
    // insertText keeps the browser's undo history.
    if (!document.execCommand || !document.execCommand("insertText", false, "  ")) {
      editor.setRangeText("  ", editor.selectionStart, editor.selectionEnd, "end");
      editor.dispatchEvent(new Event("input"));
    }
  });

  // ---------- full-screen preview ----------

  var full = document.getElementById("pg-full");
  var fullFrame = document.getElementById("pg-full-frame");

  document.getElementById("pg-full-open").addEventListener("click", function () {
    fullFrame.srcdoc = editor.value;
    full.showModal();
  });
  document.getElementById("pg-full-close").addEventListener("click", function () { full.close(); });
  full.addEventListener("close", function () { fullFrame.srcdoc = ""; });

  fullFrame.addEventListener("load", function () {
    var doc = fullFrame.contentDocument;
    if (!doc || !doc.body || !full.open) return;
    // Esc pressed inside the page doesn't reach the dialog, so listen for it there too.
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") full.close(); });
    // Start inside the page, so screen reader navigation begins there.
    fullFrame.focus();
  });

  // ---------- toolbar ----------

  document.getElementById("pg-run").addEventListener("click", function () { update(true); });

  document.getElementById("pg-reset").addEventListener("click", function () {
    if (editor.value !== originals[starter.value] &&
        !confirm("Throw away your changes and start again from the broken page?")) return;
    openStarter(true);
  });

  document.getElementById("pg-download").addEventListener("click", function () {
    var blob = new Blob([editor.value], { type: "text/html" });
    var a = el("a", { href: URL.createObjectURL(blob), download: starter.value.replace(".html", "-mine.html") });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });

  starter.addEventListener("change", function () {
    try { history.replaceState(null, "", "?page=" + encodeURIComponent(starter.value)); } catch (e) {}
    pendingScroll = 0;
    openStarter(false);
  });

  try { tabIndent.checked = load("hl-playground:tab") === "1"; } catch (e) {}
  tabIndent.addEventListener("change", function () { save("hl-playground:tab", tabIndent.checked ? "1" : "0"); });

  var wanted = new URLSearchParams(location.search).get("page");
  if (wanted && starter.querySelector("option[value='" + wanted.replace(/'/g, "") + "']")) starter.value = wanted;
  // Load the original too, so Reset can tell whether anything changed.
  fetchStarter(starter.value).catch(function () {});
  openStarter(false);
})();

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const widgetId = request.nextUrl.searchParams.get('id')

  if (!widgetId) {
    return new NextResponse('Missing ?id= parameter', { status: 400 })
  }

  // Sanitise widget ID to prevent injection (UUIDs only)
  const safe = widgetId.replace(/[^a-zA-Z0-9\-]/g, '')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Widget Inspector – ${safe}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; min-height: 100vh; }
  </style>
</head>
<body>
  <script src="/widget.js" data-widget-id="${safe}"></script>
  <script>
    // ---- Extract Shadow DOM HTML/CSS and send to parent ----
    function extractWidget() {
      var el = document.querySelector('glance-widget');
      if (!el || !el.shadowRoot) return false;

      var styleEl = el.shadowRoot.querySelector('style');
      var css = styleEl ? styleEl.textContent : '';

      var wrapper = document.createElement('div');
      el.shadowRoot.querySelectorAll(':not(style)').forEach(function(node) {
        wrapper.appendChild(node.cloneNode(true));
      });

      window.parent.postMessage({
        type: 'glance-inspector',
        html: wrapper.innerHTML,
        css: css
      }, '*');
      return true;
    }

    var attempts = 0;
    var poll = setInterval(function() {
      attempts++;
      if (extractWidget() || attempts > 100) clearInterval(poll);
    }, 200);

    document.addEventListener('click', function() {
      setTimeout(extractWidget, 300);
    }, true);

    // ---- Hover Inspector ----
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #7C3AED;background:rgba(124,58,237,0.08);z-index:999999;display:none;border-radius:3px;transition:top 0.05s,left 0.05s,width 0.05s,height 0.05s;';
    document.body.appendChild(overlay);

    var tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;display:none;background:#1e1e1e;color:#d4d4d4;font:11px/1.5 "SF Mono","Fira Code",Consolas,monospace;padding:6px 10px;border-radius:6px;max-width:380px;white-space:pre-wrap;box-shadow:0 4px 12px rgba(0,0,0,0.25);';
    document.body.appendChild(tooltip);

    var lastTarget = null;

    function getShadowTarget(e) {
      var el = document.querySelector('glance-widget');
      if (!el || !el.shadowRoot) return null;
      // composedPath gives us the actual element inside shadow DOM
      var path = e.composedPath();
      for (var i = 0; i < path.length; i++) {
        var node = path[i];
        if (node.nodeType === 1 && node !== el && node.getRootNode() === el.shadowRoot) {
          return node;
        }
      }
      return null;
    }

    // Fetch widget.js source once for line lookups
    var _widgetSource = null;
    var _widgetLines = [];
    fetch('/widget.js').then(function(r) { return r.text(); }).then(function(src) {
      _widgetSource = src;
      _widgetLines = src.split('\\n');
    }).catch(function() {});

    function findClassLines(className) {
      if (!_widgetLines.length || !className) return [];
      var results = [];
      var classes = className.trim().split(/\\s+/);
      classes.forEach(function(cls) {
        if (!cls) return;
        // Search for CSS rule: .classname { or .classname.other {
        var cssPattern = '\\\\.' + cls.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\\\$&');
        // Search for JS assignment: className="...cls..." or className=\\'...cls...\\'
        var jsPatterns = [
          'className="' + cls,
          "className='" + cls,
          'className="' + className.trim() + '"',
          "className='" + className.trim() + "'",
          'class="' + cls,
        ];
        _widgetLines.forEach(function(line, idx) {
          var lineNum = idx + 1;
          // Check CSS rules
          if (line.match(new RegExp(cssPattern + '(\\\\s|\\\\.|\\\\{|,|:)'))) {
            results.push({ line: lineNum, type: 'css', cls: cls, snippet: line.substring(0, 120).trim() });
          }
          // Check JS class assignments
          jsPatterns.forEach(function(pat) {
            if (line.indexOf(pat) !== -1 && !results.some(function(r) { return r.line === lineNum && r.type === 'js'; })) {
              // Find approximate column
              var col = line.indexOf(pat);
              var context = line.substring(Math.max(0, col - 20), col + pat.length + 30).trim();
              results.push({ line: lineNum, type: 'js', cls: cls, snippet: context });
            }
          });
        });
      });
      // Deduplicate by line number
      var seen = {};
      return results.filter(function(r) {
        var key = r.line + ':' + r.type;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      }).sort(function(a, b) { return a.line - b.line; });
    }

    function buildLabel(node) {
      var tag = node.tagName.toLowerCase();
      var rawClass = node.className && typeof node.className === 'string' ? node.className.trim() : '';
      var cls = rawClass ? '.' + rawClass.split(/\\s+/).join('.') : '';
      var id = node.id ? '#' + node.id : '';
      var selector = tag + id + cls;

      var cs = window.getComputedStyle(node);
      var props = [];
      var interesting = [
        'display','flex-direction','gap','padding','margin',
        'width','height','font-size','font-weight','color',
        'background-color','border','border-radius','opacity','overflow'
      ];
      interesting.forEach(function(p) {
        var v = cs.getPropertyValue(p);
        if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== 'visible' &&
            v !== '0px' && v !== 'rgba(0, 0, 0, 0)' && v !== 'rgb(0, 0, 0)') {
          props.push(p + ': ' + v);
        }
      });

      var size = Math.round(node.offsetWidth) + ' \\u00d7 ' + Math.round(node.offsetHeight);
      var lines = [selector, size];
      if (props.length) { lines.push('---'); lines = lines.concat(props); }

      // Add source locations
      var refs = findClassLines(rawClass);
      if (refs.length > 0) {
        lines.push('');
        lines.push('\\ud83d\\udccc widget.js references:');
        refs.forEach(function(r) {
          var label = r.type === 'css' ? 'CSS' : 'JS';
          lines.push('  L' + r.line + ' [' + label + '] ' + r.snippet);
        });
      }

      return lines.join('\\n');
    }

    document.addEventListener('mousemove', function(e) {
      var target = getShadowTarget(e);
      if (!target) {
        overlay.style.display = 'none';
        tooltip.style.display = 'none';
        lastTarget = null;
        window.parent.postMessage({ type: 'glance-hover', info: null }, '*');
        return;
      }
      if (target === lastTarget) {
        // Just reposition tooltip near cursor
        var tx = e.clientX + 14;
        var ty = e.clientY + 14;
        if (tx + 380 > window.innerWidth) tx = e.clientX - 390;
        if (ty + 200 > window.innerHeight) ty = e.clientY - tooltip.offsetHeight - 10;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
        return;
      }
      lastTarget = target;

      var rect = target.getBoundingClientRect();
      overlay.style.display = 'block';
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';

      var info = buildLabel(target);
      tooltip.textContent = info;
      tooltip.style.display = 'block';
      var tx = e.clientX + 14;
      var ty = e.clientY + 14;
      if (tx + 380 > window.innerWidth) tx = e.clientX - 390;
      if (ty + 200 > window.innerHeight) ty = e.clientY - tooltip.offsetHeight - 10;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';

      window.parent.postMessage({ type: 'glance-hover', info: info }, '*');
    }, true);

    document.addEventListener('mouseleave', function() {
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
      lastTarget = null;
      window.parent.postMessage({ type: 'glance-hover', info: null }, '*');
    });
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

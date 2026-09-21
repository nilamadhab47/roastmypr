// RoastMyPR - Content Script
// Injected into GitHub PR pages as a right-edge hinge + slide-out drawer.

(function() {
  'use strict';

  const MAX_DIFF_CHARS = 15000;
  const SIZE_LIMIT = 400;
  const HOST_ID = 'roast-my-pr-host';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SVG_TAGS = { svg: 1, path: 1, g: 1, circle: 1, line: 1 };

  function h(tag, props, ...children) {
    const node = SVG_TAGS[tag]
      ? document.createElementNS(SVG_NS, tag)
      : document.createElement(tag);
    if (props) {
      for (const [key, val] of Object.entries(props)) {
        if (val == null || val === false) continue;
        if (key === 'className' || key === 'class') {
          node.setAttribute('class', val);
        } else if (key === 'text') {
          node.textContent = val;
        } else if (key === 'dataset') {
          for (const [dk, dv] of Object.entries(val)) node.dataset[dk] = dv;
        } else if (key.startsWith('on') && typeof val === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        } else if (key === 'hidden' || key === 'disabled' || key === 'checked') {
          node[key] = !!val;
        } else {
          node.setAttribute(key, val);
        }
      }
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function fill(el, ...children) {
    while (el.firstChild) el.removeChild(el.firstChild);
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return el;
  }

  function iconFlame() {
    return h('svg', { class: 'roast-flame', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' },
      h('path', { d: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z' }),
      h('path', { d: 'M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z' })
    );
  }

  function iconGear() {
    return h('svg', { viewBox: '0 0 16 16', width: '16', height: '16', fill: 'currentColor', 'aria-hidden': 'true' },
      h('path', { d: 'M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z' }),
      h('path', { d: 'M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z' })
    );
  }

  function iconClose() {
    return h('svg', { viewBox: '0 0 16 16', width: '16', height: '16', fill: 'currentColor', 'aria-hidden': 'true' },
      h('path', { d: 'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z' })
    );
  }

  const EXCLUDED_FILE_PATTERNS = [
    /package-lock\.json$/i,
    /yarn\.lock$/i,
    /pnpm-lock\.yaml$/i,
    /Gemfile\.lock$/i,
    /Cargo\.lock$/i,
    /composer\.lock$/i,
    /poetry\.lock$/i,
    /Pipfile\.lock$/i,
    /\.min\.js$/i,
    /\.min\.css$/i,
    /\.bundle\.js$/i,
    /dist\//i,
    /build\//i,
    /vendor\//i,
    /node_modules\//i,
    /\.generated\./i,
    /\.g\.dart$/i,
    /\.freezed\.dart$/i,
  ];

  const DRAWER_CSS = `
    .roast-root{--bg:#0d1117;--surface:#161b22;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--accent:#e16f3e;--accent-hover:#f0883e;--accent-fg:#0d1117;--accent-subtle:#3d2314;--danger:#f85149;--danger-subtle:#490202;--success:#3fb950;--success-subtle:#0f2d16;--warning:#d4a72c;--warning-subtle:#3d2e00;--info-subtle:#0c2d6b;--overlay:rgba(1,4,9,.55);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:var(--text);-webkit-font-smoothing:antialiased}
    .roast-root *,.roast-root *::before,.roast-root *::after{box-sizing:border-box}
    .roast-flame{width:16px;height:16px;display:block;color:var(--accent)}
    .roast-backdrop{position:fixed;inset:0;width:100vw;height:100vh;background:var(--overlay);pointer-events:auto;opacity:0;visibility:hidden;transition:opacity .2s,visibility .2s}
    .roast-root.roast-open .roast-backdrop{opacity:1;visibility:visible}
    .roast-backdrop[hidden]{display:block;opacity:0;visibility:hidden;pointer-events:none}
    .roast-drawer{position:fixed;top:0;right:0;z-index:1;width:min(400px,92vw);height:100vh;transform:translateX(100%);transition:transform .22s ease;pointer-events:auto}
    .roast-root.roast-open .roast-drawer{transform:translateX(0)}
    .roast-container{height:100%;display:flex;flex-direction:column;background:var(--bg);border-left:1px solid var(--border);overflow:hidden}
    .roast-header{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0}
    .roast-logo{display:flex;color:var(--accent)}
    .roast-title{font-size:14px;font-weight:650;color:var(--text);letter-spacing:-.01em}
    .roast-usage{margin-left:auto;font-size:11px;font-weight:500;color:var(--muted);padding:2px 8px;border-radius:999px;border:1px solid var(--border);background:var(--bg);white-space:nowrap}
    .roast-usage:empty{display:none}
    .roast-usage-low{color:var(--warning);border-color:var(--warning);background:var(--warning-subtle)}
    .roast-usage-none,.roast-usage-error{color:var(--danger);border-color:var(--danger);background:var(--danger-subtle)}
    .roast-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--text);cursor:pointer;flex-shrink:0;opacity:.72}
    .roast-icon-btn:hover{opacity:1;background:var(--bg);border-color:var(--border)}
    .roast-content{flex:1;overflow-y:auto;padding:16px}
    .roast-lede,.roast-empty-copy{margin:0 0 14px;color:var(--muted);font-size:13px}
    .roast-empty{text-align:left}
    .roast-empty-title{margin:0 0 6px;font-size:14px;font-weight:650;color:var(--text)}
    .roast-btn{display:block;width:100%;padding:9px 14px;border-radius:6px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;text-align:center;text-decoration:none;border:1px solid transparent;transition:background .12s,border-color .12s}
    .roast-btn+.roast-btn{margin-top:8px}
    .roast-btn-primary{background:var(--accent);color:var(--accent-fg)}
    .roast-btn-primary:hover{background:var(--accent-hover)}
    .roast-btn-secondary{background:var(--surface);color:var(--text);border-color:var(--border)}
    .roast-btn-secondary:hover{background:var(--bg);border-color:var(--muted)}
    .roast-btn-upgrade{background:var(--text);color:var(--bg)}
    .roast-loading{text-align:center;padding:32px 12px;color:var(--muted)}
    .roast-spinner{width:28px;height:28px;margin:0 auto 12px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:roast-spin .7s linear infinite}
    @keyframes roast-spin{to{transform:rotate(360deg)}}
    .roast-error{text-align:left;padding:4px 0;color:var(--danger)}
    .roast-error p{margin:0 0 12px}
    .roast-notice{background:var(--warning-subtle);color:var(--warning);padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12px;border:1px solid var(--border)}
    .roast-vibe{padding:14px;margin-bottom:14px;background:var(--accent-subtle);border:1px solid var(--border);border-radius:8px}
    .roast-vibe-badge{display:inline-block;background:var(--accent);color:var(--accent-fg);padding:3px 10px;border-radius:999px;font-size:11px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
    .roast-vibe-text{font-size:14px;font-style:italic;color:var(--text)}
    .roast-section{margin-bottom:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg)}
    .roast-section-header{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface);cursor:pointer;font-weight:600;user-select:none;color:var(--text)}
    .roast-section-header:hover{background:var(--bg)}
    .roast-toggle{margin-left:auto;color:var(--muted);font-size:10px}
    .roast-section-content{padding:8px 12px 12px}
    .roast-section-collapsed .roast-section-content{display:none}
    .roast-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;background:var(--accent-subtle);color:var(--accent);border-radius:10px;font-size:11px;font-weight:650}
    .roast-badge-warning{background:var(--warning-subtle);color:var(--warning)}
    .roast-item{display:flex;align-items:flex-start;gap:8px;padding:8px;margin:4px 0;border-radius:6px;background:var(--surface);border:1px solid var(--border)}
    .roast-item-bug{background:var(--danger-subtle)}
    .roast-item-style{background:var(--warning-subtle)}
    .roast-item-suggestion{background:var(--info-subtle)}
    .roast-item-praise{background:var(--success-subtle)}
    .roast-item-hygiene{background:var(--warning-subtle);border-left:3px solid var(--warning)}
    .roast-item-icon{flex-shrink:0;font-size:14px}
    .roast-item-text{flex:1;word-break:break-word;color:var(--text)}
    .roast-copy-btn,.roast-insert-btn{flex-shrink:0;background:none;border:none;padding:2px 6px;cursor:pointer;opacity:.55;font-size:12px;border-radius:4px;color:var(--text)}
    .roast-copy-btn:hover,.roast-insert-btn:hover{opacity:1;background:var(--bg)}
    .roast-gif-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}
    .roast-gif{position:relative;border-radius:6px;overflow:hidden;cursor:pointer;aspect-ratio:1;border:1px solid var(--border)}
    .roast-gif img{width:100%;height:100%;object-fit:cover;display:block}
    .roast-gif-overlay{position:absolute;inset:0;background:rgba(1,4,9,.62);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;opacity:0;transition:opacity .15s}
    .roast-gif:hover .roast-gif-overlay{opacity:1}
    .roast-gif-single{text-align:center;margin-bottom:12px}
    .roast-gif-single img{max-width:100%;border-radius:6px;border:1px solid var(--border)}
    .roast-no-gifs{text-align:center;color:var(--muted);font-size:12px;padding:12px;margin:0}
    .roast-gif-search{margin:10px 0 4px}
    .roast-gif-search-row{display:flex;gap:6px}
    .roast-gif-search-input{flex:1;padding:7px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;font-family:inherit;outline:none}
    .roast-gif-search-input:focus{border-color:var(--accent)}
    .roast-gif-search-input::placeholder{color:var(--muted)}
    .roast-gif-search-btn{flex-shrink:0;padding:7px 12px;font-size:12px}
    .roast-gif-search-results{margin-top:8px}
    .roast-jokes{margin-top:8px}
    .roast-joke{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;font-style:italic;color:var(--muted)}
    .roast-joke span{flex:1}
    .roast-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(12px);background:#21262d;color:#e6edf3;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:500;z-index:5;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;border:1px solid var(--border)}
    .roast-toast-visible{opacity:1;transform:translateX(-50%) translateY(0)}
    .roast-section-hygiene .roast-section-header{background:var(--warning-subtle)}
    .roast-copy-all-btn,.roast-reset-btn{margin-top:8px;font-size:12px;padding:8px 12px}
    .roast-reset-btn{margin-top:12px}
    .roast-content::-webkit-scrollbar{width:8px}
    .roast-content::-webkit-scrollbar-track{background:transparent}
    .roast-content::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
  `;

  let panelContainer = null;
  let roastRoot = null;
  let currentState = 'idle';
  let lastReviewData = null;
  let userStatus = null;
  let navHooksInstalled = false;

  function init() {
    ensureUI();
    setupNavigationHooks();
    loadUserStatus();
  }

  function isPRPage() {
    return /github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(window.location.href);
  }

  function resolveTheme() {
    const html = document.documentElement;
    const mode = html.getAttribute('data-color-mode');
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme() {
    if (roastRoot) roastRoot.dataset.theme = resolveTheme();
  }

  function getHost() {
    return document.getElementById(HOST_ID) || document.getElementById(HOST_ID + '-drawer');
  }

  function getHinge() {
    return document.getElementById(HOST_ID);
  }

  function ensureUI() {
    if (!isPRPage()) {
      const hinge = getHinge();
      const drawerHost = document.getElementById(HOST_ID + '-drawer');
      if (hinge) hinge.style.display = 'none';
      if (drawerHost) drawerHost.style.display = 'none';
      return;
    }
    const hinge = getHinge();
    if (hinge) {
      hinge.style.display = 'flex';
      const drawerHost = document.getElementById(HOST_ID + '-drawer');
      if (drawerHost) drawerHost.style.display = '';
      applyTheme();
      return;
    }
    injectPanel();
  }

  async function loadUserStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_USER_STATUS' });
      if (!status.error) {
        userStatus = status;
        updateUsageDisplay();
        if (currentState === 'idle' && panelContainer) {
          renderIdleState();
        }
      }
    } catch (e) {
      console.warn('Could not load user status:', e);
    }
  }

  function usageMeta() {
    if (!userStatus) {
      return { text: '', className: 'roast-usage' };
    }
    if (!userStatus.hasApiKey) {
      return { text: 'No API key', className: 'roast-usage roast-usage-none' };
    }
    if (!userStatus.valid) {
      return { text: 'Invalid key', className: 'roast-usage roast-usage-error' };
    }
    const remaining = userStatus.callsRemainingThisHour;
    const limit = userStatus.callsPerHour;
    return {
      text: `${remaining}/${limit} this hour`,
      className: `roast-usage ${remaining <= 10 ? 'roast-usage-low' : 'roast-usage-ok'}`
    };
  }

  function updateUsageDisplay() {
    const usageEl = panelContainer?.querySelector('.roast-usage');
    if (!usageEl) return;
    const meta = usageMeta();
    usageEl.textContent = meta.text;
    usageEl.className = meta.className;
  }

  function injectPanel() {
    if (getHost()) return;

    // --- Hinge tab: lives directly on the page (no Shadow DOM) ---
    const hingeBtn = document.createElement('button');
    hingeBtn.id = HOST_ID;
    hingeBtn.setAttribute('data-roast-my-pr', 'true');
    hingeBtn.setAttribute('aria-label', 'Open RoastMyPR');
    hingeBtn.title = 'Roast this PR';
    Object.assign(hingeBtn.style, {
      all: 'unset',
      position: 'fixed',
      top: '38%',
      right: '0px',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      width: '40px',
      padding: '16px 0',
      border: '1px solid #30363d',
      borderRight: 'none',
      borderRadius: '10px 0 0 10px',
      background: '#21262d',
      color: '#e6edf3',
      cursor: 'pointer',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxSizing: 'border-box',
      transition: 'background 0.15s ease',
      pointerEvents: 'auto',
    });

    const flameSvg = document.createElementNS(SVG_NS, 'svg');
    flameSvg.setAttribute('viewBox', '0 0 24 24');
    flameSvg.setAttribute('fill', 'currentColor');
    flameSvg.setAttribute('aria-hidden', 'true');
    Object.assign(flameSvg.style, { width: '18px', height: '18px', color: '#e16f3e', display: 'block' });
    const p1 = document.createElementNS(SVG_NS, 'path');
    p1.setAttribute('d', 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z');
    const p2 = document.createElementNS(SVG_NS, 'path');
    p2.setAttribute('d', 'M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z');
    flameSvg.append(p1, p2);

    const labelSpan = document.createElement('span');
    labelSpan.textContent = 'Roast';
    Object.assign(labelSpan.style, {
      writingMode: 'vertical-rl',
      transform: 'rotate(180deg)',
      fontSize: '11px',
      fontWeight: '650',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#e6edf3',
    });

    const accentBar = document.createElement('span');
    Object.assign(accentBar.style, {
      position: 'absolute',
      left: '0',
      top: '10px',
      bottom: '10px',
      width: '3px',
      borderRadius: '0 2px 2px 0',
      background: '#e16f3e',
    });

    hingeBtn.append(accentBar, flameSvg, labelSpan);
    hingeBtn.addEventListener('mouseenter', () => { hingeBtn.style.background = '#2d333b'; });
    hingeBtn.addEventListener('mouseleave', () => { hingeBtn.style.background = '#21262d'; });
    document.body.appendChild(hingeBtn);
    console.info('[RoastMyPR] hinge button added to page');

    // --- Drawer: in a separate container with Shadow DOM ---
    const drawerHost = document.createElement('div');
    drawerHost.id = HOST_ID + '-drawer';
    drawerHost.setAttribute('data-roast-my-pr-drawer', 'true');
    Object.assign(drawerHost.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      width: '0',
      height: '100vh',
      zIndex: '2147483646',
      pointerEvents: 'none',
    });
    document.body.appendChild(drawerHost);

    const shadow = drawerHost.attachShadow({ mode: 'open' });

    const drawerStyle = document.createElement('style');
    drawerStyle.textContent = DRAWER_CSS;
    shadow.appendChild(drawerStyle);

    roastRoot = h('div', { class: 'roast-root' });
    roastRoot.dataset.theme = resolveTheme();

    const backdrop = h('div', { class: 'roast-backdrop', hidden: true });
    const drawer = h('aside', { class: 'roast-drawer', 'aria-hidden': 'true' },
      h('div', { id: 'roast-panel', class: 'roast-container' })
    );

    roastRoot.append(backdrop, drawer);
    shadow.appendChild(roastRoot);

    panelContainer = roastRoot.querySelector('#roast-panel');

    hingeBtn.addEventListener('click', toggleDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isDrawerOpen()) closeDrawer();
    });

    renderShell();
    renderIdleState();
    restoreDrawerState();
    console.info('[RoastMyPR] drawer ready');
  }

  function renderShell() {
    const meta = usageMeta();
    fill(panelContainer,
      h('header', { class: 'roast-header' },
        h('span', { class: 'roast-logo' }, iconFlame()),
        h('span', { class: 'roast-title', text: 'RoastMyPR' }),
        h('span', { class: meta.className, text: meta.text }),
        h('button', { type: 'button', class: 'roast-icon-btn roast-settings', title: 'Settings', 'aria-label': 'Settings' }, iconGear()),
        h('button', { type: 'button', class: 'roast-icon-btn roast-close', title: 'Close', 'aria-label': 'Close' }, iconClose())
      ),
      h('div', { class: 'roast-content' })
    );
    bindChrome();
  }

  function bindChrome() {
    panelContainer.querySelector('.roast-close')?.addEventListener('click', closeDrawer);
    panelContainer.querySelector('.roast-settings')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage?.() || window.open(chrome.runtime.getURL('options.html'), '_blank');
    });
  }

  function isDrawerOpen() {
    return roastRoot?.classList.contains('roast-open');
  }

  function setDrawerOpen(open) {
    if (!roastRoot) return;
    roastRoot.classList.toggle('roast-open', open);
    const hingeBtn = getHinge();
    const drawer = roastRoot.querySelector('.roast-drawer');
    const backdrop = roastRoot.querySelector('.roast-backdrop');
    const drawerHost = document.getElementById(HOST_ID + '-drawer');

    if (hingeBtn) {
      hingeBtn.setAttribute('aria-expanded', String(open));
      hingeBtn.setAttribute('aria-label', open ? 'Close RoastMyPR' : 'Open RoastMyPR');
      hingeBtn.style.right = open ? 'min(400px, 92vw)' : '0px';
      hingeBtn.style.opacity = open ? '0' : '1';
      hingeBtn.style.pointerEvents = open ? 'none' : 'auto';
    }
    if (drawer) drawer.setAttribute('aria-hidden', String(!open));
    if (backdrop) backdrop.hidden = !open;
    if (drawerHost) {
      drawerHost.style.width = open ? 'min(400px, 92vw)' : '0';
      drawerHost.style.pointerEvents = open ? 'auto' : 'none';
    }
    try { chrome.storage.local.set({ roastDrawerOpen: open }); } catch (e) {}
  }

  function toggleDrawer() {
    setDrawerOpen(!isDrawerOpen());
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function openDrawer() {
    setDrawerOpen(true);
  }

  async function restoreDrawerState() {
    try {
      const stored = await chrome.storage.local.get(['roastDrawerOpen']);
      if (stored.roastDrawerOpen) openDrawer();
    } catch (e) {}
  }

  function setupNavigationHooks() {
    if (navHooksInstalled) return;
    navHooksInstalled = true;

    let scheduled = false;
    const notify = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        ensureUI();
        applyTheme();
      });
    };

    const wrap = (fn) => function patchedHistory() {
      const result = fn.apply(this, arguments);
      notify();
      return result;
    };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', notify);
    document.addEventListener('turbo:load', notify);
    document.addEventListener('turbo:render', notify);
    document.addEventListener('soft-nav:success', notify);
    document.addEventListener('pjax:end', notify);
    if (window.navigation?.addEventListener) {
      window.navigation.addEventListener('navigate', notify);
    }

    new MutationObserver(() => {
      if (isPRPage() && !getHost()) notify();
    }).observe(document.documentElement, { childList: true, subtree: true });

    new MutationObserver(applyTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-mode', 'data-light-theme', 'data-dark-theme']
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  }

  function renderIdleState() {
    if (!panelContainer?.querySelector('.roast-header')) {
      renderShell();
    }
    updateUsageDisplay();

    const content = panelContainer.querySelector('.roast-content');
    const needsKey = !userStatus?.hasApiKey || userStatus?.valid === false;

    if (needsKey && userStatus) {
      fill(content,
        h('div', { class: 'roast-empty' },
          h('p', { class: 'roast-empty-title', text: userStatus.hasApiKey ? 'API key is invalid' : 'Add an API key to start' }),
          h('p', { class: 'roast-empty-copy', text: 'Open settings, paste your RoastMyPR key, then roast this pull request from here.' }),
          h('button', { type: 'button', class: 'roast-btn roast-btn-primary roast-options-link', text: 'Open settings' })
        )
      );
    } else {
      fill(content,
        h('p', { class: 'roast-lede', text: 'Review this pull request with a pointed roast, or drop a quick LGTM with a GIF.' }),
        h('button', { type: 'button', class: 'roast-btn roast-btn-primary roast-review-btn', text: 'Roast this PR' }),
        h('button', { type: 'button', class: 'roast-btn roast-btn-secondary roast-quick-btn', title: 'Quick LGTM with a roast-worthy GIF', text: 'Quick LGTM' })
      );
    }

    setupIdleListeners();
    currentState = 'idle';
  }

  function setupIdleListeners() {
    const content = panelContainer.querySelector('.roast-content');
    content.querySelector('.roast-review-btn')?.addEventListener('click', () => startReview(false));
    content.querySelector('.roast-quick-btn')?.addEventListener('click', () => startReview(true));
    content.querySelector('.roast-options-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage?.() || window.open(chrome.runtime.getURL('options.html'), '_blank');
    });
  }
  
  function renderLoadingState() {
    const content = panelContainer.querySelector('.roast-content');
    if (content) {
      fill(content,
        h('div', { class: 'roast-loading' },
          h('div', { class: 'roast-spinner' }),
          h('p', { text: 'Preparing your roast...' })
        )
      );
    }
    currentState = 'loading';
  }

  function renderErrorState(message, showRetry = true, showGetKey = false, showUpgrade = false) {
    const content = panelContainer.querySelector('.roast-content');
    if (content) {
      const kids = [h('p', { text: message })];
      if (showGetKey) {
        kids.push(h('a', { href: '#', class: 'roast-btn roast-btn-primary roast-options-link', text: 'Get your API key' }));
      }
      if (showUpgrade) {
        kids.push(h('a', { href: 'https://roastmypr.com/pricing', target: '_blank', class: 'roast-btn roast-btn-upgrade', text: 'Upgrade for more' }));
      }
      if (showRetry) {
        kids.push(h('button', { type: 'button', class: 'roast-btn roast-btn-secondary roast-retry-btn', text: 'Try again' }));
      }
      fill(content, h('div', { class: 'roast-error' }, ...kids));

      content.querySelector('.roast-retry-btn')?.addEventListener('click', () => startReview(false));
      content.querySelector('.roast-options-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage?.() || window.open(chrome.runtime.getURL('options.html'), '_blank');
      });
    }
    currentState = 'error';
  }

  async function startReview(quickMode = false) {
    openDrawer();
    renderLoadingState();
    
    try {
      // Refresh user status
      const status = await chrome.runtime.sendMessage({ type: 'GET_USER_STATUS' });
      userStatus = status;
      
      if (!status.hasApiKey) {
        renderErrorState('Add your RoastMyPR API key to get started.', false, true);
        return;
      }
      
      if (!status.valid) {
        renderErrorState('Your API key is invalid. Check your settings.', false, true);
        return;
      }
      
      // Fetch PR data
      const prData = await fetchPRData();
      
      if (!prData.diff) {
        renderErrorState('Could not fetch PR diff. Try refreshing the page.');
        return;
      }
      
      // Send to backend for review
      const reviewResult = await chrome.runtime.sendMessage({
        type: 'REVIEW_PR',
        data: {
          prTitle: prData.title,
          prDescription: prData.description,
          diff: prData.truncatedDiff,
          lineCount: prData.lineCount,
          prUrl: window.location.href
        }
      });
      
      if (reviewResult.error) {
        if (reviewResult.error === 'NO_API_KEY') {
          renderErrorState('Add your RoastMyPR API key to get started.', false, true);
        } else if (reviewResult.error === 'INVALID_API_KEY') {
          renderErrorState('Your API key is invalid. Check your settings.', false, true);
        } else if (reviewResult.error === 'RATE_LIMIT_EXCEEDED') {
          renderErrorState('Rate limit exceeded (100 calls/hour). Try again soon or upgrade!', false, false, true);
        } else {
          renderErrorState(reviewResult.error);
        }
        return;
      }
      
      lastReviewData = reviewResult;
      
      // Update usage display
      if (reviewResult._usage) {
        userStatus = { ...userStatus, ...reviewResult._usage };
        updateUsageDisplay();
      }
      
      // Update review count stat
      const currentStats = await chrome.storage.local.get(['reviewsCount']);
      await chrome.storage.local.set({ 
        reviewsCount: (currentStats.reviewsCount || 0) + 1 
      });
      
      // Fetch GIFs
      let gifs = [];
      if (reviewResult.gif_queries?.length > 0) {
        const gifResult = await chrome.runtime.sendMessage({
          type: 'FETCH_GIFS',
          queries: reviewResult.gif_queries
        });
        
        if (!gifResult.error) {
          gifs = gifResult.filter(g => !g.error);
        }
      }
      
      if (quickMode) {
        renderQuickLGTMResult(reviewResult, gifs);
      } else {
        renderReviewResult(reviewResult, gifs, prData.wasTruncated, prData.omittedFiles);
      }
      
    } catch (err) {
      console.error('RoastMyPR error:', err);
      renderErrorState(err.message || 'Something went wrong. Try again.');
    }
  }
  
  async function proxyImageSrc(imgEl, url) {
    if (!url) return;
    try {
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'FETCH_IMAGE_DATA_URL', url }, (r) => {
          resolve(r && r.dataUrl ? r.dataUrl : null);
        });
      });
      if (result) imgEl.src = result;
    } catch (e) {
      console.warn('[RoastMyPR] image proxy failed:', e);
    }
  }

  function proxyAllGifImages(root) {
    root.querySelectorAll('img[data-gif-url]').forEach((img) => {
      proxyImageSrc(img, img.dataset.gifUrl);
    });
  }

  function bgFetch(url) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'FETCH_URL', url }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[RoastMyPR] bgFetch error:', chrome.runtime.lastError.message);
            resolve({ error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { error: 'empty response' });
        });
      } catch (e) {
        console.warn('[RoastMyPR] bgFetch exception:', e);
        resolve({ error: e.message });
      }
    });
  }

  async function fetchPRData() {
    const rawUrl = location.href.split('#')[0];
    const baseUrl = rawUrl.replace(/\/(files|commits|checks)?\/?$/, '');
    const diffUrl = baseUrl + '.diff';
    
    console.info('[RoastMyPR] fetching diff from:', diffUrl);
    
    let diff = '';
    let wasTruncated = false;
    let omittedFiles = 0;
    
    try {
      const result = await bgFetch(diffUrl);
      console.info('[RoastMyPR] diff fetch result:', result?.error || `${(result?.text || '').length} chars`);
      if (result && result.text) {
        diff = result.text;
      }
    } catch (e) {
      console.warn('[RoastMyPR] Could not fetch .diff:', e);
    }
    
    if (!diff) {
      console.info('[RoastMyPR] trying DOM fallback for diff');
      diff = scrapeDiffFromDOM();
      console.info('[RoastMyPR] DOM fallback got:', diff.length, 'chars');
    }
    
    if (!diff) {
      console.info('[RoastMyPR] trying direct fetch as last resort');
      try {
        const resp = await fetch(diffUrl);
        if (resp.ok) diff = await resp.text();
        console.info('[RoastMyPR] direct fetch got:', diff.length, 'chars');
      } catch (e) {
        console.warn('[RoastMyPR] direct fetch failed:', e);
      }
    }
    
    const { processedDiff, lineCount, truncated, omitted } = processDiff(diff);
    wasTruncated = truncated;
    omittedFiles = omitted;
    
    const title = document.querySelector('.js-issue-title, .gh-header-title .markdown-title, [data-hovercard-type="pull_request"]')?.textContent?.trim() || '';
    const descEl = document.querySelector('.comment-body, .markdown-body.comment-body, .js-comment-body');
    const description = descEl?.textContent?.trim() || '';
    
    return {
      title,
      description,
      diff,
      truncatedDiff: processedDiff,
      lineCount,
      wasTruncated,
      omittedFiles
    };
  }
  
  function scrapeDiffFromDOM() {
    const files = document.querySelectorAll('.file');
    if (files.length === 0) return '';
    
    let diffText = '';
    
    files.forEach(file => {
      const filename = file.querySelector('.file-header')?.getAttribute('data-path') || 
                       file.querySelector('.file-info a')?.textContent?.trim() || 'unknown';
      
      diffText += `diff --git a/${filename} b/${filename}\n`;
      
      const lines = file.querySelectorAll('.blob-code');
      lines.forEach(line => {
        const codeContent = line.querySelector('.blob-code-inner')?.textContent || line.textContent;
        if (line.classList.contains('blob-code-addition')) {
          diffText += `+${codeContent}\n`;
        } else if (line.classList.contains('blob-code-deletion')) {
          diffText += `-${codeContent}\n`;
        } else {
          diffText += ` ${codeContent}\n`;
        }
      });
    });
    
    return diffText;
  }
  
  function processDiff(diff) {
    if (!diff) {
      return { processedDiff: '', lineCount: 0, truncated: false, omitted: 0 };
    }
    
    const filePattern = /^diff --git/gm;
    const parts = diff.split(filePattern);
    
    const files = [];
    let totalLineCount = 0;
    let excludedLineCount = 0;
    
    for (let i = 1; i < parts.length; i++) {
      const fileDiff = 'diff --git' + parts[i];
      const filenameMatch = fileDiff.match(/^diff --git a\/(.+?) b\//m);
      const filename = filenameMatch ? filenameMatch[1] : '';
      
      const changedLines = (fileDiff.match(/^\+[^+]/gm) || []).length + 
                           (fileDiff.match(/^-[^-]/gm) || []).length;
      
      const isExcluded = EXCLUDED_FILE_PATTERNS.some(pattern => pattern.test(filename));
      
      files.push({
        filename,
        diff: fileDiff,
        changedLines,
        isExcluded
      });
      
      if (isExcluded) {
        excludedLineCount += changedLines;
      } else {
        totalLineCount += changedLines;
      }
    }
    
    files.sort((a, b) => b.changedLines - a.changedLines);
    
    let processedDiff = '';
    let omittedFiles = 0;
    let truncated = false;
    
    for (const file of files) {
      if (file.isExcluded) {
        omittedFiles++;
        continue;
      }
      
      if (processedDiff.length + file.diff.length > MAX_DIFF_CHARS) {
        truncated = true;
        omittedFiles++;
        continue;
      }
      
      processedDiff += file.diff;
    }
    
    if (truncated) {
      processedDiff += `\n\n(diff truncated, ${omittedFiles} files omitted due to size)`;
    }
    
    return {
      processedDiff,
      lineCount: totalLineCount,
      truncated,
      omitted: omittedFiles
    };
  }
  
  function renderReviewResult(review, gifs, wasTruncated, omittedFiles) {
    const content = panelContainer.querySelector('.roast-content');
    if (!content) return;

    const typeIcons = { bug: 'Bug', style: 'Style', suggestion: 'Idea', praise: 'Nice' };
    const ruleIcons = { linear_issue: 'Issue', size: 'Size', description_mismatch: 'Desc', etiquette: 'Note' };
    const roastLevel = review.roastLevel || 3;

    const reviewItems = (review.review || []).map((item, idx) =>
      h('div', { class: `roast-item roast-item-${item.type || 'suggestion'}` },
        h('span', { class: 'roast-item-icon', text: typeIcons[item.type] || '•' }),
        h('span', { class: 'roast-item-text', text: item.note || '' }),
        h('button', { type: 'button', class: 'roast-copy-btn', dataset: { reviewIdx: String(idx) }, title: 'Copy as comment', text: 'Copy' })
      )
    );

    const hygieneItems = (review.hygiene || []).map((item, idx) =>
      h('div', { class: 'roast-item roast-item-hygiene' },
        h('span', { class: 'roast-item-icon', text: ruleIcons[item.rule] || 'Note' }),
        h('span', { class: 'roast-item-text', text: item.note || '' }),
        h('button', { type: 'button', class: 'roast-copy-btn', dataset: { hygieneIdx: String(idx) }, title: 'Copy as comment', text: 'Copy' })
      )
    );

    const gifGrid = gifs.length > 0
      ? h('div', { class: 'roast-gif-grid' }, ...gifs.map((gif, idx) =>
          h('div', { class: 'roast-gif', dataset: { gifIdx: String(idx) } },
            h('img', { dataset: { gifUrl: gif.thumbnail }, alt: gif.title || gif.query || '', loading: 'lazy' }),
            h('div', { class: 'roast-gif-overlay', text: 'Click to insert' })
          )
        ))
      : h('p', { class: 'roast-no-gifs', text: 'No GIFs available' });

    const jokes = (review.jokes || []).map((joke, idx) =>
      h('div', { class: 'roast-joke', dataset: { jokeIdx: String(idx) } },
        h('span', { text: `"${joke}"` }),
        h('button', { type: 'button', class: 'roast-insert-btn', title: 'Insert as comment', text: 'Insert' })
      )
    );

    const nodes = [];
    if (wasTruncated) {
      nodes.push(h('div', { class: 'roast-notice', text: `Large PR — diff was truncated (${omittedFiles} files omitted)` }));
    }
    nodes.push(h('div', { class: 'roast-vibe' },
      h('div', { class: 'roast-vibe-badge', title: `Roast Level: ${roastLevel}/5`, text: `${review.archetype || 'PR'} · ${roastLevel}/5` }),
      h('div', { class: 'roast-vibe-text', text: `"${review.vibe || 'Unknown vibe'}"` })
    ));
    if (review.hygiene?.length > 0) {
      nodes.push(h('div', { class: 'roast-section roast-section-hygiene' },
        h('div', { class: 'roast-section-header', dataset: { section: 'hygiene' } },
          h('span', { text: 'PR Hygiene' }),
          h('span', { class: 'roast-badge roast-badge-warning', text: String(review.hygiene.length) }),
          h('span', { class: 'roast-toggle', text: '▼' })
        ),
        h('div', { class: 'roast-section-content' }, ...hygieneItems)
      ));
    }
    nodes.push(h('div', { class: 'roast-section' },
      h('div', { class: 'roast-section-header', dataset: { section: 'review' } },
        h('span', { text: 'The Roast' }),
        h('span', { class: 'roast-badge', text: String(review.review?.length || 0) }),
        h('span', { class: 'roast-toggle', text: '▼' })
      ),
      h('div', { class: 'roast-section-content' },
        ...(reviewItems.length ? reviewItems : [h('p', { text: 'This PR is too clean to roast.' })]),
        h('button', { type: 'button', class: 'roast-btn roast-btn-secondary roast-copy-all-btn', text: 'Copy full review' })
      )
    ));
    const gifSearch = h('div', { class: 'roast-gif-search' },
      h('div', { class: 'roast-gif-search-row' },
        h('input', { type: 'text', class: 'roast-gif-search-input', placeholder: 'Search GIFs... (e.g. hera pheri, bollywood, facepalm)' }),
        h('button', { type: 'button', class: 'roast-btn roast-btn-secondary roast-gif-search-btn', text: 'Search' })
      ),
      h('div', { class: 'roast-gif-search-results' })
    );

    nodes.push(h('div', { class: 'roast-section' },
      h('div', { class: 'roast-section-header', dataset: { section: 'vibes' } },
        h('span', { text: 'GIFs & Burns' }),
        h('span', { class: 'roast-toggle', text: '▼' })
      ),
      h('div', { class: 'roast-section-content' }, gifGrid, gifSearch, h('div', { class: 'roast-jokes' }, ...jokes))
    ));
    nodes.push(h('button', { type: 'button', class: 'roast-btn roast-btn-secondary roast-reset-btn', text: 'New roast' }));

    fill(content, ...nodes);
    proxyAllGifImages(content);
    setupResultListeners(review, gifs);
    currentState = 'result';
  }

  function renderQuickLGTMResult(review, gifs) {
    const content = panelContainer.querySelector('.roast-content');
    if (!content) return;

    const randomGif = gifs.length > 0 ? gifs[Math.floor(Math.random() * gifs.length)] : null;

    fill(content,
      h('div', { class: 'roast-vibe' },
        h('div', { class: 'roast-vibe-text', text: `"${review.vibe || 'Looks good!'}"` })
      ),
      randomGif && h('div', { class: 'roast-gif-single' },
        h('img', { dataset: { gifUrl: randomGif.thumbnail }, alt: randomGif.title || randomGif.query || '' })
      ),
      h('button', { type: 'button', class: 'roast-btn roast-btn-primary roast-quick-insert-btn', text: 'Drop LGTM + GIF' }),
      h('button', { type: 'button', class: 'roast-btn roast-btn-secondary roast-full-review-btn', text: 'Show full roast' }),
      h('button', { type: 'button', class: 'roast-btn roast-btn-secondary roast-reset-btn', text: 'Start over' })
    );

    proxyAllGifImages(content);

    content.querySelector('.roast-quick-insert-btn')?.addEventListener('click', async () => {
      let comment = 'LGTM!';
      if (randomGif) {
        comment += `\n\n![${randomGif.query}](${randomGif.original})`;
        const currentStats = await chrome.storage.local.get(['gifsPosted']);
        await chrome.storage.local.set({
          gifsPosted: (currentStats.gifsPosted || 0) + 1
        });
      }
      insertIntoCommentBox(comment);
    });

    content.querySelector('.roast-full-review-btn')?.addEventListener('click', () => {
      renderReviewResult(review, gifs, false, 0);
    });

    content.querySelector('.roast-reset-btn')?.addEventListener('click', renderIdleState);

    currentState = 'quick';
  }

  function setupResultListeners(review, gifs) {
    panelContainer.querySelectorAll('.roast-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.roast-section');
        section?.classList.toggle('roast-section-collapsed');
        const toggle = header.querySelector('.roast-toggle');
        if (toggle) {
          toggle.textContent = section?.classList.contains('roast-section-collapsed') ? '▶' : '▼';
        }
      });
    });
    
    panelContainer.querySelectorAll('.roast-copy-btn[data-review-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.reviewIdx);
        const item = review.review[idx];
        if (item) {
          const typeEmoji = { bug: '🐛', style: '💅', suggestion: '💡', praise: '👍' };
          const text = `${typeEmoji[item.type] || ''} ${item.note}`;
          insertIntoCommentBox(text);
        }
      });
    });
    
    panelContainer.querySelectorAll('.roast-copy-btn[data-hygiene-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.hygieneIdx);
        const item = review.hygiene[idx];
        if (item) {
          insertIntoCommentBox(`📏 ${item.note}`);
        }
      });
    });
    
    panelContainer.querySelector('.roast-copy-all-btn')?.addEventListener('click', () => {
      const fullReview = formatFullReview(review);
      insertIntoCommentBox(fullReview);
    });
    
    panelContainer.querySelectorAll('.roast-gif').forEach(gif => {
      gif.addEventListener('click', async () => {
        const idx = parseInt(gif.dataset.gifIdx);
        const gifData = gifs[idx];
        if (gifData) {
          const markdown = `![${gifData.query}](${gifData.original})`;
          insertIntoCommentBox(markdown);
          const currentStats = await chrome.storage.local.get(['gifsPosted']);
          await chrome.storage.local.set({ 
            gifsPosted: (currentStats.gifsPosted || 0) + 1 
          });
        }
      });
    });
    
    panelContainer.querySelectorAll('.roast-insert-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const jokeEl = btn.closest('.roast-joke');
        const idx = parseInt(jokeEl?.dataset.jokeIdx);
        const joke = review.jokes?.[idx];
        if (joke) {
          insertIntoCommentBox(joke);
        }
      });
    });
    
    const searchInput = panelContainer.querySelector('.roast-gif-search-input');
    const searchBtn = panelContainer.querySelector('.roast-gif-search-btn');
    const searchResults = panelContainer.querySelector('.roast-gif-search-results');

    async function doGifSearch() {
      const query = searchInput?.value?.trim();
      if (!query) return;
      searchBtn.textContent = '...';
      searchBtn.disabled = true;
      try {
        const result = await chrome.runtime.sendMessage({ type: 'FETCH_GIFS', queries: [query] });
        fill(searchResults);
        const hits = (result || []).filter(g => g.thumbnail);
        if (hits.length === 0) {
          searchResults.appendChild(h('p', { class: 'roast-no-gifs', text: `No GIFs found for "${query}"` }));
        } else {
          const grid = h('div', { class: 'roast-gif-grid' }, ...hits.map((gif) =>
            h('div', { class: 'roast-gif roast-gif-search-result', dataset: { gifOriginal: gif.original, gifQuery: gif.query || query } },
              h('img', { dataset: { gifUrl: gif.thumbnail }, alt: gif.title || query, loading: 'lazy' }),
              h('div', { class: 'roast-gif-overlay', text: 'Click to insert' })
            )
          ));
          searchResults.appendChild(grid);
          proxyAllGifImages(searchResults);
          searchResults.querySelectorAll('.roast-gif-search-result').forEach(el => {
            el.addEventListener('click', async () => {
              const markdown = `![${el.dataset.gifQuery}](${el.dataset.gifOriginal})`;
              insertIntoCommentBox(markdown);
              const stats = await chrome.storage.local.get(['gifsPosted']);
              await chrome.storage.local.set({ gifsPosted: (stats.gifsPosted || 0) + 1 });
            });
          });
        }
      } catch (e) {
        fill(searchResults, h('p', { class: 'roast-no-gifs', text: 'Search failed. Try again.' }));
      }
      searchBtn.textContent = 'Search';
      searchBtn.disabled = false;
    }

    searchBtn?.addEventListener('click', doGifSearch);
    searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doGifSearch(); });

    panelContainer.querySelector('.roast-reset-btn')?.addEventListener('click', renderIdleState);
  }
  
  function formatFullReview(review) {
    const typeEmoji = { bug: '🐛', style: '💅', suggestion: '💡', praise: '👍' };
    let text = '## 🔥 RoastMyPR Review\n\n';
    
    if (review.hygiene?.length > 0) {
      text += '### PR Hygiene\n';
      review.hygiene.forEach(item => {
        text += `- 📏 ${item.note}\n`;
      });
      text += '\n';
    }
    
    if (review.review?.length > 0) {
      text += '### Findings\n';
      review.review.forEach(item => {
        text += `- ${typeEmoji[item.type] || ''} ${item.note}\n`;
      });
    }
    
    return text.trim();
  }
  
  function insertIntoCommentBox(text) {
    const selectors = [
      'textarea[name="comment[body]"]:focus',
      'textarea.comment-form-textarea:focus',
      'textarea[id^="new_comment_field"]:focus',
      '.js-comment-field:focus',
      'textarea[name="comment[body]"]',
      'textarea.comment-form-textarea',
      'textarea[id^="new_comment_field"]',
      '.js-comment-field',
      '.review-thread-reply-button'
    ];
    
    let target = null;
    for (const selector of selectors) {
      target = document.querySelector(selector);
      if (target && isVisible(target)) break;
    }
    
    if (target?.classList.contains('review-thread-reply-button')) {
      target.click();
      setTimeout(() => {
        const textarea = document.querySelector('textarea.comment-form-textarea:last-of-type');
        if (textarea) {
          insertText(textarea, text);
        } else {
          copyToClipboard(text);
        }
      }, 200);
      return;
    }
    
    if (target && target.tagName === 'TEXTAREA') {
      insertText(target, text);
    } else {
      const editable = document.querySelector('[contenteditable="true"]:focus, .js-comment-field[contenteditable]');
      if (editable) {
        document.execCommand('insertText', false, text);
        editable.dispatchEvent(new Event('input', { bubbles: true }));
        showToast('Inserted!');
      } else {
        copyToClipboard(text);
      }
    }
  }
  
  function insertText(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    
    textarea.value = before + prefix + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length + text.length;
    
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    textarea.focus();
    showToast('Inserted!');
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied — click into a comment box and paste!');
    }).catch(() => {
      showToast('Could not copy to clipboard');
    });
  }
  
  function showToast(message) {
    const mount = roastRoot || document.body;
    const existing = mount.querySelector('.roast-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'roast-toast';
    toast.textContent = message;
    mount.appendChild(toast);

    setTimeout(() => toast.classList.add('roast-toast-visible'), 10);
    setTimeout(() => {
      toast.classList.remove('roast-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
  
  function isVisible(el) {
    return el.offsetParent !== null && 
           getComputedStyle(el).visibility !== 'hidden' &&
           getComputedStyle(el).display !== 'none';
  }
  
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function handleRuntimeMessage(request, _sender, sendResponse) {
    if (request?.type === 'OPEN_ROAST_PANEL') {
      try {
        ensureUI();
        openDrawer();
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
      return true;
    }
    return false;
  }

  if (!window.__roastMyPRListener) {
    window.__roastMyPRListener = true;
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  }

  function boot() {
    try {
      init();
      window.__roastMyPRLoaded = true;
    } catch (err) {
      console.error('[RoastMyPR] inject failed', err);
      window.__roastMyPRLoaded = false;
    }
  }

  if (window.__roastMyPRLoaded && document.getElementById('roast-my-pr-host')) {
    // already live
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

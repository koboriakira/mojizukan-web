import { clientPresets } from "./presets";

export const clientApp = `
(function () {
  ${clientPresets}

  var state = {
    screen: 'home',
    word: '',
    charIndex: 0,
    confirmed: [],
    detailWord: null,
    collected: [],
    discovered: [],
    authed: false,
    tickets: 0,
    lastHakken: false,
    sheet: null
  };

  var _canvasWired = null;

  function setState(partial) {
    Object.assign(state, partial);
    render(state);
  }

  function render(s) {
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = renderScreen(s);
    if (s.sheet) {
      app.innerHTML += renderSheet(s);
    }
    if (s.screen === 'write') {
      setTimeout(setupCanvas, 0);
    }
  }

  function renderScreen(s) {
    switch (s.screen) {
      case 'home':   return renderHome(s);
      case 'write':  return renderWrite(s);
      case 'reveal': return renderReveal(s);
      case 'zukan':  return renderZukan(s);
      case 'detail': return renderDetail(s);
      default:       return '<p>不明な画面: ' + s.screen + '</p>';
    }
  }

  function renderHome(s) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">' +
      '<div style="font-size:80px;line-height:1;">📖✏️</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:clamp(48px,15vw,72px);color:var(--ink);margin:18px 0 6px;letter-spacing:.02em;">もじずかん</div>' +
      '<div style="font-size:18px;color:var(--sub);font-weight:700;margin-bottom:44px;">もじを かいて あつめよう</div>' +
      '<div style="width:100%;max-width:380px;display:flex;flex-direction:column;gap:18px;">' +
        '<button onclick="window.__goWrite()" style="min-height:84px;background:var(--accent);box-shadow:0 6px 0 var(--accentd);font-size:28px;font-weight:900;border-radius:22px;">✏️ はじめる</button>' +
        '<button onclick="window.__goZukan()" style="min-height:84px;background:var(--accent2);box-shadow:0 6px 0 var(--accent2d);font-size:28px;font-weight:900;border-radius:22px;">📚 ずかん</button>' +
        '<button style="min-height:60px;background:transparent;color:var(--sub);font-weight:700;font-size:18px;box-shadow:none;">🔒 おとなの ひとへ</button>' +
      '</div>' +
    '</div>';
  }

  function renderWrite(s) {
    var word = s.word || '';
    var charIndex = s.charIndex || 0;
    var currentChar = word[charIndex] || '';

    var charBoxes = '';
    for (var i = 0; i < word.length; i++) {
      var done = i < charIndex;
      var active = i === charIndex;
      var bg = done ? 'var(--accent2)' : (active ? '#fff' : 'var(--locked)');
      var color = done ? '#fff' : (active ? 'var(--ink)' : 'var(--sub)');
      var border = active ? '3px solid var(--accent)' : '3px solid transparent';
      charBoxes +=
        '<div style="width:64px;height:64px;border-radius:16px;background:' + bg + ';border:' + border + ';display:flex;align-items:center;justify-content:center;font-family:var(--fhead);font-weight:900;font-size:32px;color:' + color + ';">' +
          (done ? s.confirmed[i] : (active ? currentChar : word[i])) +
        '</div>';
    }

    return '<div style="flex:1;display:flex;flex-direction:column;padding:18px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<button onclick="window.__goHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:20px;color:var(--sub);">「' + word + '」を なぞろう</div>' +
        '<div style="width:56px;"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:center;gap:12px;margin:6px 0 14px;">' +
        charBoxes +
      '</div>' +
      '<div style="position:relative;width:100%;max-width:380px;aspect-ratio:1;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 4px 16px rgba(0,0,0,.07);overflow:hidden;touch-action:none;">' +
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--fhead);font-weight:900;font-size:clamp(120px,42vw,260px);color:#ece2d2;pointer-events:none;user-select:none;line-height:1;">' + currentChar + '</div>' +
        '<canvas id="trace-canvas" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none;"></canvas>' +
      '</div>' +
      '<div style="display:flex;justify-content:center;gap:14px;margin:14px auto 0;max-width:380px;width:100%;">' +
        '<button onclick="window.__undo()" style="flex:1;min-height:60px;border-radius:18px;background:#fff;color:var(--sub);font-size:17px;box-shadow:0 4px 0 rgba(0,0,0,.07);">↩ もどす</button>' +
        '<button onclick="window.__clearCanvas()" style="flex:1;min-height:60px;border-radius:18px;background:#fff;color:#d9694f;font-size:17px;box-shadow:0 4px 0 rgba(0,0,0,.07);">🧹 けす</button>' +
      '</div>' +
      '<div style="max-width:380px;width:100%;margin:16px auto 0;">' +
        '<button onclick="window.__confirmChar()" style="width:100%;min-height:80px;border-radius:22px;background:var(--accent2);font-size:26px;box-shadow:0 6px 0 var(--accent2d);">なぞれたよ！</button>' +
      '</div>' +
    '</div>';
  }

  function renderReveal(s) {
    var word = s.word || '';
    var preset = PRESETS[word] || { emoji: '📖', cat: '', catIcon: '', desc: '' };
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:30px;color:var(--accent);">ずかんに のったよ！🎉</div>' +
      '<div style="font-size:130px;line-height:1;margin:14px 0 4px;">' + preset.emoji + '</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:56px;color:var(--ink);">' + word + '</div>' +
      (preset.cat ? '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--accent2);color:#fff;font-family:var(--fhead);font-weight:700;font-size:16px;padding:5px 14px;border-radius:20px;margin:12px 0 16px;">' + preset.catIcon + ' ' + preset.cat + '</div>' : '') +
      '<div style="font-size:22px;line-height:1.8;color:#5a5145;white-space:pre-line;max-width:340px;font-weight:500;">' + preset.desc + '</div>' +
      '<div style="display:flex;gap:14px;margin-top:36px;width:100%;max-width:400px;">' +
        '<button onclick="window.__goWrite()" style="flex:1;min-height:76px;border-radius:20px;background:var(--accent);font-size:21px;box-shadow:0 6px 0 var(--accentd);">✏️ つぎも かく</button>' +
        '<button onclick="window.__goZukan()" style="flex:1;min-height:76px;border-radius:20px;background:var(--accent2);font-size:21px;box-shadow:0 6px 0 var(--accent2d);">📚 ずかんを みる</button>' +
      '</div>' +
    '</div>';
  }

  function renderZukan(s) {
    return '<div style="padding:32px;"><h1 style="font-family:var(--fhead);">図鑑</h1><p>[zukan placeholder]</p><button onclick="window.__goHome()" style="margin-top:16px;">← もどる</button></div>';
  }

  function renderDetail(s) {
    return '<div style="padding:32px;"><h1 style="font-family:var(--fhead);">詳細</h1><p>[detail placeholder]</p><button onclick="window.__goZukan()" style="margin-top:16px;">← ずかんへ</button></div>';
  }

  function renderSheet(s) {
    var content = s.sheet === 'signup'
      ? '<p>[signup sheet placeholder]</p>'
      : s.sheet === 'tickets'
      ? '<p>[tickets sheet placeholder]</p>'
      : '';
    return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div><div class="sheet">' + content + '</div>';
  }

  function nextWord() {
    for (var i = 0; i < WORDPOOL.length; i++) {
      if (state.collected.indexOf(WORDPOOL[i]) === -1) return WORDPOOL[i];
    }
    return WORDPOOL[0];
  }

  function setupCanvas() {
    var c = document.getElementById('trace-canvas');
    if (!c || c === _canvasWired) return;
    _canvasWired = c;
    var rect = c.getBoundingClientRect();
    if (rect.width === 0) return;
    c.width = Math.round(rect.width);
    c.height = Math.round(rect.height);
    var ctx = c.getContext('2d');
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2a241d';

    var drawing = false;
    function pos(e) {
      var r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    }
    c.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      drawing = true;
      try { c.setPointerCapture(e.pointerId); } catch(_) {}
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 0.1, p.y + 0.1);
      ctx.stroke();
    });
    c.addEventListener('pointermove', function(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    });
    c.addEventListener('pointerup', function() { drawing = false; });
    c.addEventListener('pointercancel', function() { drawing = false; });
  }

  window.__setState = setState;
  window.__closeSheet = function () { setState({ sheet: null }); };

  window.__goHome = function () {
    _canvasWired = null;
    setState({ screen: 'home', sheet: null });
  };

  window.__goWrite = function () {
    _canvasWired = null;
    setState({ screen: 'write', word: nextWord(), charIndex: 0, confirmed: [] });
  };

  window.__goZukan = function () {
    setState({ screen: 'zukan', sheet: null });
  };

  window.__confirmChar = function () {
    var word = state.word;
    var idx = state.charIndex;
    var nc = state.confirmed.concat([word[idx]]);

    if (idx + 1 >= word.length) {
      var col = state.collected.indexOf(word) === -1
        ? state.collected.concat([word])
        : state.collected;
      fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word })
      });
      _canvasWired = null;
      setState({ confirmed: nc, charIndex: idx + 1, screen: 'reveal', collected: col, lastHakken: false });
    } else {
      _canvasWired = null;
      setState({ confirmed: nc, charIndex: idx + 1 });
    }
  };

  window.__clearCanvas = function () {
    var c = document.getElementById('trace-canvas');
    if (!c) return;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
  };

  window.__undo = function () {
    window.__clearCanvas();
  };

  render(state);
})();
`;

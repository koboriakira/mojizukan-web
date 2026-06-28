import { clientPresets } from "./presets";

export const clientApp = `
(function () {
  ${clientPresets}

  function storageAvailable() {
    try {
      var t = '__test__';
      localStorage.setItem(t, t);
      localStorage.removeItem(t);
      return true;
    } catch(e) {
      return false;
    }
  }

  var _hasStorage = storageAvailable();

  function saveState() {
    if (!_hasStorage) return;
    try {
      localStorage.setItem('mojizukan_entries', JSON.stringify(state.collected));
      localStorage.setItem('mojizukan_discovered', JSON.stringify(state.discovered));
      localStorage.setItem('mojizukan_handwriting', JSON.stringify(state.handwriting));
      localStorage.setItem('mojizukan_seeded', JSON.stringify(state.seeded));
    } catch(e) {}
  }

  function loadState() {
    if (!_hasStorage) return {};
    try {
      var entries = JSON.parse(localStorage.getItem('mojizukan_entries') || '[]');
      var discovered = JSON.parse(localStorage.getItem('mojizukan_discovered') || '[]');
      var handwriting = JSON.parse(localStorage.getItem('mojizukan_handwriting') || '{}');
      var seeded = JSON.parse(localStorage.getItem('mojizukan_seeded') || '[]');
      return { collected: entries, discovered: discovered, handwriting: handwriting, seeded: seeded };
    } catch(e) {
      return {};
    }
  }

  var saved = loadState();
  var state = {
    screen: 'home',
    word: '',
    charIndex: 0,
    confirmed: [],
    detailWord: null,
    collected: saved.collected || [],
    discovered: saved.discovered || [],
    handwriting: saved.handwriting || {},
    authed: false,
    tickets: 0,
    lastHakken: false,
    sheet: null,
    hintWord: null,
    sfx: true,
    bgm: false,
    theme: 'A',
    storySel: [],
    mode: 'omakase',
    seeded: saved.seeded || [],
    discovering: false,
    prepInput: '',
    prepSel: []
  };

  var _lastPromptCount = 0;

  var _canvasWired = null;

  var _audioEnabled = false;
  var _audioCache = {};

  var _pgTimer = null;
  var _pgStart = null;
  var _pgRaf = null;

  function playSound(name) {
    if (!_audioEnabled) return;
    try {
      if (!_audioCache[name]) {
        _audioCache[name] = new Audio('/sounds/' + name + '.mp3');
        _audioCache[name].volume = 0.3;
      }
      var a = _audioCache[name];
      a.currentTime = 0;
      a.play().catch(function(){});
    } catch(e) {}
  }

  document.addEventListener('pointerdown', function() {
    _audioEnabled = true;
  }, { once: true });

  function setState(partial) {
    Object.assign(state, partial);
    render(state);
    saveState();
  }

  function render(s) {
    var app = document.getElementById('app');
    if (!app) return;
    app.dataset.theme = s.theme || 'A';
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
      case 'home':      return renderHome(s);
      case 'write':     return renderWrite(s);
      case 'reveal':    return renderReveal(s);
      case 'zukan':     return renderZukan(s);
      case 'detail':    return renderDetail(s);
      case 'storyPick': return renderStoryPick(s);
      case 'parent':    return renderParent(s);
      case 'prep':      return renderPrep(s);
      case 'hakkengen': return renderHakkenGen(s);
      case 'story':     return '<p>おはなしを よみこみちゅう…</p>';
      default:          return '<p>不明な画面: ' + s.screen + '</p>';
    }
  }

  function classify(word) {
    var ngWords = [];
    for (var i = 0; i < ngWords.length; i++) {
      if (word.indexOf(ngWords[i]) !== -1) return 'ng';
    }
    if (PRESETS[word]) return 'dict';
    if (state.collected.indexOf(word) !== -1) return 'dup';
    if (state.seeded.indexOf(word) !== -1) return 'seeded';
    return 'ok';
  }

  function renderHome(s) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">' +
      '<div style="font-size:80px;line-height:1;">📖✏️</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:clamp(48px,15vw,72px);color:var(--ink);margin:18px 0 6px;letter-spacing:.02em;">もじずかん</div>' +
      '<div style="font-size:18px;color:var(--sub);font-weight:700;margin-bottom:44px;">もじを かいて あつめよう</div>' +
      '<div style="width:100%;max-width:380px;display:flex;flex-direction:column;gap:18px;">' +
        '<button onclick="window.__goWrite()" style="min-height:84px;background:var(--accent);box-shadow:0 6px 0 var(--accentd);font-size:28px;font-weight:900;border-radius:22px;">✏️ もじを かく</button>' +
        '<button onclick="window.__goZukan()" style="min-height:84px;background:var(--accent2);box-shadow:0 6px 0 var(--accent2d);font-size:28px;font-weight:900;border-radius:22px;">📖 ずかんを みる</button>' +
        (s.collected.length >= 3 ?
          '<div style="position:relative;">' +
            '<button onclick="window.__goStoryPick()" style="min-height:84px;width:100%;background:var(--accent3);box-shadow:0 6px 0 var(--accent3d);font-size:28px;font-weight:900;border-radius:22px;color:#fff;">📚 おはなしを つくる</button>' +
            '<div style="position:absolute;top:-8px;right:8px;background:#fff;color:var(--accent3);font-size:11px;font-weight:900;padding:2px 8px;border-radius:4px;transform:rotate(6deg);font-family:var(--fhead);pointer-events:none;border:1.5px solid var(--accent3);">NEW</div>' +
          '</div>'
        : '') +
        '<button onclick="window.__showParentGate()" style="min-height:60px;background:transparent;color:var(--sub);font-weight:700;font-size:18px;box-shadow:none;">🏠 おうちの ひとは こちら</button>' +
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
    var preset = PRESETS[word] || (window.__hakkenCache && window.__hakkenCache[word] ?
      { emoji: window.__hakkenCache[word].emoji, cat: 'はっけん', catIcon: '⭐', desc: window.__hakkenCache[word].desc } :
      { emoji: '📖', cat: '', catIcon: '', desc: '' });
    var title = s.lastHakken ? 'はっけん！ ⭐' : 'ずかんに のったよ！🎉';
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:30px;color:var(--accent);">' + title + '</div>' +
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
    var count = s.collected.length;

    var header = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
      '<button onclick="window.__goHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:26px;">ずかん <span style="color:var(--accent);">' + count + 'けん</span></div>' +
      '<div style="width:56px;"></div>' +
    '</div>' +
    (!s.authed ? '<button onclick="window.__showSignup()" style="width:100%;text-align:left;background:#fff;border:2px dashed var(--accent);border-radius:18px;padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:18px;box-shadow:none;">' +
      '<span style="font-size:26px;">🔑</span>' +
      '<span>' +
        '<span style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--accent);display:block;">いまは ゲスト ・ とうろくで とっておこう</span>' +
        '<span style="font-size:12.5px;color:var(--sub);">とうろくすると チケットも もらえるよ</span>' +
      '</span>' +
    '</button>' : '');

    var sections = '';
    for (var ci = 0; ci < CATEGORIES.length; ci++) {
      var cat = CATEGORIES[ci];
      var catWords = [];
      for (var w in PRESETS) {
        if (PRESETS[w].cat === cat.name) catWords.push(w);
      }
      if (catWords.length === 0) continue;

      var gotCount = 0;
      for (var j = 0; j < catWords.length; j++) {
        if (s.collected.indexOf(catWords[j]) !== -1) gotCount++;
      }

      if (gotCount === 0) continue;

      sections += '<div style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">' +
        '<span style="font-size:22px;">' + cat.icon + '</span>' +
        '<span style="font-family:var(--fhead);font-weight:900;font-size:20px;">' + cat.name + '</span>' +
        '<span style="font-size:14px;color:var(--sub);font-weight:700;">' + gotCount + '/' + catWords.length + '</span>' +
      '</div>';

      sections += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px;margin-bottom:26px;">';
      for (var k = 0; k < catWords.length; k++) {
        var cw = catWords[k];
        var preset = PRESETS[cw];
        if (s.collected.indexOf(cw) !== -1) {
          sections += '<button onclick="window.__openDetail(\\'' + cw + '\\')" style="background:var(--card);border:3px solid var(--cbd);border-radius:20px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:none;">' +
            '<span style="font-size:40px;line-height:1;">' + preset.emoji + '</span>' +
            '<span style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--ink);">' + cw + '</span>' +
          '</button>';
        } else {
          sections += '<button onclick="window.__showHint(\\'' + cw + '\\')" style="background:var(--locked);border-radius:20px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:#c4b6a0;font-size:32px;font-weight:900;border:none;cursor:pointer;">?</button>';
        }
      }
      sections += '</div>';
    }

    if (count === 0) {
      sections += '<div style="text-align:center;padding:48px 0;color:var(--sub);font-size:18px;font-weight:700;">' +
        '<div style="font-size:48px;margin-bottom:16px;">📖</div>' +
        'まだ なにも あつめてないよ<br>「はじめる」で もじを かこう！' +
      '</div>';
    }

    return '<div style="flex:1;padding:18px 0;">' + header + sections + '</div>';
  }

  function renderDetail(s) {
    var word = s.detailWord || '';
    var preset = PRESETS[word] || { emoji: '📖', cat: '', catIcon: '', desc: '' };

    return '<div style="flex:1;display:flex;flex-direction:column;padding-top:18px;">' +
      '<div style="display:flex;align-items:center;margin-bottom:8px;">' +
        '<button onclick="window.__goZukan()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">' +
        '<div style="width:220px;height:220px;border-radius:36px;background:var(--card);border:4px solid var(--cbd);display:flex;align-items:center;justify-content:center;font-size:130px;">' + preset.emoji + '</div>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:52px;margin-top:20px;">' + word + '</div>' +
        (preset.cat ? '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--accent2);color:#fff;font-family:var(--fhead);font-weight:700;font-size:16px;padding:5px 14px;border-radius:20px;margin:12px 0 16px;">' + preset.catIcon + ' ' + preset.cat + '</div>' : '') +
        '<div style="font-size:22px;line-height:1.8;color:#5a5145;white-space:pre-line;max-width:360px;font-weight:500;">' + preset.desc + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderParent(s) {
    var catProgress = '';
    for (var ci = 0; ci < CATEGORIES.length; ci++) {
      var cat = CATEGORIES[ci];
      var catWords = [];
      for (var w in PRESETS) {
        if (PRESETS[w].cat === cat.name) catWords.push(w);
      }
      if (catWords.length === 0) continue;
      var gotCount = 0;
      for (var j = 0; j < catWords.length; j++) {
        if (s.collected.indexOf(catWords[j]) !== -1) gotCount++;
      }
      catProgress += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--cbd);">' +
        '<span style="font-size:15px;">' + cat.icon + ' ' + cat.name + '</span>' +
        '<span style="font-weight:700;color:var(--accent2);font-size:15px;">' + gotCount + '/' + catWords.length + '</span>' +
      '</div>';
    }

    var currentTheme = s.theme || 'A';
    var themes = ['A', 'B', 'C'];
    var themeButtons = '';
    for (var ti = 0; ti < themes.length; ti++) {
      var t = themes[ti];
      var active = currentTheme === t;
      themeButtons += '<button onclick="window.__setTheme(\\'' + t + '\\')" style="flex:1;min-height:52px;border-radius:14px;font-size:16px;font-weight:700;' +
        (active ? 'background:var(--accent);color:#fff;box-shadow:0 4px 0 var(--accentd);' : 'background:var(--locked);color:var(--sub);box-shadow:none;') + '">' +
        'Theme ' + t + '</button>';
    }

    return '<div style="flex:1;padding:18px;overflow-y:auto;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">' +
        '<button onclick="window.__goHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:20px;">おうちの ひと メニュー</div>' +
        '<div style="width:56px;"></div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;margin-bottom:18px;box-shadow:0 3px 10px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-weight:700;font-size:17px;">チケット</div>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:26px;color:var(--accent);">🎟️ ' + (s.tickets || 0) + '</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;margin-bottom:18px;box-shadow:0 3px 10px rgba(0,0,0,.06);">' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:18px;margin-bottom:12px;">📖 がくしゅう きろく</div>' +
        '<div style="font-size:16px;color:var(--sub);font-weight:700;margin-bottom:12px;">とりあつかい: <span style="font-size:28px;color:var(--accent);font-family:var(--fhead);">' + s.collected.length + '</span> こ</div>' +
        catProgress +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;margin-bottom:18px;box-shadow:0 3px 10px rgba(0,0,0,.06);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:18px;">はっけん準備</div>' +
          '<div style="background:#fbeaf1;color:#9c4d70;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:700;">モード：おまかせ</div>' +
        '</div>' +
        '<div style="font-size:13px;color:#6b6256;margin-bottom:12px;">お子さまに はっけんさせたい ことばを まとめて しこめます。チケットは 生成成功時に 消費します。</div>' +
        (s.seeded && s.seeded.length > 0 ?
          '<div style="background:#fff;border:1px solid var(--cbd);border-radius:12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
            '<span style="font-size:14px;color:var(--sub);font-weight:700;">⭐ 仕込み中の ひみつのことば</span>' +
            '<span style="font-family:var(--fhead);font-weight:900;font-size:18px;color:var(--accent3);">' + (s.seeded ? s.seeded.length : 0) + '</span>' +
          '</div>'
        : '') +
        '<button onclick="window.__goPrep()" style="width:100%;min-height:52px;border-radius:14px;background:var(--accent3);color:#fff;font-size:15px;font-weight:900;margin-bottom:14px;box-shadow:none;">＋ ことばを 仕込む</button>' +
        '<div style="display:flex;gap:8px;">' +
          '<div style="flex:1;border:2px solid var(--accent3);background:#fbeaf1;border-radius:12px;padding:10px 8px;text-align:center;">' +
            '<div style="font-size:12px;color:var(--sub);margin-bottom:4px;">✓</div>' +
            '<div style="font-size:13px;font-weight:900;color:var(--accent3);">おまかせ</div>' +
          '</div>' +
          '<div style="flex:1;border:2px solid var(--cbd);background:var(--locked);border-radius:12px;padding:10px 8px;text-align:center;opacity:.6;">' +
            '<div style="font-size:12px;color:var(--sub);margin-bottom:4px;">近日</div>' +
            '<div style="font-size:13px;font-weight:700;color:var(--sub);">いっしょに</div>' +
          '</div>' +
          '<div style="flex:1;border:2px solid var(--cbd);background:var(--locked);border-radius:12px;padding:10px 8px;text-align:center;opacity:.6;">' +
            '<div style="font-size:12px;color:var(--sub);margin-bottom:4px;">近日</div>' +
            '<div style="font-size:13px;font-weight:700;color:var(--sub);">じぶんで</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;box-shadow:0 3px 10px rgba(0,0,0,.06);">' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:18px;margin-bottom:16px;">⚙️ せってい</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--cbd);">' +
          '<span style="font-size:16px;font-weight:700;">🔊 こうかおん</span>' +
          '<button onclick="window.__toggleSfx()" style="min-width:72px;min-height:40px;border-radius:20px;font-size:15px;font-weight:700;' +
            (s.sfx !== false ? 'background:var(--accent2);color:#fff;box-shadow:0 3px 0 var(--accent2d);' : 'background:var(--locked);color:var(--sub);box-shadow:none;') + '">' +
            (s.sfx !== false ? 'ON' : 'OFF') + '</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--cbd);">' +
          '<span style="font-size:16px;font-weight:700;">🎵 BGM</span>' +
          '<button onclick="window.__toggleBgm()" style="min-width:72px;min-height:40px;border-radius:20px;font-size:15px;font-weight:700;' +
            (s.bgm ? 'background:var(--accent2);color:#fff;box-shadow:0 3px 0 var(--accent2d);' : 'background:var(--locked);color:var(--sub);box-shadow:none;') + '">' +
            (s.bgm ? 'ON' : 'OFF') + '</button>' +
        '</div>' +
        '<div style="padding:12px 0 0;">' +
          '<div style="font-size:16px;font-weight:700;margin-bottom:10px;">🎨 はいしょくテーマ</div>' +
          '<div style="display:flex;gap:10px;">' + themeButtons + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderStoryPick(s) {
    var sel = s.storySel || [];
    var collected = s.collected || [];

    var cells = '';
    for (var i = 0; i < collected.length; i++) {
      var w = collected[i];
      var preset = PRESETS[w] || { emoji: '📖' };
      var isSelected = sel.indexOf(w) !== -1;
      var border = isSelected ? '3px solid var(--accent3)' : '3px solid var(--cbd)';
      var hasHandwriting = s.handwriting && s.handwriting[w] && s.handwriting[w].length > 0;

      var badge = isSelected
        ? '<div style="position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:var(--accent3);color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;font-weight:900;">✓</div>'
        : '';
      var hwLabel = hasHandwriting
        ? '<div style="font-size:10px;color:var(--accent2);font-weight:700;margin-top:2px;">✍️ てがき</div>'
        : '';

      cells +=
        '<button onclick="window.__toggleStorySel(\\'' + w + '\\')" style="position:relative;background:#fff;border:' + border + ';border-radius:20px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:none;padding:0;">' +
          badge +
          '<span style="font-size:34px;line-height:1;">' + preset.emoji + '</span>' +
          '<span style="font-family:var(--fhead);font-weight:900;font-size:14px;color:var(--ink);">' + w + '</span>' +
          hwLabel +
        '</button>';
    }

    var selCount = sel.length;
    var btnBg = selCount < 2 ? '#d8cfc0' : 'var(--accent3)';
    var btnShadow = selCount < 2 ? '0 6px 0 #bfb6a6' : '0 6px 0 var(--accent3d)';

    return '<div style="display:flex;flex-direction:column;min-height:100vh;">' +
      '<div style="padding:18px 18px 0;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<button onclick="window.__goHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--ink);">おはなしを つくる</div>' +
          '<div style="width:56px;"></div>' +
        '</div>' +
        '<div style="text-align:center;color:var(--sub);font-size:15px;font-weight:700;margin-bottom:4px;">つかう ことばを えらんでね</div>' +
        '<div style="text-align:center;color:var(--sub);font-size:13px;margin-bottom:18px;">2〜5こ ・ むりょうで なんかいでも</div>' +
      '</div>' +
      '<div style="flex:1;padding:0 18px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px;">' +
          cells +
        '</div>' +
      '</div>' +
      '<div style="position:sticky;bottom:0;background:var(--bg);padding:16px 18px 28px;">' +
        '<button onclick="window.__goStory()" style="width:100%;min-height:80px;border-radius:22px;background:' + btnBg + ';box-shadow:' + btnShadow + ';font-size:22px;font-weight:900;color:#fff;">' +
          '📖 おはなしを つくる（' + selCount + '/5）' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderPrep(s) {
    var prepSel = s.prepSel || [];
    var okCount = 0;
    for (var i = 0; i < prepSel.length; i++) {
      if (prepSel[i].selected && prepSel[i].status === 'ok') okCount++;
    }
    var btnBg = (okCount > 0 && (s.tickets || 0) >= okCount) ? 'var(--accent3)' : '#d8cfc0';
    var btnShadow = (okCount > 0 && (s.tickets || 0) >= okCount) ? '0 6px 0 var(--accent3d)' : '0 6px 0 #bfb6a6';

    var statusMeta = {
      ok:     { text: 'はっけんOK',              tc: '#9c4d70', bg: '#fbeaf1' },
      dup:    { text: 'もう ずかんに あるよ',    tc: '#c95835', bg: '#fff0e6' },
      seeded: { text: 'もう しこみずみ',         tc: '#8a6d1e', bg: '#fdf3d6' },
      dict:   { text: 'じしょに あり・むりょう', tc: '#3f7a52', bg: '#e6f1e9' },
      ng:     { text: 'この ことばは つかえないよ', tc: '#b03a3a', bg: '#fbe6e6' }
    };

    var cards = '';
    for (var j = 0; j < prepSel.length; j++) {
      var item = prepSel[j];
      var meta = statusMeta[item.status] || statusMeta.ok;
      var emoji = (PRESETS[item.w] && PRESETS[item.w].emoji) ? PRESETS[item.w].emoji : '✨';
      var checkEl = (item.selected && item.status === 'ok')
        ? '<div style="position:absolute;top:6px;left:6px;width:24px;height:24px;border-radius:50%;background:var(--accent3);color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;font-weight:900;">✓</div>'
        : '';
      var removeEl = '<div onclick="event.stopPropagation();window.__removePrepSel(\\'' + item.w + '\\')" style="position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:#f5ede6;color:#9a8878;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:900;">✕</div>';
      var badgeEl = '<div style="font-size:11px;font-weight:700;color:' + meta.tc + ';background:' + meta.bg + ';padding:3px 8px;border-radius:8px;margin-top:4px;">' + meta.text + '</div>';
      cards += '<div onclick="window.__togglePrepSel(\\'' + item.w + '\\')" style="position:relative;background:#fff;border:2px solid var(--cbd);border-radius:16px;padding:12px 8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;min-height:100px;">' +
        checkEl +
        removeEl +
        '<div style="font-size:32px;line-height:1;">' + emoji + '</div>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--ink);margin-top:4px;">' + item.w + '</div>' +
        badgeEl +
      '</div>';
    }

    return '<div style="display:flex;flex-direction:column;min-height:100vh;">' +
      '<div style="padding:18px 18px 0;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
          '<button onclick="window.__goParent()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--accent3);">はっけん準備</div>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:16px;">🎟️ ' + (s.tickets || 0) + '</div>' +
        '</div>' +
        '<div style="font-size:14px;color:var(--sub);text-align:center;margin-bottom:4px;">お子さまが なぞって はっけんする ことばを えらんでね</div>' +
        '<div style="font-size:12px;color:var(--sub);text-align:center;margin-bottom:16px;">プリセットに ない ことば ＝ 🎟️1まい</div>' +
        '<div style="display:flex;gap:10px;margin-bottom:12px;">' +
          '<input id="prep-input" type="text" value="' + (s.prepInput || '') + '" oninput="window.__updatePrepInput(this)" placeholder="ことばを にゅうりょく" style="flex:1;min-height:54px;border-radius:16px;border:2px solid var(--cbd);padding:0 16px;font-size:18px;font-family:var(--fhead);background:#fff;color:var(--ink);outline:none;" />' +
          '<button onclick="window.__addPrepWord()" style="width:54px;height:54px;border-radius:16px;background:var(--accent3);color:#fff;font-size:26px;font-weight:900;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:none;">＋</button>' +
        '</div>' +
        '<button onclick="window.__rollRandom()" style="width:100%;min-height:48px;border-radius:16px;background:#fff;border:2px dashed var(--accent3);color:var(--accent3);font-size:16px;font-weight:700;margin-bottom:16px;box-shadow:none;">🎲 ランダム候補を 3つ だす</button>' +
      '</div>' +
      '<div style="flex:1;padding:0 18px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">' +
          cards +
        '</div>' +
      '</div>' +
      '<div style="position:sticky;bottom:0;background:var(--bg);padding:16px 18px 8px;">' +
        '<button onclick="window.__openSeedConfirm()" style="width:100%;min-height:78px;border-radius:22px;background:' + btnBg + ';box-shadow:' + btnShadow + ';font-size:22px;font-weight:900;color:#fff;">⭐ ' + okCount + ' こ 仕込む</button>' +
        '<div style="text-align:center;font-size:12px;color:var(--sub);margin-top:8px;padding-bottom:12px;">仕込んだ言葉は ずかんに『?』で ならびます</div>' +
      '</div>' +
    '</div>';
  }

  function renderHakkenGen(s) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;' +
      'background:radial-gradient(circle,#fff3d6 0%,#fbeaf1 100%);">' +
      '<div style="font-size:30px;margin-bottom:16px;">✨⭐✨</div>' +
      '<div style="font-size:96px;line-height:1;background:#fff;border-radius:44px;width:140px;height:140px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.08);animation:bob 2s ease-in-out infinite;">🔮</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:24px;color:var(--ink);margin-top:24px;">あたらしい ことばを つくっているよ</div>' +
      '<div style="display:flex;gap:8px;margin-top:16px;">' +
        '<div style="width:12px;height:12px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out infinite;"></div>' +
        '<div style="width:12px;height:12px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .2s infinite;"></div>' +
        '<div style="width:12px;height:12px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .4s infinite;"></div>' +
      '</div>' +
      '<div style="font-size:16px;color:var(--sub);margin-top:12px;">AIが えと せつめいを かいているよ…</div>' +
    '</div>';
  }

  function renderSheet(s) {
    if (s.sheet === 'hint') {
      var hw = s.hintWord || '';
      var hpreset = PRESETS[hw] || { emoji: '📖', desc: '' };
      var hdesc = hpreset.desc || '';
      var hintText = hdesc.indexOf('。') !== -1 ? hdesc.slice(0, hdesc.indexOf('。') + 1) : hdesc;
      var charBoxes = '';
      for (var i = 0; i < hw.length; i++) {
        if (i === 0) {
          charBoxes += '<div style="width:48px;height:48px;border-radius:12px;background:var(--accent2);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fhead);font-weight:900;font-size:24px;">' + hw[i] + '</div>';
        } else {
          charBoxes += '<div style="width:48px;height:48px;border-radius:12px;background:var(--locked);color:#c4b6a0;display:flex;align-items:center;justify-content:center;font-family:var(--fhead);font-weight:900;font-size:24px;">?</div>';
        }
      }
      return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div>' +
        '<div class="sheet">' +
          '<div style="width:44px;height:5px;border-radius:3px;background:#e6ddcf;margin:0 auto 18px;"></div>' +
          '<div style="text-align:center;font-size:80px;">' + hpreset.emoji + '</div>' +
          '<div style="display:flex;justify-content:center;gap:8px;margin:16px 0;">' + charBoxes + '</div>' +
          '<div style="font-size:16px;color:#7a7060;text-align:center;margin:12px 0 20px;">' + hintText + '</div>' +
          '<button onclick="window.__closeSheet()" style="width:100%;min-height:64px;border-radius:18px;background:var(--accent2);font-size:20px;box-shadow:0 6px 0 var(--accent2d);">わかった！</button>' +
        '</div>';
    }
    if (s.sheet === 'signup') {
      var collectedCount = s.collected ? s.collected.length : 0;
      return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div>' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div style="width:44px;height:5px;border-radius:3px;background:#e6ddcf;margin:0 auto 18px;"></div>' +
          '<div style="text-align:center;font-size:46px;">🔑📚</div>' +
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:24px;margin-top:8px;">じぶんの 図鑑を とっておこう</div>' +
          '<div style="text-align:center;font-size:14px;color:#7a7060;line-height:1.7;margin-top:8px;">いま集めた <b style="color:var(--accent);">' + collectedCount + 'けん</b> をそのまま引き継ぎ。<br>登録すると <b style="color:var(--accent);">はっけんチケット 5まい</b> プレゼント🎁</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;margin-top:22px;">' +
            '<button onclick="window.__doSignup()" style="min-height:64px;border-radius:18px;background:var(--ink);color:#fff;font-size:18px;box-shadow:0 4px 0 rgba(0,0,0,.3);">✉️ メールで はじめる</button>' +
            '<div style="display:flex;gap:12px;">' +
              '<button onclick="window.__doSignup()" style="flex:1;min-height:60px;border-radius:18px;background:#fff;border:2px solid #e6ddcf;font-size:16px;box-shadow:none;color:var(--ink);"> Apple</button>' +
              '<button onclick="window.__doSignup()" style="flex:1;min-height:60px;border-radius:18px;background:#fff;border:2px solid #e6ddcf;font-size:16px;box-shadow:none;color:var(--ink);">G Google</button>' +
            '</div>' +
            '<button onclick="window.__closeSheet()" style="min-height:48px;background:transparent;color:var(--sub);font-weight:700;font-size:15px;box-shadow:none;">あとで</button>' +
          '</div>' +
          '<div style="text-align:center;font-size:11.5px;color:#b6ab9a;margin-top:10px;line-height:1.5;">🔒 登録は保護者のためのものです。お子さまの個人情報は集めません。</div>' +
        '</div>';
    }
    if (s.sheet === 'tickets') {
      return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div><div class="sheet"><p>[tickets sheet placeholder]</p></div>';
    }
    if (s.sheet === 'prepconfirm') {
      var selWords = [];
      for (var pi = 0; pi < (s.prepSel || []).length; pi++) {
        if (s.prepSel[pi].selected && s.prepSel[pi].status === 'ok') {
          selWords.push(s.prepSel[pi].w);
        }
      }
      var wList = '';
      for (var wi = 0; wi < selWords.length; wi++) {
        wList += '<div style="display:inline-block;background:#fbeaf1;color:#9c4d70;font-weight:700;font-size:15px;padding:4px 12px;border-radius:10px;margin:4px;">' + selWords[wi] + '</div>';
      }
      return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div>' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div style="width:44px;height:5px;border-radius:3px;background:#e6ddcf;margin:0 auto 18px;"></div>' +
          '<div style="text-align:center;font-size:36px;">⭐🎟️</div>' +
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:22px;margin-top:8px;">' + selWords.length + ' こ 仕込む？</div>' +
          '<div style="display:flex;flex-wrap:wrap;justify-content:center;margin:16px 0;">' + wList + '</div>' +
          '<div style="font-size:13px;color:var(--sub);text-align:center;margin-bottom:8px;">チケットは…図鑑にできた時（生成成功時）に 1枚ずつ</div>' +
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:18px;color:var(--accent);margin-bottom:16px;">いま 🎟️ ' + (s.tickets || 0) + '</div>' +
          '<div style="display:flex;gap:12px;">' +
            '<button onclick="window.__confirmSeed()" style="flex:1;min-height:64px;border-radius:18px;background:var(--accent3);color:#fff;font-size:18px;font-weight:900;box-shadow:0 4px 0 var(--accent3d);">⭐ 仕込む</button>' +
            '<button onclick="window.__closeSheet()" style="flex:1;min-height:64px;border-radius:18px;background:var(--locked);color:var(--sub);font-size:18px;box-shadow:none;">やめる</button>' +
          '</div>' +
          '<div style="text-align:center;font-size:11px;color:#b6ab9a;margin-top:12px;line-height:1.5;">仕込み・支払いは保護者メニューの中だけ。お子さまは課金画面に触れません</div>' +
        '</div>';
    }
    if (s.sheet === 'parentGate') {
      return '<div class="sheet-overlay" onclick="window.__closeSheet()" style="background:rgba(20,15,10,.45);"></div>' +
        '<div class="sheet" onclick="event.stopPropagation()" style="border-radius:28px 28px 0 0;">' +
          '<div style="width:44px;height:5px;border-radius:3px;background:#e6ddcf;margin:0 auto 18px;"></div>' +
          '<div style="text-align:center;font-size:40px;margin-bottom:8px;">🏠</div>' +
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:22px;margin-bottom:8px;">おうちの ひと メニュー</div>' +
          '<div style="text-align:center;font-size:14px;color:var(--sub);margin-bottom:24px;">ボタンを 1.2秒 長押しで はいれます</div>' +
          '<button onpointerdown="window.__pgDown(event)" onpointerup="window.__pgUp()" onpointerleave="window.__pgUp()" onpointercancel="window.__pgUp()" style="width:100%;min-height:80px;border-radius:20px;background:var(--ink);color:#fff;font-size:18px;position:relative;overflow:hidden;box-shadow:0 6px 0 rgba(0,0,0,.3);touch-action:none;user-select:none;">' +
            '<div id="pg-bar" style="position:absolute;top:0;left:0;bottom:0;width:0%;background:var(--accent);opacity:0.35;pointer-events:none;"></div>' +
            '<span style="position:relative;z-index:1;">ながおし で はいる</span>' +
          '</button>' +
          '<button onclick="window.__closeSheet()" style="width:100%;min-height:48px;background:transparent;color:var(--sub);font-size:15px;box-shadow:none;margin-top:10px;">とじる</button>' +
        '</div>';
    }
    return '';
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
    var dpr = window.devicePixelRatio || 1;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    var ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
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

  window.__goStoryPick = function () {
    playSound('tap');
    var defaultSel = state.collected.slice(0, 3);
    setState({ screen: 'storyPick', storySel: defaultSel });
  };

  window.__toggleStorySel = function (word) {
    playSound('tap');
    var sel = state.storySel || [];
    var idx = sel.indexOf(word);
    if (idx !== -1) {
      setState({ storySel: sel.filter(function(w) { return w !== word; }) });
    } else if (sel.length < 5) {
      setState({ storySel: sel.concat([word]) });
    }
  };

  window.__goStory = function () {
    if ((state.storySel || []).length < 2) return;
    playSound('tap');
    setState({ screen: 'story', storyLoading: true });
  };

  window.__closeSheet = function () {
    playSound('cancel');
    setState({ sheet: null });
  };

  window.__goHome = function () {
    playSound('cancel');
    _canvasWired = null;
    setState({ screen: 'home', sheet: null });
  };

  window.__goWrite = function () {
    playSound('tap');
    _canvasWired = null;
    setState({ screen: 'write', word: nextWord(), charIndex: 0, confirmed: [] });
  };

  window.__goZukan = function () {
    playSound('tap');
    var c = state.collected.length;
    var sheet = null;
    if (!state.authed) {
      var due = (c === 3 || c === 5 || c === 10 || c > 10);
      if (due && _lastPromptCount !== c) {
        sheet = 'signup';
        _lastPromptCount = c;
      }
    }
    setState({ screen: 'zukan', sheet: sheet });
  };

  window.__showSignup = function () {
    setState({ sheet: 'signup' });
  };

  window.__showParentGate = function () {
    playSound('tap');
    setState({ sheet: 'parentGate' });
  };

  window.__pgDown = function (e) {
    e.preventDefault();
    _pgStart = Date.now();
    function tick() {
      if (_pgStart === null) return;
      var elapsed = Date.now() - _pgStart;
      var pct = Math.min(100, (elapsed / 1200) * 100);
      var bar = document.getElementById('pg-bar');
      if (bar) bar.style.width = pct + '%';
      if (pct < 100) {
        _pgRaf = requestAnimationFrame(tick);
      }
    }
    _pgRaf = requestAnimationFrame(tick);
    _pgTimer = setTimeout(function () {
      _pgStart = null;
      cancelAnimationFrame(_pgRaf);
      playSound('success');
      console.log('[parent-gate] passed');
      setState({ screen: 'parent', sheet: null });
    }, 1200);
  };

  window.__pgUp = function () {
    if (_pgStart === null) return;
    clearTimeout(_pgTimer);
    cancelAnimationFrame(_pgRaf);
    _pgStart = null;
    var bar = document.getElementById('pg-bar');
    if (bar) bar.style.width = '0%';
  };

  window.__showHint = function (word) {
    playSound('tap');
    setState({ sheet: 'hint', hintWord: word });
  };

  window.__doSignup = function () {
    setState({ authed: true, tickets: 5, sheet: null });
  };

  window.__openDetail = function (word) {
    setState({ screen: 'detail', detailWord: word });
  };

  window.__setTheme = function (t) {
    var app = document.getElementById('app');
    if (app) app.dataset.theme = t;
    setState({ theme: t });
  };

  window.__toggleSfx = function () {
    setState({ sfx: state.sfx === false ? true : false });
  };

  window.__toggleBgm = function () {
    setState({ bgm: !state.bgm });
  };

  window.__confirmChar = function () {
    var word = state.word;
    var idx = state.charIndex;
    var nc = state.confirmed.concat([word[idx]]);

    var dataURL = null;
    var c = document.getElementById('trace-canvas');
    if (c) {
      dataURL = c.toDataURL('image/png');
    }
    var hw = Object.assign({}, state.handwriting);
    if (dataURL) {
      hw[word] = (hw[word] || []).concat([dataURL]);
    }

    if (idx + 1 >= word.length) {
      playSound('success');
      _canvasWired = null;
      if (state.discovering) {
        setState({ confirmed: nc, charIndex: idx + 1, screen: 'hakkengen', handwriting: hw });
        window.__startHakkenGen();
      } else {
        var col = state.collected.indexOf(word) === -1
          ? state.collected.concat([word])
          : state.collected;
        if (state.authed) {
          fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: word })
          });
        }
        setState({ confirmed: nc, charIndex: idx + 1, screen: 'reveal', collected: col, lastHakken: false, handwriting: hw });
      }
    } else {
      playSound('confirm');
      _canvasWired = null;
      setState({ confirmed: nc, charIndex: idx + 1, handwriting: hw });
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
    var word = state.word;
    if (state.handwriting[word] && state.handwriting[word].length > 0) {
      var hw = Object.assign({}, state.handwriting);
      hw[word] = hw[word].slice(0, -1);
      state.handwriting = hw;
      saveState();
    }
  };

  window.__goParent = function() {
    playSound('cancel');
    setState({ screen: 'parent', sheet: null });
  };

  window.__goPrep = function() {
    playSound('tap');
    if (!state.authed) {
      setState({ sheet: 'signup' });
      return;
    }
    setState({ screen: 'prep', prepInput: '', prepSel: [] });
  };

  window.__addPrepWord = function() {
    var word = state.prepInput.trim();
    if (!word) return;
    playSound('tap');
    var status = classify(word);
    var existing = state.prepSel.filter(function(p) { return p.w === word; });
    if (existing.length > 0) return;
    var sel = state.prepSel.concat([{ w: word, status: status, selected: status === 'ok' }]);
    setState({ prepSel: sel, prepInput: '' });
  };

  window.__rollRandom = function() {
    playSound('tap');
    var available = [];
    for (var i = 0; i < HAKKEN_WORDS.length; i++) {
      var w = HAKKEN_WORDS[i];
      if (state.collected.indexOf(w) === -1 && state.seeded.indexOf(w) === -1) {
        var alreadyInSel = false;
        for (var j = 0; j < state.prepSel.length; j++) {
          if (state.prepSel[j].w === w) { alreadyInSel = true; break; }
        }
        if (!alreadyInSel) available.push(w);
      }
    }
    for (var k = available.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = available[k]; available[k] = available[r]; available[r] = tmp;
    }
    var picked = available.slice(0, 3);
    var newSel = state.prepSel.slice();
    for (var m = 0; m < picked.length; m++) {
      newSel.push({ w: picked[m], status: 'ok', selected: true });
    }
    setState({ prepSel: newSel });
  };

  window.__togglePrepSel = function(word) {
    playSound('tap');
    var sel = state.prepSel.map(function(p) {
      if (p.w === word && p.status === 'ok') {
        return { w: p.w, status: p.status, selected: !p.selected };
      }
      return p;
    });
    setState({ prepSel: sel });
  };

  window.__removePrepSel = function(word) {
    playSound('cancel');
    var sel = state.prepSel.filter(function(p) { return p.w !== word; });
    setState({ prepSel: sel });
  };

  window.__updatePrepInput = function(el) {
    state.prepInput = el.value;
  };

  window.__openSeedConfirm = function() {
    var okCount = 0;
    for (var i = 0; i < state.prepSel.length; i++) {
      if (state.prepSel[i].selected && state.prepSel[i].status === 'ok') okCount++;
    }
    if (okCount === 0) return;
    playSound('tap');
    setState({ sheet: 'prepconfirm' });
  };

  window.__confirmSeed = function() {
    playSound('success');
    var newSeeded = state.seeded.slice();
    for (var i = 0; i < state.prepSel.length; i++) {
      if (state.prepSel[i].selected && state.prepSel[i].status === 'ok') {
        newSeeded.push(state.prepSel[i].w);
      }
    }
    setState({ seeded: newSeeded, prepSel: [], sheet: null, screen: 'parent' });
  };

  window.__openSecret = function(word) {
    playSound('tap');
    _canvasWired = null;
    setState({ screen: 'write', word: word, charIndex: 0, confirmed: [], discovering: true });
  };

  window.__startHakkenGen = function() {
    var word = state.word;
    fetch('/api/hakken/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: word, userId: 'local' })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      window.__finishHakken(data.emoji || '✨', data.description || '');
    })
    .catch(function() {
      window.__finishHakken('✨', 'あたらしく はっけんした ことばだよ！');
    });
  };

  window.__finishHakken = function(emoji, desc) {
    playSound('success');
    var word = state.word;
    var col = state.collected.indexOf(word) === -1
      ? state.collected.concat([word])
      : state.collected;
    var disc = state.discovered.indexOf(word) === -1
      ? state.discovered.concat([word])
      : state.discovered;
    var newSeeded = state.seeded.filter(function(w) { return w !== word; });
    var tickets = Math.max(0, (state.tickets || 0) - 1);

    if (!window.__hakkenCache) window.__hakkenCache = {};
    window.__hakkenCache[word] = { emoji: emoji, desc: desc };

    setState({
      screen: 'reveal',
      collected: col,
      discovered: disc,
      seeded: newSeeded,
      tickets: tickets,
      lastHakken: true,
      discovering: false
    });
  };

  render(state);
})();
`;

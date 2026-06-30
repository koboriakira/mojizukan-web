import { clientDictionary } from "./dictionary";

export const clientApp = `
(function () {
  ${clientDictionary}

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
      localStorage.setItem('mojizukan_entries', JSON.stringify(state.zukanWords));
      localStorage.setItem('mojizukan_discovered', JSON.stringify(state.hakkenWords));
      localStorage.setItem('mojizukan_handwriting', JSON.stringify(state.handwriting));
      localStorage.setItem('mojizukan_prepared', JSON.stringify(state.prepared));
      localStorage.setItem('mojizukan_hakken_max', String(state.dailyHakkenMax));
      localStorage.setItem('mojizukan_hakken_used', String(state.dailyHakkenUsed));
      localStorage.setItem('mojizukan_hakken_date', new Date().toISOString().slice(0,10));
    } catch(e) {}
  }

  function loadState() {
    if (!_hasStorage) return {};
    try {
      var entries = JSON.parse(localStorage.getItem('mojizukan_entries') || '[]');
      var discovered = JSON.parse(localStorage.getItem('mojizukan_discovered') || '[]');
      var handwriting = JSON.parse(localStorage.getItem('mojizukan_handwriting') || '{}');
      var prepared = JSON.parse(localStorage.getItem('mojizukan_prepared') || '[]');
      var hakkenMax = parseInt(localStorage.getItem('mojizukan_hakken_max') || '3', 10);
      var hakkenUsed = parseInt(localStorage.getItem('mojizukan_hakken_used') || '0', 10);
      var hakkenDate = localStorage.getItem('mojizukan_hakken_date') || '';
      var today = new Date().toISOString().slice(0,10);
      if (hakkenDate !== today) { hakkenUsed = 0; }
      return { zukanWords: entries, hakkenWords: discovered, handwriting: handwriting, prepared: prepared, dailyHakkenMax: hakkenMax, dailyHakkenUsed: hakkenUsed };
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
    zukanWords: saved.zukanWords || [],
    hakkenWords: saved.hakkenWords || [],
    handwriting: saved.handwriting || {},
    authed: false,
    userId: null,
    tickets: 0,
    authMode: 'choose',
    authError: '',
    lastHakken: false,
    sheet: null,
    hintWord: null,
    sfx: true,
    bgm: false,
    speak: true,
    theme: 'A',
    storySel: [],
    storyPages: null,
    storyPage: 0,
    storyLoading: false,
    storyFade: '',
    stories: [],
    readingStoryId: null,
    authReason: null,
    imgStyle: 'ehon',
    mode: 'omakase',
    prepared: saved.prepared || [],
    discovering: false,
    prepInput: '',
    prepSel: [],
    revealKind: 'normal',
    tankenChars: [],
    tankenMsg: null,
    tankenMode: false,
    dailyHakkenMax: saved.dailyHakkenMax || 3,
    dailyHakkenUsed: saved.dailyHakkenUsed || 0,
    limitWord: '',
    drew: false,
    genCached: false,
    genPhase: 1
  };

  var _lastPromptCount = 0;

  var _canvasWired = null;
  var _ink = null;
  var _mask = null;
  var _parts = [];
  var _drawing = false;
  var _raf = 0;
  var _actx = null;
  var _lastChime = 0;

  window.__STYLE_LABELS = { honwaka: 'ほんわか', ehon: 'えほん', pop: 'ポップ', watercolor: 'やさしい水彩', zukan: 'ずかん' };
  window.__STYLE_DESCS = { honwaka: 'パステルカラーでまるっとやさしい', ehon: '鉛筆と水彩のあたたかい絵本タッチ', pop: 'はっきりした線とカラフルなまんが風', watercolor: '透明感のあるにじみが美しい水彩画', zukan: 'リアルな図鑑イラスト風' };

  var _audioEnabled = false;
  var _audioCache = {};

  var _pgTimer = null;
  var _pgStart = null;
  var _pgRaf = null;

  function renderEmojiOrImage(imageUrl, size) {
    if (imageUrl) {
      return '<img src="' + imageUrl + '" alt="" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;border-radius:12px;">';
    }
    return '';
  }

  function getHakkenImageUrl(word) {
    return (window.__hakkenCache && window.__hakkenCache[word] && window.__hakkenCache[word].image_url) || null;
  }

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

  function speakText(text) {
    if (!state.speak) return;
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.85;
      u.pitch = 1.2;
      window.speechSynthesis.speak(u);
    } catch(e) {}
  }

  function setState(partial) {
    Object.assign(state, partial);
    render(state);
    saveState();
  }

  function updateWriteUI() {
    var word = state.word || '';
    var btn = document.getElementById('confirm-btn-wrap');
    var msg = document.getElementById('encourage-msg');
    if (btn) {
      btn.innerHTML = state.drew
        ? '<button onclick="window.__confirmChar()" style="width:100%;min-height:80px;border-radius:22px;background:var(--accent2);font-size:26px;font-weight:900;box-shadow:0 6px 0 var(--accent2d);">' + ((state.charIndex || 0) + 1 >= word.length ? 'できた！' : 'なぞれたよ！') + '</button>'
        : '<button style="width:100%;min-height:80px;border-radius:22px;background:#d8cfc0;color:#fff;font-size:26px;font-weight:900;box-shadow:0 5px 0 #bfb6a6;cursor:default;">かいて みよう</button>';
    }
    if (msg) {
      msg.innerHTML = state.drew ? '<span style="color:#3f8e63;">いいね！かけたら ボタンを おしてね</span>' : '<span style="color:#b6ab9a;">ゆびで なぞってね ✏️</span>';
    }
  }

  function render(s) {
    var app = document.getElementById('app');
    if (!app) return;
    app.dataset.theme = s.theme || 'A';
    app.innerHTML = renderScreen(s);
    if (s.sheet) {
      app.innerHTML += renderSheet(s);
    }
    if (s.screen === 'reveal' || s.screen === 'detail') {
      speakText(s.word || s.detailWord || '');
    }
    if (s.screen === 'trace') {
      setTimeout(setupCanvas, 0);
    }
  }

  function renderScreen(s) {
    switch (s.screen) {
      case 'home':      return renderHome(s);
      case 'trace':     return renderWrite(s);
      case 'reveal':    return renderReveal(s);
      case 'zukan':     return renderZukan(s);
      case 'detail':    return renderDetail(s);
      case 'storyPick': return renderStoryPick(s);
      case 'storyhome': return renderStoryHome(s);
      case 'storyread': return renderStoryRead(s);
      case 'parent':    return renderParent(s);
      case 'mitsukeru': return renderMitsukeru(s);
      case 'tanken':      return renderTanken(s);
      case 'tankenlimit': return renderTankenlimit(s);
      case 'prep':        return renderPrep(s);
      case 'hakkengen': return renderHakkenGen(s);
      case 'hakkengenError': return renderHakkenGenError(s);
      case 'story':     return renderStory(s);
      default:          return '<p>不明な画面: ' + s.screen + '</p>';
    }
  }

  function classify(word) {
    var ngWords = [];
    for (var i = 0; i < ngWords.length; i++) {
      if (word.indexOf(ngWords[i]) !== -1) return 'ng';
    }
    if (DICTIONARY[word]) return 'dict';
    if (state.zukanWords.indexOf(word) !== -1) return 'rediscovery';
    if (state.prepared.indexOf(word) !== -1) return 'prepared';
    return 'ok';
  }

  function classifyTanken(word) {
    if (!word || word.length === 0) return 'ng';
    var ngWords = [];
    for (var i = 0; i < ngWords.length; i++) {
      if (word.indexOf(ngWords[i]) !== -1) return 'ng';
    }
    if (state.zukanWords.indexOf(word) !== -1 || state.hakkenWords.indexOf(word) !== -1) return 'rediscovery';
    if (DICTIONARY[word]) return 'dict';
    return 'hakken';
  }

  function renderHome(s) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;">' +
      '<div style="font-size:80px;line-height:1;">📖✏️</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:clamp(48px,15vw,72px);color:var(--ink);margin:18px 0 6px;letter-spacing:.02em;">もじずかん</div>' +
      '<div style="font-size:18px;color:var(--sub);font-weight:700;margin-bottom:44px;">もじを かいて あつめよう</div>' +
      '<div style="width:100%;max-width:380px;display:flex;flex-direction:column;gap:18px;">' +
        '<button onclick="window.__goMitsukeru()" style="min-height:90px;background:var(--accent2);box-shadow:0 6px 0 var(--accent2d);font-size:28px;font-weight:900;border-radius:22px;">🔍 みつける</button>' +
        '<div style="position:relative;">' +
          '<button onclick="window.__goTanken()" style="min-height:90px;width:100%;background:var(--accent);box-shadow:0 6px 0 var(--accentd);font-size:28px;font-weight:900;border-radius:22px;">🧭 たんけんに でる</button>' +
          '<div style="position:absolute;top:-8px;right:8px;background:#fff;color:var(--accent);font-size:11px;font-weight:900;padding:2px 8px;border-radius:4px;transform:rotate(6deg);font-family:var(--fhead);pointer-events:none;border:1.5px solid var(--accent);">NEW</div>' +
        '</div>' +
        '<div style="display:flex;gap:14px;">' +
          '<button onclick="window.__goZukan()" style="flex:1;min-height:72px;background:var(--accent2);box-shadow:0 6px 0 var(--accent2d);font-size:22px;font-weight:900;border-radius:22px;">📖 ずかん</button>' +
          '<div style="position:relative;flex:1;">' +
            '<button onclick="window.__goStoryHome()" style="width:100%;min-height:72px;background:var(--accent3);box-shadow:0 6px 0 var(--accent3d);font-size:22px;font-weight:900;border-radius:22px;color:#fff;">📚 おはなし</button>' +
            (!s.authed ? '<div style="position:absolute;top:-6px;right:6px;font-size:16px;pointer-events:none;">🔒</div>' : '') +
          '</div>' +
        '</div>' +
        '<button onclick="window.__showParentGate()" style="min-height:60px;background:transparent;color:var(--sub);font-weight:700;font-size:18px;box-shadow:none;">🏠 おうちの ひとは こちら</button>' +
        (!s.authed ? '<button onclick="window.__showLogin()" style="min-height:44px;background:transparent;color:var(--accent);font-weight:700;font-size:15px;box-shadow:none;">🔑 まえの つづきから あそぶ</button>' : '') +
      '</div>' +
    '</div>';
  }

  function renderMitsukeru(s) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
      '<div style="font-size:80px;line-height:1;margin-bottom:16px;animation:bob 2s ease-in-out infinite;">🌟</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:28px;color:var(--accent2);margin-bottom:12px;">いまの ことばは<br>ぜんぶ みつけたよ！</div>' +
      '<div style="font-size:16px;color:var(--sub);font-weight:600;line-height:1.8;margin-bottom:36px;">あたらしい ことばは<br>おうちの ひとに そうだんしてね</div>' +
      '<button onclick="window.__showParentGate()" style="min-height:72px;width:100%;max-width:340px;border-radius:22px;background:var(--accent2);font-size:22px;font-weight:900;box-shadow:0 6px 0 var(--accent2d);">🏠 おうちの ひとに みせる</button>' +
      '<button onclick="window.__goHome()" style="min-height:52px;width:100%;max-width:340px;background:transparent;color:var(--sub);font-weight:700;font-size:16px;box-shadow:none;margin-top:12px;">← もどる</button>' +
    '</div>';
  }

  function renderTanken(s) {
    var chars = s.tankenChars || [];
    var maxChars = 6;

    var slots = '';
    for (var si = 0; si < maxChars; si++) {
      var ch = si < chars.length ? chars[si] : '';
      var bg = ch ? 'var(--accent)' : 'var(--locked)';
      var color = ch ? '#fff' : '#c4b6a0';
      slots += '<div style="width:48px;height:48px;border-radius:14px;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-family:var(--fhead);font-weight:900;font-size:26px;color:' + color + ';">' + (ch || '') + '</div>';
    }

    var grid = '';
    for (var ri = 0; ri < ROWS.length; ri++) {
      for (var ci = 0; ci < ROWS[ri].length; ci++) {
        var c = ROWS[ri][ci];
        if (c === '') {
          grid += '<div></div>';
        } else {
          grid += '<button onclick="window.__tkAdd(\\'' + c + '\\')" style="min-height:48px;border-radius:12px;background:#fff;font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--ink);box-shadow:0 2px 0 rgba(0,0,0,.06);">' + c + '</button>';
        }
      }
    }

    var msgBanner = '';
    if (s.tankenMsg) {
      var msgColor = s.tankenMsg.type === 'ng' ? '#b03a3a' : (s.tankenMsg.type === 'rediscovery' ? '#2d7a2d' : 'var(--sub)');
      var msgBg = s.tankenMsg.type === 'ng' ? '#fbe6e6' : (s.tankenMsg.type === 'rediscovery' ? '#e6f5e6' : '#f5ede6');
      msgBanner = '<div style="background:' + msgBg + ';color:' + msgColor + ';font-weight:700;font-size:15px;padding:10px 16px;border-radius:14px;text-align:center;margin-bottom:12px;">' + s.tankenMsg.text + '</div>';
    }

    var word = chars.join('');
    var canSubmit = chars.length >= 2;
    var btnBg = canSubmit ? 'var(--accent)' : '#d8cfc0';
    var btnShadow = canSubmit ? '0 6px 0 var(--accentd)' : '0 6px 0 #bfb6a6';

    return '<div style="display:flex;flex-direction:column;min-height:100vh;">' +
      '<div style="padding:18px 18px 0;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
          '<button onclick="window.__goHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--accent);">🧭 たんけん</div>' +
          '<div style="width:56px;display:flex;justify-content:center;gap:4px;">' +
            (function() { var pips = ''; for (var pi = 0; pi < s.dailyHakkenMax; pi++) { pips += '<div style="width:10px;height:10px;border-radius:50%;background:' + (pi < s.dailyHakkenUsed ? 'var(--accent)' : 'var(--locked)') + ';"></div>'; } return pips; })() +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:center;gap:8px;margin-bottom:8px;">' + slots + '</div>' +
        '<div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;">' +
          (chars.length > 0 ? '<button onclick="window.__tkClearAll()" style="min-height:36px;padding:0 14px;border-radius:10px;background:var(--locked);color:var(--sub);font-size:13px;font-weight:700;box-shadow:none;">ぜんぶ けす</button>' : '') +
        '</div>' +
        msgBanner +
      '</div>' +
      '<div style="flex:1;padding:0 12px;">' +
        '<div style="display:flex;justify-content:center;gap:8px;margin-bottom:10px;">' +
          '<button onclick="window.__tkBack()" style="flex:1;max-width:80px;min-height:42px;border-radius:12px;background:#fff;font-size:16px;box-shadow:0 2px 0 rgba(0,0,0,.06);">⌫</button>' +
          '<button onclick="window.__tkDaku()" style="flex:1;max-width:56px;min-height:42px;border-radius:12px;background:#fff;font-size:20px;box-shadow:0 2px 0 rgba(0,0,0,.06);">゛</button>' +
          '<button onclick="window.__tkHandaku()" style="flex:1;max-width:56px;min-height:42px;border-radius:12px;background:#fff;font-size:20px;box-shadow:0 2px 0 rgba(0,0,0,.06);">゜</button>' +
          '<button onclick="window.__tkSmall()" style="flex:1;max-width:56px;min-height:42px;border-radius:12px;background:#fff;font-size:16px;font-weight:700;box-shadow:0 2px 0 rgba(0,0,0,.06);">小</button>' +
          '<button onclick="window.__tkChouon()" style="flex:1;max-width:56px;min-height:42px;border-radius:12px;background:#fff;font-size:20px;box-shadow:0 2px 0 rgba(0,0,0,.06);">ー</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-width:320px;margin:0 auto;">' + grid + '</div>' +
      '</div>' +
      '<div style="position:sticky;bottom:0;background:var(--bg);padding:16px 18px 28px;">' +
        '<button onclick="window.__tkNext()" style="width:100%;min-height:78px;border-radius:22px;background:' + btnBg + ';box-shadow:' + btnShadow + ';font-size:22px;font-weight:900;color:#fff;">' +
          (canSubmit ? '✏️ これを かく（' + chars.length + 'もじ）' : 'もじを えらんでね') +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderTankenlimit(s) {
    var lw = s.limitWord || '';
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
      '<div style="font-size:80px;animation:bob 2s ease-in-out infinite;">🌙</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:28px;color:var(--ink);margin-top:20px;">きょうの たんけんは おしまい！</div>' +
      (lw ? '<div style="font-size:18px;color:var(--sub);font-weight:700;margin-top:12px;">「' + lw + '」は あした はっけん できるよ</div>' : '') +
      '<div style="display:flex;gap:14px;margin-top:36px;width:100%;max-width:400px;">' +
        '<button onclick="window.__goMitsukeru()" style="flex:1;min-height:72px;border-radius:20px;background:var(--accent2);font-size:20px;box-shadow:0 6px 0 var(--accent2d);">🔍 みつける へ</button>' +
        '<button onclick="window.__goHome()" style="flex:1;min-height:72px;border-radius:20px;background:var(--accent);font-size:20px;box-shadow:0 6px 0 var(--accentd);">🏠 ホーム</button>' +
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
      var boxChar = done ? s.confirmed[i] : '';
      charBoxes +=
        '<div style="width:64px;height:64px;border-radius:16px;background:' + bg + ';border:' + border + ';display:flex;align-items:center;justify-content:center;font-family:var(--fhead);font-weight:900;font-size:32px;color:' + color + ';">' +
          boxChar +
        '</div>';
    }

    return '<div style="flex:1;display:flex;flex-direction:column;padding:18px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<button onclick="window.__goHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:20px;color:var(--sub);">' + (s.revealKind === 'mitsuke' ? 'なぞって みよう！なにが でるかな？' : '「' + word + '」を なぞろう') + '</div>' +
        '<button onclick="window.__speakChar()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">🔊</button>' +
      '</div>' +
      '<div style="display:flex;justify-content:center;gap:12px;margin:6px 0 14px;">' +
        charBoxes +
      '</div>' +
      '<div style="position:relative;width:100%;max-width:380px;aspect-ratio:1;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 4px 16px rgba(0,0,0,.07);overflow:hidden;touch-action:none;">' +
        '<canvas id="trace-canvas" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none;"></canvas>' +
      '</div>' +
      '<div id="encourage-msg" style="text-align:center;min-height:20px;font-size:14.5px;font-weight:700;margin:8px 0 0;">' +
        (s.drew ? '<span style="color:#3f8e63;">いいね！かけたら ボタンを おしてね</span>' : '<span style="color:#b6ab9a;">ゆびで なぞってね ✏️</span>') +
      '</div>' +
      '<div style="display:flex;justify-content:center;gap:14px;margin:14px auto 0;max-width:380px;width:100%;">' +
        '<button onclick="window.__undo()" style="flex:1;min-height:60px;border-radius:18px;background:#fff;color:var(--sub);font-size:17px;box-shadow:0 4px 0 rgba(0,0,0,.07);">↩ もどす</button>' +
        '<button onclick="window.__clearCanvas()" style="flex:1;min-height:60px;border-radius:18px;background:#fff;color:#d9694f;font-size:17px;box-shadow:0 4px 0 rgba(0,0,0,.07);">🧹 けす</button>' +
      '</div>' +
      '<div id="confirm-btn-wrap" style="max-width:380px;width:100%;margin:16px auto 0;">' +
        (s.drew
          ? '<button onclick="window.__confirmChar()" style="width:100%;min-height:80px;border-radius:22px;background:var(--accent2);font-size:26px;font-weight:900;box-shadow:0 6px 0 var(--accent2d);">' + (s.charIndex + 1 >= word.length ? 'できた！' : 'なぞれたよ！') + '</button>'
          : '<button style="width:100%;min-height:80px;border-radius:22px;background:#d8cfc0;color:#fff;font-size:26px;font-weight:900;box-shadow:0 5px 0 #bfb6a6;cursor:default;">かいて みよう</button>') +
      '</div>' +
    '</div>';
  }

  function renderReveal(s) {
    var word = s.word || '';
    var preset = DICTIONARY[word] || (window.__hakkenCache && window.__hakkenCache[word] ?
      { cat: 'はっけん', catIcon: '⭐', desc: window.__hakkenCache[word].desc, image_url: window.__hakkenCache[word].image_url } :
      { cat: '', catIcon: '', desc: '', image_url: null });
    var kind = s.revealKind || 'normal';
    var title;
    if (kind === 'review' || kind === 'tanken-rediscovery') {
      title = 'また かけたね！😊';
    } else if (s.lastHakken) {
      title = kind === 'tanken' ? 'あたらしい ことば はっけん！⭐' : 'みつけた！⭐';
    } else {
      title = 'ずかんに のったよ！🎉';
    }
    var nextAction = (kind === 'tanken' || kind === 'tanken-rediscovery')
      ? '<button onclick="window.__goTanken()" style="flex:1;min-height:76px;border-radius:20px;background:var(--accent);font-size:21px;box-shadow:0 6px 0 var(--accentd);">🧭 たんけんに もどる</button>'
      : '<button onclick="window.__goMitsukeru()" style="flex:1;min-height:76px;border-radius:20px;background:var(--accent);font-size:21px;box-shadow:0 6px 0 var(--accentd);">🔍 つぎも みつける</button>';

    var reviewBanner = '';
    if (kind === 'review' || kind === 'tanken-rediscovery') {
      reviewBanner = '<div style="background:linear-gradient(135deg,#fef9ef,#fdf3e0);border:2px solid var(--accent2);border-radius:18px;padding:16px;margin-top:20px;max-width:340px;text-align:left;">' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--accent2);margin-bottom:8px;">もういちど はっけん しよう！</div>' +
        '<div style="font-size:14px;color:#5a5145;line-height:1.7;margin-bottom:10px;">なんども かけて すごい！<br>あたらしい ことばも かいて みたいね。</div>' +
        '<div style="font-size:12px;color:var(--sub);line-height:1.6;border-top:1px solid rgba(0,0,0,.08);padding-top:8px;">おうちの方へ：あたらしい ことばを おぼえる チャンスです。「ひみつの ことば」を 図鑑に 追加して あげましょう。</div>' +
      '</div>';
    }

    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:30px;color:var(--accent);">' + title + '</div>' +
      '<div style="margin:14px 0 4px;">' + renderEmojiOrImage(preset.image_url || getHakkenImageUrl(word), 130) + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;">' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:56px;color:var(--ink);">' + word + '</div>' +
        '<button onclick="window.__speakWord()" style="width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;">🔊</button>' +
      '</div>' +
      (preset.cat ? '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--accent2);color:#fff;font-family:var(--fhead);font-weight:700;font-size:16px;padding:5px 14px;border-radius:20px;margin:12px 0 16px;">' + preset.catIcon + ' ' + preset.cat + '</div>' : '') +
      '<div style="font-size:22px;line-height:1.8;color:#5a5145;white-space:pre-line;max-width:340px;font-weight:500;">' + preset.desc + '</div>' +
      reviewBanner +
      '<div style="display:flex;gap:14px;margin-top:36px;width:100%;max-width:400px;">' +
        nextAction +
        '<button onclick="window.__goZukan()" style="flex:1;min-height:76px;border-radius:20px;background:var(--accent2);font-size:21px;box-shadow:0 6px 0 var(--accent2d);">📚 ずかんを みる</button>' +
      '</div>' +
    '</div>';
  }

  function renderZukan(s) {
    var count = s.zukanWords.length;

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

    var secretSection = '';
    if (s.prepared && s.prepared.length > 0) {
      secretSection += '<div style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">' +
        '<span style="font-size:22px;">⭐</span>' +
        '<span style="font-family:var(--fhead);font-weight:900;font-size:20px;color:#9c4d70;">ひみつの ことば ' + s.prepared.length + 'こ</span>' +
      '</div>';
      secretSection += '<div style="font-size:14px;color:#9c4d70;margin-bottom:12px;">? を かいて はっけんしよう！</div>';
      secretSection += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px;margin-bottom:26px;">';
      for (var si = 0; si < s.prepared.length; si++) {
        var sw = s.prepared[si];
        secretSection += '<button onclick="window.__openSecret(\\'' + sw + '\\')" style="background:#fff;border:2px dashed #e3b8cd;border-radius:20px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:none;cursor:pointer;">' +
          '<span style="font-size:38px;font-weight:900;color:#c2698f;line-height:1;">?</span>' +
          '<span style="font-size:11px;color:#c2698f;font-weight:700;">かいて みよう</span>' +
        '</button>';
      }
      secretSection += '</div>';
    } else if (s.authed) {
      secretSection += '<button onclick="window.__showParentGate()" style="width:100%;text-align:left;background:linear-gradient(135deg,#fbeaf1,#f7dfe9);border:2px solid var(--accent3);border-radius:18px;padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:18px;box-shadow:none;">' +
        '<span style="font-size:26px;">⭐</span>' +
        '<span>' +
          '<span style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--accent3);display:block;">ひみつのことばを しこもう</span>' +
          '<span style="font-size:12.5px;color:var(--sub);">おうちの ひと メニューから ことばを えらべるよ</span>' +
        '</span>' +
      '</button>';
    }

    var sections = '';
    for (var ci = 0; ci < CATEGORIES.length; ci++) {
      var cat = CATEGORIES[ci];
      var catWords = [];
      for (var w in DICTIONARY) {
        if (DICTIONARY[w].cat === cat.name) catWords.push(w);
      }
      if (catWords.length === 0) continue;

      var gotCount = 0;
      for (var j = 0; j < catWords.length; j++) {
        if (s.zukanWords.indexOf(catWords[j]) !== -1) gotCount++;
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
        var preset = DICTIONARY[cw];
        if (s.zukanWords.indexOf(cw) !== -1) {
          sections += '<button onclick="window.__openDetail(\\'' + cw + '\\')" style="background:var(--card);border:3px solid var(--cbd);border-radius:20px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:none;">' +
            renderEmojiOrImage(getHakkenImageUrl(cw), 40) +
            '<span style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--ink);">' + cw + '</span>' +
          '</button>';
        } else {
          sections += '<button onclick="window.__showHint(\\'' + cw + '\\')" style="background:var(--locked);border-radius:20px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:#c4b6a0;font-size:32px;font-weight:900;border:none;cursor:pointer;">?</button>';
        }
      }
      sections += '</div>';
    }

    if (s.hakkenWords && s.hakkenWords.length > 0) {
      sections += '<div style="display:flex;align-items:center;gap:8px;margin:0 0 12px;">' +
        '<span style="font-size:22px;">⭐</span>' +
        '<span style="font-family:var(--fhead);font-weight:900;font-size:20px;">はっけん</span>' +
        '<span style="font-size:14px;color:var(--sub);font-weight:700;">' + s.hakkenWords.length + 'こ</span>' +
      '</div>';
      sections += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px;margin-bottom:26px;">';
      for (var di = 0; di < s.hakkenWords.length; di++) {
        var dw = s.hakkenWords[di];
        var dImageUrl = getHakkenImageUrl(dw);
        sections += '<button onclick="window.__openDetail(\\'' + dw + '\\')" style="background:var(--card);border:3px solid #f3dd9a;border-radius:20px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:none;">' +
          renderEmojiOrImage(dImageUrl, 40) +
          '<span style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--ink);">' + dw + '</span>' +
          '<span style="font-size:10px;color:var(--accent3);font-weight:700;">はっけん</span>' +
        '</button>';
      }
      sections += '</div>';
    }

    if (count === 0) {
      sections += '<div style="text-align:center;padding:48px 0;color:var(--sub);font-size:18px;font-weight:700;">' +
        '<div style="font-size:48px;margin-bottom:16px;">📖</div>' +
        'まだ なにも あつめてないよ<br>「はじめる」で もじを かこう！' +
      '</div>';
    }

    return '<div style="flex:1;padding:18px 0;">' + header + secretSection + sections + '</div>';
  }

  function renderDetail(s) {
    var word = s.detailWord || '';
    var preset = DICTIONARY[word] || { cat: '', catIcon: '', desc: '' };

    return '<div style="flex:1;display:flex;flex-direction:column;padding-top:18px;">' +
      '<div style="display:flex;align-items:center;margin-bottom:8px;">' +
        '<button onclick="window.__goZukan()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">' +
        '<div style="width:220px;height:220px;border-radius:36px;background:var(--card);border:4px solid var(--cbd);display:flex;align-items:center;justify-content:center;">' + renderEmojiOrImage(getHakkenImageUrl(word), 130) + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:20px;">' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:52px;">' + word + '</div>' +
          '<button onclick="window.__speakWord()" style="width:50px;height:50px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;">🔊</button>' +
        '</div>' +
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
      for (var w in DICTIONARY) {
        if (DICTIONARY[w].cat === cat.name) catWords.push(w);
      }
      if (catWords.length === 0) continue;
      var gotCount = 0;
      for (var j = 0; j < catWords.length; j++) {
        if (s.zukanWords.indexOf(catWords[j]) !== -1) gotCount++;
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
        '<div style="font-family:var(--fhead);font-weight:900;font-size:20px;">おうちの方メニュー</div>' +
        '<div style="width:56px;"></div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;margin-bottom:18px;box-shadow:0 3px 10px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-weight:700;font-size:17px;">チケット</div>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:26px;color:var(--accent);">🎟️ ' + (s.tickets || 0) + '</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;margin-bottom:18px;box-shadow:0 3px 10px rgba(0,0,0,.06);">' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:18px;margin-bottom:12px;">📖 学習の記録</div>' +
        '<div style="font-size:16px;color:var(--sub);font-weight:700;margin-bottom:12px;">習得数: <span style="font-size:28px;color:var(--accent);font-family:var(--fhead);">' + s.zukanWords.length + '</span> 個</div>' +
        catProgress +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;margin-bottom:18px;box-shadow:0 3px 10px rgba(0,0,0,.06);">' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:18px;margin-bottom:10px;">🔍🧭 みつける と たんけん</div>' +
        '<div style="font-size:13px;color:#6b6256;margin-bottom:12px;">「みつける」は プリセット語を なぞって あつめるモード。「たんけん」は じぶんで ことばを つくって はっけんするモードです。</div>' +
        (s.prepared && s.prepared.length > 0 ?
          '<div style="background:#fff;border:1px solid var(--cbd);border-radius:12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
            '<span style="font-size:14px;color:var(--sub);font-weight:700;">⭐ 仕込み中の秘密のことば</span>' +
            '<span style="font-family:var(--fhead);font-weight:900;font-size:18px;color:var(--accent3);">' + (s.prepared ? s.prepared.length : 0) + '</span>' +
          '</div>'
        : '') +
        '<button onclick="window.__goPrep()" style="width:100%;min-height:52px;border-radius:14px;background:var(--accent3);color:#fff;font-size:15px;font-weight:900;margin-bottom:14px;box-shadow:none;">＋ 言葉を仕込む</button>' +
        '<div style="background:#f5f0e8;border-radius:14px;padding:14px 16px;margin-bottom:8px;">' +
          '<div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:10px;">🧭 たんけんの1日の回数</div>' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:16px;">' +
            '<button onclick="window.__decDaily()" style="width:44px;height:44px;border-radius:50%;background:#fff;font-size:22px;font-weight:900;box-shadow:0 2px 0 rgba(0,0,0,.06);color:var(--ink);">−</button>' +
            '<div style="font-family:var(--fhead);font-weight:900;font-size:36px;color:var(--accent);min-width:48px;text-align:center;">' + (s.dailyHakkenMax || 3) + '</div>' +
            '<button onclick="window.__incDaily()" style="width:44px;height:44px;border-radius:50%;background:#fff;font-size:22px;font-weight:900;box-shadow:0 2px 0 rgba(0,0,0,.06);color:var(--ink);">＋</button>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--sub);text-align:center;margin-top:8px;">0にするとたんけんをお休みできます</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#fff;border-radius:18px;padding:16px 20px;box-shadow:0 3px 10px rgba(0,0,0,.06);">' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:18px;margin-bottom:16px;">⚙️ 設定</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--cbd);">' +
          '<div><span style="font-size:16px;font-weight:700;">🗣️ 読み上げ</span><div style="font-size:12px;color:var(--sub);margin-top:2px;">まだ字が読めないお子さま向け</div></div>' +
          '<button onclick="window.__toggleSpeak()" style="min-width:72px;min-height:40px;border-radius:20px;font-size:15px;font-weight:700;' +
            (s.speak !== false ? 'background:var(--accent2);color:#fff;box-shadow:0 3px 0 var(--accent2d);' : 'background:var(--locked);color:var(--sub);box-shadow:none;') + '">' +
            (s.speak !== false ? 'ON' : 'OFF') + '</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--cbd);">' +
          '<span style="font-size:16px;font-weight:700;">🔊 効果音</span>' +
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
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--cbd);">' +
          '<div><span style="font-size:16px;font-weight:700;">🖼️ イラストスタイル</span><div style="font-size:12px;color:var(--sub);margin-top:2px;">はっけん時の絵のタッチを選べます</div></div>' +
          '<button onclick="window.__openStylePicker()" style="min-width:100px;min-height:40px;border-radius:20px;font-size:14px;font-weight:700;background:var(--accent2);color:#fff;box-shadow:0 3px 0 var(--accent2d);">' + (window.__STYLE_LABELS && window.__STYLE_LABELS[s.imgStyle] || s.imgStyle) + ' ›</button>' +
        '</div>' +
        '<div style="padding:12px 0 0;">' +
          '<div style="font-size:16px;font-weight:700;margin-bottom:10px;">🎨 配色テーマ</div>' +
          '<div style="display:flex;gap:10px;">' + themeButtons + '</div>' +
        '</div>' +
        (s.authed ?
          '<div style="padding:16px 0 0;border-top:1px solid var(--cbd);margin-top:16px;">' +
            '<button onclick="window.__logout()" style="width:100%;min-height:44px;border-radius:14px;background:transparent;border:1px solid #c44;color:#c44;font-size:14px;font-weight:700;box-shadow:none;">ログアウト</button>' +
          '</div>'
        : '') +
      '</div>' +
    '</div>';
  }

  function renderStoryHome(s) {
    var storyList = s.stories || [];
    var anyWriting = storyList.some(function(st) { return st.status === 'writing'; });

    var writingBanner = '';
    if (anyWriting) {
      writingBanner =
        '<div style="background:linear-gradient(135deg,#fbeaf1,#fff3d6);border:2px solid #e3b8cd;border-radius:20px;padding:18px;margin-bottom:18px;text-align:center;">' +
          '<div style="font-size:28px;animation:bob 2s ease-in-out infinite;">✏️</div>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--ink);margin:8px 0 4px;">おはなしを かいているよ（1ぷんくらい）</div>' +
          '<div style="font-size:13px;color:var(--sub);margin-bottom:12px;">まっている あいだに あたらしい ことばを みつけに いこう！</div>' +
          '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button onclick="window.__goMitsukeru()" style="min-height:44px;padding:0 18px;border-radius:14px;background:var(--accent2);box-shadow:0 3px 0 var(--accent2d);font-size:15px;font-weight:900;color:#fff;">🔍 みつける</button>' +
            '<button onclick="window.__goTanken()" style="min-height:44px;padding:0 18px;border-radius:14px;background:var(--accent);box-shadow:0 3px 0 var(--accentd);font-size:15px;font-weight:900;color:#fff;">🧭 たんけん</button>' +
          '</div>' +
        '</div>';
    }

    var listHtml = '';
    if (storyList.length === 0) {
      listHtml =
        '<div style="border:3px dashed var(--cbd);border-radius:20px;padding:32px;text-align:center;color:var(--sub);">' +
          '<div style="font-size:15px;font-weight:700;line-height:1.8;">まだ おはなしが ないよ。<br>「つくる」を おして、はじめての えほんを つくろう！</div>' +
        '</div>';
    } else {
      for (var si = 0; si < storyList.length; si++) {
        var st = storyList[si];
        var isDone = st.status === 'done';
        var wordsLabel = (st.words || []).join('・');
        var tints = ['#fbe7d8', '#e3f0e6', '#e9ebfa'];
        var coverTint = tints[si % tints.length];
        var coverEmojis = '';
        for (var ei = 0; ei < Math.min(2, (st.words || []).length); ei++) {
          coverEmojis += renderEmojiOrImage(getHakkenImageUrl((st.words || [])[ei]), 28);
        }
        var dateStr = st.created_at ? st.created_at.slice(0, 10).replace(/-/g, '/') : '';
        var sub = isDone
          ? '<div style="font-size:13px;color:var(--sub);">' + dateStr + ' に できた ・ よむ ›</div>'
          : '<div style="font-size:13px;color:var(--accent3);font-weight:900;">かいているよ…<span style="display:inline-flex;gap:3px;vertical-align:middle;margin-left:4px;"><span style="width:5px;height:5px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out infinite;"></span><span style="width:5px;height:5px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .2s infinite;"></span><span style="width:5px;height:5px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .4s infinite;"></span></span></div>';
        var onclick = isDone ? 'onclick="window.__goStoryRead(\\'' + st.id + '\\')"' : '';
        var cursor = isDone ? 'cursor:pointer;' : 'opacity:0.8;';
        listHtml +=
          '<div ' + onclick + ' style="display:flex;align-items:center;gap:14px;background:#fff;border:2px solid var(--cbd);border-radius:20px;padding:12px;box-shadow:0 3px 0 rgba(0,0,0,.04);' + cursor + '">' +
            '<div style="width:64px;height:64px;border-radius:16px;background:' + coverTint + ';display:flex;align-items:center;justify-content:center;gap:4px;flex-shrink:0;">' + coverEmojis + '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-family:var(--fhead);font-weight:900;font-size:17px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + wordsLabel + '</div>' +
              sub +
            '</div>' +
            (isDone ? '<div style="font-size:20px;color:var(--sub);">›</div>' : '') +
          '</div>';
      }
    }

    return '<div style="display:flex;flex-direction:column;min-height:100vh;">' +
      '<div style="padding:18px 18px 0;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">' +
          '<button onclick="window.__goHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--accent3);">📚 おはなし</div>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--accent);">🎟️ ' + (s.tickets || 0) + '</div>' +
        '</div>' +
        '<button onclick="window.__goStoryPick()" style="width:100%;min-height:86px;border-radius:22px;background:var(--accent3);box-shadow:0 6px 0 var(--accent3d);font-size:23px;font-weight:900;color:#fff;margin-bottom:18px;display:flex;align-items:center;justify-content:center;gap:8px;">' +
          '<span style="font-size:28px;">✏️</span> あたらしい おはなしを つくる' +
        '</button>' +
        '<div style="font-size:13px;color:var(--sub);text-align:center;margin-bottom:14px;">ことばを えらんで AIが えほんに ・ 🎟️1まい</div>' +
        writingBanner +
        '<div style="font-size:16px;font-weight:900;color:var(--sub);margin-bottom:12px;">つくった おはなし</div>' +
      '</div>' +
      '<div style="flex:1;padding:0 18px 28px;display:flex;flex-direction:column;gap:12px;">' +
        listHtml +
      '</div>' +
    '</div>';
  }

  function renderStoryRead(s) {
    var story = null;
    for (var i = 0; i < (s.stories || []).length; i++) {
      if (s.stories[i].id === s.readingStoryId) { story = s.stories[i]; break; }
    }
    if (!story || !story.pages) {
      return '<div style="flex:1;display:flex;align-items:center;justify-content:center;"><div style="color:var(--sub);">おはなしが みつかりません</div></div>';
    }

    var pages = story.pages;
    var idx = s.storyPage || 0;
    var page = pages[idx] || { hero: [], tokens: [] };
    var tints = ['#fbe7d8', '#e3f0e6', '#e9ebfa'];
    var tint = tints[idx % tints.length];
    var fadeStyle = s.storyFade ? 'animation:fade .28s ease;' : '';

    var heroEmojis = '';
    var heroSizePx = page.hero.length > 1 ? 78 : 104;
    for (var hi = 0; hi < page.hero.length; hi++) {
      heroEmojis += renderEmojiOrImage(getHakkenImageUrl(page.hero[hi]), heroSizePx);
    }
    var heroLabels = '';
    for (var hli = 0; hli < page.hero.length; hli++) {
      heroLabels += '<span style="background:rgba(255,255,255,.7);padding:4px 12px;border-radius:12px;font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--ink);">' + page.hero[hli] + '</span>';
    }

    var body = '';
    for (var ti = 0; ti < page.tokens.length; ti++) {
      var tok = page.tokens[ti];
      if (tok.t === 'word' && tok.w) {
        var hw = s.handwriting && s.handwriting[tok.w];
        if (hw && hw.length) {
          for (var hwi = 0; hwi < hw.length; hwi++) {
            body += '<img src="' + hw[hwi] + '" style="height:34px;width:34px;object-fit:contain;vertical-align:middle;display:inline-block;margin:0 2px;background:#fff;border:2px solid var(--cbd);border-radius:8px;padding:2px;" />';
          }
        } else {
          body += '<span style="font-family:var(--fhead);font-weight:900;font-size:26px;color:var(--accent);text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px;">' + tok.w + '</span>';
        }
      } else {
        body += '<span>' + (tok.s || '') + '</span>';
      }
    }

    var isFirst = idx === 0;
    var isLast = idx === pages.length - 1;

    var dots = '';
    for (var di = 0; di < pages.length; di++) {
      var dotW = di === idx ? '26px' : '10px';
      var dotBg = di === idx ? 'var(--accent3)' : '#e2d6c6';
      dots += '<div style="width:' + dotW + ';height:10px;border-radius:5px;background:' + dotBg + ';transition:width .2s;"></div>';
    }

    var bottomBtn = isLast
      ? '<button onclick="window.__goStoryHome()" style="width:100%;max-width:400px;min-height:64px;border-radius:20px;background:var(--accent3);font-size:20px;font-weight:900;box-shadow:0 6px 0 var(--accent3d);color:#fff;margin-top:16px;">📚 ほんだなに もどる</button>'
      : '';

    return '<div style="flex:1;display:flex;flex-direction:column;padding:18px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
        '<button onclick="window.__goStoryHome()" style="width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;">←</button>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:20px;color:var(--accent3);">📖 おはなし</div>' +
        '<div style="width:48px;"></div>' +
      '</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;background:#fffdf7;border:2px solid var(--cbd);border-radius:28px;box-shadow:0 6px 20px rgba(0,0,0,.08);overflow:hidden;' + fadeStyle + '">' +
        '<div style="min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:' + tint + ';padding:30px 20px;gap:12px;">' +
          '<div style="display:flex;gap:8px;">' + heroEmojis + '</div>' +
          '<div style="display:flex;gap:8px;">' + heroLabels + '</div>' +
        '</div>' +
        '<div style="padding:20px 22px;font-size:24px;line-height:2;font-weight:500;color:#3a332a;display:flex;flex-wrap:wrap;align-items:flex-end;">' +
          body +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:18px;">' +
        '<button onclick="window.__storyReadPrev()" style="width:54px;height:54px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;color:var(--accent3);opacity:' + (isFirst ? '.3' : '1') + ';">‹</button>' +
        '<div style="display:flex;gap:6px;align-items:center;">' + dots + '</div>' +
        '<button onclick="window.__storyReadNext()" style="width:54px;height:54px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;color:var(--accent3);opacity:' + (isLast ? '.3' : '1') + ';">›</button>' +
      '</div>' +
      '<div style="text-align:center;">' + bottomBtn + '</div>' +
    '</div>';
  }

  function renderStoryPick(s) {
    var sel = s.storySel || [];
    var zukanList = s.zukanWords || [];

    var cells = '';
    for (var i = 0; i < zukanList.length; i++) {
      var w = zukanList[i];
      var preset = DICTIONARY[w] || {};
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
          renderEmojiOrImage(getHakkenImageUrl(w), 34) +
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
          '<button onclick="window.__goStoryHome()" style="width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:24px;padding:0;">←</button>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--ink);">おはなしを つくる</div>' +
          '<div style="font-family:var(--fhead);font-weight:900;font-size:16px;color:var(--accent);">🎟️ ' + (s.tickets || 0) + '</div>' +
        '</div>' +
        '<div style="text-align:center;color:var(--sub);font-size:15px;font-weight:700;margin-bottom:4px;">つかう ことばを えらんでね</div>' +
        '<div style="text-align:center;color:var(--sub);font-size:13px;margin-bottom:18px;">2〜5こ ・ おはなし1つに 🎟️1まい</div>' +
      '</div>' +
      '<div style="flex:1;padding:0 18px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px;">' +
          cells +
        '</div>' +
      '</div>' +
      '<div style="position:sticky;bottom:0;background:var(--bg);padding:16px 18px 28px;">' +
        '<button onclick="window.__makeStory()" style="width:100%;min-height:80px;border-radius:22px;background:' + btnBg + ';box-shadow:' + btnShadow + ';font-size:22px;font-weight:900;color:#fff;">' +
          '📖 つくる（' + selCount + '/5 ・ 🎟️1）' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderStory(s) {
    if (s.storyLoading || !s.storyPages) {
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
        '<div style="font-size:64px;animation:bob 2s ease-in-out infinite;">✏️</div>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--ink);margin:16px 0 12px;">AIが おはなしを かいているよ</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;">' +
          '<div style="width:10px;height:10px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out infinite;"></div>' +
          '<div style="width:10px;height:10px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .2s infinite;"></div>' +
          '<div style="width:10px;height:10px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .4s infinite;"></div>' +
        '</div>' +
      '</div>';
    }

    var pages = s.storyPages;
    var idx = s.storyPage || 0;
    var page = pages[idx] || { hero: [], tokens: [] };
    var tints = ['var(--story-tint-0)', 'var(--story-tint-1)', 'var(--story-tint-2)'];
    var tint = tints[idx % tints.length];
    var fadeStyle = s.storyFade ? 'animation:fade .28s ease;' : '';

    var heroEmojis = '';
    for (var hi = 0; hi < page.hero.length; hi++) {
      heroEmojis += renderEmojiOrImage(getHakkenImageUrl(page.hero[hi]), 72);
    }

    var body = '';
    for (var ti = 0; ti < page.tokens.length; ti++) {
      var tok = page.tokens[ti];
      if (tok.t === 'word' && tok.w) {
        var hw = s.handwriting && s.handwriting[tok.w];
        if (hw && hw.length) {
          for (var hwi = 0; hwi < hw.length; hwi++) {
            body += '<img src="' + hw[hwi] + '" style="height:34px;vertical-align:middle;display:inline-block;margin:0 2px;" />';
          }
        } else {
          body += '<span style="color:var(--accent3);font-weight:900;">' + tok.w + '</span>';
        }
      } else {
        body += '<span>' + (tok.s || '') + '</span>';
      }
    }

    var isFirst = idx === 0;
    var isLast = idx === pages.length - 1;
    var prevOpacity = isFirst ? '0.3' : '1';
    var nextOpacity = isLast ? '0.3' : '1';

    var dots = '';
    for (var di = 0; di < pages.length; di++) {
      var dotBg = di === idx ? 'var(--accent3)' : '#d8cfc0';
      dots += '<div style="width:10px;height:10px;border-radius:50%;background:' + dotBg + ';"></div>';
    }

    var isError = pages.length === 1 && page.hero.length === 0;
    var bottomButtons = isLast
      ? '<div style="display:flex;gap:14px;width:100%;max-width:400px;margin-top:16px;">' +
          '<button onclick="window.__storyRestart()" style="flex:1;min-height:64px;border-radius:20px;background:var(--accent3);font-size:20px;font-weight:900;box-shadow:0 6px 0 var(--accent3d);color:#fff;">🔄 もういちど</button>' +
          (isError ? '' : '<button onclick="window.__goHome()" style="flex:1;min-height:64px;border-radius:20px;background:var(--accent2);font-size:20px;font-weight:900;box-shadow:0 6px 0 var(--accent2d);">できた！</button>') +
        '</div>'
      : '';

    return '<div style="flex:1;display:flex;flex-direction:column;padding:18px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
        '<button onclick="window.__goHome()" style="width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;">←</button>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:20px;color:var(--accent3);">📖 おはなし</div>' +
        '<div style="width:48px;"></div>' +
      '</div>' +
      '<div onclick="window.__storyNext()" style="flex:1;display:flex;flex-direction:column;background:#fffdf7;border-radius:28px;box-shadow:0 4px 16px rgba(0,0,0,.08);overflow:hidden;cursor:pointer;' + fadeStyle + '" id="story-card">' +
        '<div style="flex:1;display:flex;align-items:center;justify-content:center;background:' + tint + ';padding:24px;gap:8px;">' +
          heroEmojis +
        '</div>' +
        '<div style="padding:20px 22px;font-size:24px;line-height:2;font-weight:500;color:#5a5145;">' +
          body +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-top:14px;">' +
        '<button onclick="window.__storyPrev()" style="width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;opacity:' + prevOpacity + ';">‹</button>' +
        '<div style="display:flex;gap:6px;">' + dots + '</div>' +
        '<button onclick="window.__storyNext()" style="width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08);font-size:22px;padding:0;opacity:' + nextOpacity + ';">›</button>' +
      '</div>' +
      bottomButtons +
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
      ok:     { text: '発見OK',              tc: '#9c4d70', bg: '#fbeaf1' },
      rediscovery: { text: 'もういちど はっけん！', tc: '#2d7a2d', bg: '#e6f5e6' },
      prepared: { text: '仕込み済み',          tc: '#8a6d1e', bg: '#fdf3d6' },
      dict:   { text: '辞書にあり・無料',    tc: '#3f7a52', bg: '#e6f1e9' },
      ng:     { text: 'この言葉は使えません', tc: '#b03a3a', bg: '#fbe6e6' }
    };

    var cards = '';
    for (var j = 0; j < prepSel.length; j++) {
      var item = prepSel[j];
      var meta = statusMeta[item.status] || statusMeta.ok;
      var checkEl = (item.selected && item.status === 'ok')
        ? '<div style="position:absolute;top:6px;left:6px;width:24px;height:24px;border-radius:50%;background:var(--accent3);color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;font-weight:900;">✓</div>'
        : '';
      var removeEl = '<div onclick="event.stopPropagation();window.__removePrepSel(\\'' + item.w + '\\')" style="position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;background:#f5ede6;color:#9a8878;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:900;">✕</div>';
      var badgeEl = '<div style="font-size:11px;font-weight:700;color:' + meta.tc + ';background:' + meta.bg + ';padding:3px 8px;border-radius:8px;margin-top:4px;">' + meta.text + '</div>';
      cards += '<div onclick="window.__togglePrepSel(\\'' + item.w + '\\')" style="position:relative;background:#fff;border:2px solid var(--cbd);border-radius:16px;padding:12px 8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;min-height:100px;">' +
        checkEl +
        removeEl +
        '<div style="line-height:1;">' + renderEmojiOrImage(getHakkenImageUrl(item.w), 32) + '</div>' +
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
        '<div style="font-size:14px;color:var(--sub);text-align:center;margin-bottom:4px;">お子さまがなぞって発見する言葉を選んでください</div>' +
        '<div style="font-size:12px;color:var(--sub);text-align:center;margin-bottom:16px;">プリセットにない言葉 ＝ 🎟️1枚</div>' +
        '<div style="display:flex;gap:10px;margin-bottom:12px;">' +
          '<input id="prep-input" type="text" value="' + (s.prepInput || '') + '" oninput="window.__updatePrepInput(this)" placeholder="ことばを入力" style="flex:1;min-height:54px;border-radius:16px;border:2px solid var(--cbd);padding:0 16px;font-size:18px;font-family:var(--fhead);background:#fff;color:var(--ink);outline:none;" />' +
          '<button onclick="window.__addPrepWord()" style="width:54px;height:54px;border-radius:16px;background:var(--accent3);color:#fff;font-size:26px;font-weight:900;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:none;">＋</button>' +
        '</div>' +
        '<button onclick="window.__rollRandom()" style="width:100%;min-height:48px;border-radius:16px;background:#fff;border:2px dashed var(--accent3);color:var(--accent3);font-size:16px;font-weight:700;margin-bottom:16px;box-shadow:none;">🎲 ランダム候補を3つ出す</button>' +
      '</div>' +
      '<div style="flex:1;padding:0 18px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">' +
          cards +
        '</div>' +
      '</div>' +
      '<div style="position:sticky;bottom:0;background:var(--bg);padding:16px 18px 8px;">' +
        '<button onclick="window.__openSeedConfirm()" style="width:100%;min-height:78px;border-radius:22px;background:' + btnBg + ';box-shadow:' + btnShadow + ';font-size:22px;font-weight:900;color:#fff;">⭐ ' + okCount + '個 仕込む</button>' +
        '<div style="text-align:center;font-size:12px;color:var(--sub);margin-top:8px;padding-bottom:12px;">仕込んだ言葉は ずかんに『?』で ならびます</div>' +
      '</div>' +
    '</div>';
  }

  function renderHakkenGen(s) {
    var dots = '<div style="display:flex;gap:8px;margin-top:16px;">' +
      '<div style="width:12px;height:12px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out infinite;"></div>' +
      '<div style="width:12px;height:12px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .2s infinite;"></div>' +
      '<div style="width:12px;height:12px;border-radius:50%;background:var(--accent3);animation:dotpulse 1.2s ease-in-out .4s infinite;"></div>' +
    '</div>';
    var styleLabel = (window.__STYLE_LABELS && window.__STYLE_LABELS[s.imgStyle]) || s.imgStyle || '';
    var styleChip = styleLabel ? '<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.7);padding:4px 12px;border-radius:12px;font-size:13px;font-weight:700;color:var(--sub);margin-top:12px;">🎨 ' + styleLabel + ' スタイル</div>' : '';
    var phase = s.genPhase || 1;

    if (s.genCached) {
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;' +
        'background:radial-gradient(circle,#d6f5e0 0%,#e8faf0 100%);">' +
        '<div style="font-size:30px;margin-bottom:16px;">✨⭐✨</div>' +
        '<div style="font-size:96px;line-height:1;background:#fff;border-radius:44px;width:140px;height:140px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.08);animation:pop .4s ease-out;">📖</div>' +
        '<div style="font-family:var(--fhead);font-weight:900;font-size:24px;color:var(--ink);margin-top:24px;">ことばを よびだして いるよ</div>' +
        dots + styleChip +
        '<div style="font-size:14px;color:var(--sub);margin-top:12px;">ずかんから すぐに もってくるよ…</div>' +
      '</div>';
    }

    var icon, bg, anim, msg, footer;
    if (phase === 1) {
      icon = '🔍'; bg = 'radial-gradient(circle,#ffe0f0 0%,#fbeaf1 100%)'; anim = 'bob 1.1s ease-in-out infinite';
      msg = 'ことばを さがして いるよ';
      footer = 'AIが えと せつめいを かいているよ…';
    } else {
      icon = '🔎'; bg = 'radial-gradient(circle,#e8d8f8 0%,#f0eafa 100%)'; anim = 'bob .8s ease-in-out infinite';
      msg = 'うーん、むずかしい ことば！<br>もっと しらべて いるよ';
      footer = 'AIが えと せつめいを かいているよ…';
    }

    var badge = phase >= 2 ? '<div style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#fff3d6,#ffe8b8);padding:6px 14px;border-radius:14px;font-size:13px;font-weight:700;color:#b8860b;margin-top:12px;animation:rise .4s ease-out;">🌟 はじめての ことばを つくっているよ</div>' : '';

    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;' +
      'background:' + bg + ';">' +
      '<div style="font-size:30px;margin-bottom:16px;">✨⭐✨</div>' +
      '<div style="font-size:96px;line-height:1;background:#fff;border-radius:44px;width:140px;height:140px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.08);animation:' + anim + ';">' + icon + '</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:24px;color:var(--ink);margin-top:24px;">' + msg + '</div>' +
      dots + styleChip + badge +
      '<div style="font-size:14px;color:var(--sub);margin-top:12px;">' + footer + '</div>' +
    '</div>';
  }

  function renderHakkenGenError(s) {
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">' +
      '<div style="font-size:64px;margin-bottom:16px;">😢</div>' +
      '<div style="font-family:var(--fhead);font-weight:900;font-size:22px;color:var(--ink);margin-bottom:12px;">つくれなかったよ</div>' +
      '<div style="font-size:16px;color:var(--sub);margin-bottom:32px;">もう いちど ためしてね</div>' +
      '<button onclick="window.__startHakkenGen()" style="min-height:64px;padding:0 32px;border-radius:18px;background:var(--accent);font-size:20px;box-shadow:0 6px 0 var(--accentd);">もう いちど</button>' +
      '<button onclick="window.__goHome()" style="min-height:48px;padding:0 24px;border-radius:14px;background:transparent;font-size:16px;color:var(--sub);margin-top:16px;">ホームに もどる</button>' +
    '</div>';
  }

  function renderSheet(s) {
    if (s.sheet === 'hint') {
      var hw = s.hintWord || '';
      var hpreset = DICTIONARY[hw] || { desc: '' };
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
          '<div style="text-align:center;">' + renderEmojiOrImage(getHakkenImageUrl(hw), 80) + '</div>' +
          '<div style="display:flex;justify-content:center;gap:8px;margin:16px 0;">' + charBoxes + '</div>' +
          '<div style="font-size:16px;color:#7a7060;text-align:center;margin:12px 0 20px;">' + hintText + '</div>' +
          '<button onclick="window.__closeSheet()" style="width:100%;min-height:64px;border-radius:18px;background:var(--accent2);font-size:20px;box-shadow:0 6px 0 var(--accent2d);">わかった！</button>' +
        '</div>';
    }
    if (s.sheet === 'signup') {
      var zukanCount = s.zukanWords ? s.zukanWords.length : 0;
      var authMode = s.authMode || 'choose';
      var authError = s.authError || '';
      var errorHtml = authError ? '<div style="color:#c44;font-size:13px;text-align:center;margin-bottom:8px;">' + authError + '</div>' : '';
      var formHtml = '';
      if (authMode === 'choose') {
        formHtml =
          '<div style="display:flex;flex-direction:column;gap:12px;margin-top:22px;">' +
            '<button onclick="window.__setAuthMode(\\'email-signup\\')" style="min-height:64px;border-radius:18px;background:var(--ink);color:#fff;font-size:18px;box-shadow:0 4px 0 rgba(0,0,0,.3);">✉️ メールで はじめる</button>' +
            '<button onclick="window.__googleLogin()" style="min-height:60px;border-radius:18px;background:#fff;border:2px solid #e6ddcf;font-size:16px;box-shadow:none;color:var(--ink);">G Google で ログイン</button>' +
            '<button onclick="window.__setAuthMode(\\'email-login\\')" style="min-height:48px;background:transparent;color:var(--sub);font-weight:700;font-size:15px;box-shadow:none;">メールで ログイン</button>' +
            '<button onclick="window.__closeSheet()" style="min-height:48px;background:transparent;color:var(--sub);font-weight:700;font-size:15px;box-shadow:none;">あとで</button>' +
          '</div>';
      } else {
        var isLogin = authMode === 'email-login';
        var title = isLogin ? 'ログイン' : 'アカウント作成';
        var submitLabel = isLogin ? 'ログイン' : 'とうろく';
        var switchLabel = isLogin ? 'アカウントを つくる →' : 'ログインは こちら →';
        var switchMode = isLogin ? 'email-signup' : 'email-login';
        formHtml =
          '<div style="display:flex;flex-direction:column;gap:12px;margin-top:18px;">' +
            '<div style="font-weight:700;font-size:16px;text-align:center;">' + title + '</div>' +
            errorHtml +
            '<input id="auth-email" type="email" placeholder="メールアドレス" style="height:48px;border-radius:14px;border:2px solid #e6ddcf;padding:0 16px;font-size:16px;outline:none;" />' +
            '<input id="auth-pass" type="password" placeholder="パスワード（6もじ いじょう）" style="height:48px;border-radius:14px;border:2px solid #e6ddcf;padding:0 16px;font-size:16px;outline:none;" />' +
            '<button onclick="window.__submitAuth(\\'' + authMode + '\\')" style="min-height:56px;border-radius:18px;background:var(--ink);color:#fff;font-size:18px;box-shadow:0 4px 0 rgba(0,0,0,.3);">' + submitLabel + '</button>' +
            '<button onclick="window.__setAuthMode(\\'' + switchMode + '\\')" style="min-height:40px;background:transparent;color:var(--accent);font-weight:700;font-size:14px;box-shadow:none;">' + switchLabel + '</button>' +
            '<button onclick="window.__setAuthMode(\\'choose\\')" style="min-height:40px;background:transparent;color:var(--sub);font-weight:700;font-size:14px;box-shadow:none;">← もどる</button>' +
          '</div>';
      }
      return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div>' +
        '<div class="sheet" onclick="event.stopPropagation()">' +
          '<div style="width:44px;height:5px;border-radius:3px;background:#e6ddcf;margin:0 auto 18px;"></div>' +
          '<div style="text-align:center;font-size:46px;">🔑📚</div>' +
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:24px;margin-top:8px;">' + (s.authReason ? 'とうろくして つづきを あそぼう' : 'じぶんの 図鑑を とっておこう') + '</div>' +
          '<div style="text-align:center;font-size:14px;color:#7a7060;line-height:1.7;margin-top:8px;">' + (s.authReason ? 'おはなしづくり と たんけんが あそべます。<br><b style="color:var(--accent);">チケットも 50まい</b> プレゼント🎁' : 'いま集めた <b style="color:var(--accent);">' + zukanCount + 'けん</b> をそのまま引き継ぎ。<br>登録すると <b style="color:var(--accent);">はっけんチケット 50まい</b> プレゼント🎁') + '</div>' +
          formHtml +
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
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:22px;margin-top:8px;">' + selWords.length + '個 仕込みますか？</div>' +
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
    if (s.sheet === 'style') {
      var styleKeys = ['honwaka', 'ehon', 'pop', 'watercolor', 'zukan'];
      var styleCards = '';
      for (var sti = 0; sti < styleKeys.length; sti++) {
        var sk = styleKeys[sti];
        var isActive = s.imgStyle === sk;
        var stBorder = isActive ? '3px solid var(--accent)' : '2px solid var(--cbd)';
        var stCheck = isActive ? '<div style="position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;">✓</div>' : '';
        styleCards += '<button onclick="window.__selectStyle(\\'' + sk + '\\')" style="position:relative;width:100%;background:#fff;border:' + stBorder + ';border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;box-shadow:none;text-align:left;">' +
          stCheck +
          '<div style="flex:1;">' +
            '<div style="font-family:var(--fhead);font-weight:900;font-size:17px;color:var(--ink);">' + window.__STYLE_LABELS[sk] + '</div>' +
            '<div style="font-size:13px;color:var(--sub);margin-top:2px;">' + window.__STYLE_DESCS[sk] + '</div>' +
          '</div>' +
        '</button>';
      }
      return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div>' +
        '<div class="sheet" onclick="event.stopPropagation()" style="max-height:80vh;overflow-y:auto;">' +
          '<div style="width:44px;height:5px;border-radius:3px;background:#e6ddcf;margin:0 auto 18px;"></div>' +
          '<div style="text-align:center;font-size:36px;">🖼️</div>' +
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:22px;margin:8px 0 4px;">イラストスタイル</div>' +
          '<div style="text-align:center;font-size:13px;color:var(--sub);margin-bottom:16px;">はっけん時に生成される絵のタッチを選べます</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px;">' + styleCards + '</div>' +
          '<div style="text-align:center;font-size:11px;color:#b6ab9a;margin-top:14px;line-height:1.5;">すでに生成した画像には影響しません</div>' +
          '<button onclick="window.__closeSheet()" style="width:100%;min-height:52px;border-radius:18px;background:var(--locked);color:var(--sub);font-size:16px;font-weight:700;margin-top:14px;box-shadow:none;">とじる</button>' +
        '</div>';
    }
    if (s.sheet === 'parentGate') {
      return '<div class="sheet-overlay" onclick="window.__closeSheet()" style="background:rgba(20,15,10,.45);"></div>' +
        '<div class="sheet" onclick="event.stopPropagation()" style="border-radius:28px 28px 0 0;">' +
          '<div style="width:44px;height:5px;border-radius:3px;background:#e6ddcf;margin:0 auto 18px;"></div>' +
          '<div style="text-align:center;font-size:40px;margin-bottom:8px;">🏠</div>' +
          '<div style="text-align:center;font-family:var(--fhead);font-weight:900;font-size:22px;margin-bottom:8px;">おうちの方メニュー</div>' +
          '<div style="text-align:center;font-size:14px;color:var(--sub);margin-bottom:24px;">ボタンを1.2秒長押しで入れます</div>' +
          '<button onpointerdown="window.__pgDown(event)" onpointerup="window.__pgUp()" onpointerleave="window.__pgUp()" onpointercancel="window.__pgUp()" style="width:100%;min-height:80px;border-radius:20px;background:var(--ink);color:#fff;font-size:18px;position:relative;overflow:hidden;box-shadow:0 6px 0 rgba(0,0,0,.3);touch-action:none;user-select:none;">' +
            '<div id="pg-bar" style="position:absolute;top:0;left:0;bottom:0;width:0%;background:var(--accent);opacity:0.35;pointer-events:none;"></div>' +
            '<span style="position:relative;z-index:1;">長押しで入る</span>' +
          '</button>' +
          '<button onclick="window.__closeSheet()" style="width:100%;min-height:48px;background:transparent;color:var(--sub);font-size:15px;box-shadow:none;margin-top:10px;">閉じる</button>' +
        '</div>';
    }
    return '';
  }

  function nextWord() {
    for (var i = 0; i < WORDPOOL.length; i++) {
      if (state.zukanWords.indexOf(WORDPOOL[i]) === -1) return WORDPOOL[i];
    }
    return WORDPOOL[0];
  }

  function mitsukePool(s) {
    var pool = [];
    for (var i = 0; i < s.prepared.length; i++) {
      pool.push(s.prepared[i]);
    }
    for (var w in DICTIONARY) {
      if (s.zukanWords.indexOf(w) === -1 && pool.indexOf(w) === -1) {
        pool.push(w);
      }
    }
    for (var j = pool.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp;
    }
    return pool;
  }

  function buildMask(ch, w, h) {
    if (!_mask) return;
    var x = _mask.getContext('2d');
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#000';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    var fs = Math.round(h * 0.66);
    x.font = '900 ' + fs + "px 'Zen Maru Gothic','Zen Kaku Gothic New',sans-serif";
    x.fillText(ch || '', w / 2, h / 2 + fs * 0.06);
  }

  function clearInk() {
    if (_ink) {
      var x = _ink.getContext('2d');
      x.clearRect(0, 0, _ink.width, _ink.height);
      x.lineWidth = Math.max(15, Math.round(_ink.height * 0.08));
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.strokeStyle = 'var(--accent, #e8714c)';
      var app = document.getElementById('app');
      if (app) {
        var v = getComputedStyle(app).getPropertyValue('--accent');
        if (v && v.trim()) x.strokeStyle = v.trim();
      }
    }
    _parts = [];
    renderTrace();
    if (state.drew) { state.drew = false; updateWriteUI(); }
  }

  function spark(x, y, n) {
    var cols = ['#ffd24a', '#ff9e5e', '#7ad0a0', '#f0a6c4', '#ffffff'];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 0.6 + Math.random() * 2.4;
      _parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.7, life: 1, decay: 0.02 + Math.random() * 0.03, size: 5 + Math.random() * 8, rot: Math.random() * Math.PI, col: cols[(Math.random() * cols.length) | 0] });
    }
    if (_parts.length > 200) _parts.splice(0, _parts.length - 200);
  }

  function starPath(ctx, s) {
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = i * Math.PI / 2;
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.34, Math.sin(a + Math.PI / 4) * s * 0.34);
    }
    ctx.closePath();
  }

  function renderTrace() {
    var c = document.getElementById('trace-canvas');
    if (!c || !_ink) return;
    var ctx = c.getContext('2d');
    var w = c.width;
    var h = c.height;
    ctx.clearRect(0, 0, w, h);
    if (_mask) { ctx.save(); ctx.globalAlpha = 0.14; ctx.drawImage(_mask, 0, 0); ctx.restore(); }
    ctx.drawImage(_ink, 0, 0);
    for (var i = _parts.length - 1; i >= 0; i--) {
      var p = _parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.98; p.life -= p.decay;
      if (p.life <= 0) { _parts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      starPath(ctx, p.size * (0.4 + p.life * 0.6));
      ctx.fill();
      ctx.restore();
    }
  }

  function startLoop() {
    if (_raf) return;
    var step = function() {
      var cc = document.getElementById('trace-canvas');
      if (!cc) { _raf = 0; return; }
      renderTrace();
      _raf = (_drawing || _parts.length) ? requestAnimationFrame(step) : 0;
    };
    _raf = requestAnimationFrame(step);
  }

  function twinkle() {
    if (!state.sfx) return;
    var now = Date.now();
    if (_lastChime && now - _lastChime < 85) return;
    _lastChime = now;
    try {
      if (!_actx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; _actx = new AC(); }
      var ac = _actx;
      if (ac.state === 'suspended') ac.resume();
      var sc = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      var f = sc[(Math.random() * sc.length) | 0];
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      o.connect(g); g.connect(ac.destination);
      var t = ac.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t); o.stop(t + 0.24);
    } catch(e) {}
  }

  function setupCanvas() {
    var c = document.getElementById('trace-canvas');
    if (!c || c === _canvasWired) return;
    _canvasWired = c;
    var rect = c.getBoundingClientRect();
    if (rect.width === 0) return;
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    c.width = w;
    c.height = h;

    if (!_ink) { _ink = document.createElement('canvas'); _mask = document.createElement('canvas'); _parts = []; }
    _ink.width = w; _ink.height = h;
    _mask.width = w; _mask.height = h;

    var word = state.word || '';
    var ch = word[Math.min(state.charIndex || 0, word.length - 1)] || '';
    buildMask(ch, w, h);

    var inkCtx2 = _ink.getContext('2d');
    inkCtx2.clearRect(0, 0, w, h);
    inkCtx2.lineWidth = Math.max(15, Math.round(h * 0.08));
    inkCtx2.lineCap = 'round';
    inkCtx2.lineJoin = 'round';
    inkCtx2.strokeStyle = 'var(--accent, #e8714c)';
    var app = document.getElementById('app');
    if (app) { var v = getComputedStyle(app).getPropertyValue('--accent'); if (v && v.trim()) inkCtx2.strokeStyle = v.trim(); }
    _parts = [];
    renderTrace();

    var inkCtx = _ink.getContext('2d');
    var drawing = false;
    var last = null;
    function pos(e) {
      var r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    c.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      drawing = true;
      _drawing = true;
      var p = pos(e);
      last = p;
      inkCtx.beginPath();
      inkCtx.moveTo(p[0], p[1]);
      inkCtx.lineTo(p[0] + 0.1, p[1] + 0.1);
      inkCtx.stroke();
      spark(p[0], p[1], 4);
      twinkle();
      startLoop();
      if (!state.drew) { state.drew = true; updateWriteUI(); }
      try { c.setPointerCapture(e.pointerId); } catch(ex) {}
    });
    c.addEventListener('pointermove', function(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(e);
      inkCtx.beginPath();
      inkCtx.moveTo(last[0], last[1]);
      inkCtx.lineTo(p[0], p[1]);
      inkCtx.stroke();
      var dx = p[0] - last[0];
      var dy = p[1] - last[1];
      if (dx * dx + dy * dy > 22) { spark(p[0], p[1], 2); twinkle(); }
      last = p;
    });
    c.addEventListener('pointerup', function() { drawing = false; _drawing = false; });
    c.addEventListener('pointercancel', function() { drawing = false; _drawing = false; });
    renderTrace();
  }

  window.__setState = setState;

  window.__goStoryHome = function () {
    playSound('tap');
    if (!state.authed) {
      setState({ sheet: 'signup', authReason: 'story' });
      return;
    }
    setState({ screen: 'storyhome' });
    fetchStories();
  };

  window.__goStoryPick = function () {
    playSound('tap');
    var defaultSel = state.zukanWords.slice(0, 3);
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
    var words = state.storySel || [];
    if (words.length < 2) return;
    playSound('tap');
    setState({ screen: 'story', storyLoading: true, storyPages: null, storyPage: 0 });

    var errorPages = [{ hero: [], tokens: [{ t: 'text', s: 'おはなしを つくれませんでした。もういちど ためしてね。' }] }];
    function fallbackFetch() {
      fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: words })
      }).then(function(r) {
          if (!r.ok) throw new Error('API error');
          return r.json();
        })
        .then(function(data) {
          if (!data.pages || !data.pages.length) throw new Error('No pages');
          setState({ storyPages: data.pages, storyLoading: false });
        })
        .catch(function() {
          setState({ storyLoading: false, storyPages: errorPages });
        });
    }

    fetch('/api/story/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: words })
    }).then(function(r) {
      if (!r.ok || !r.body || !r.body.getReader) { fallbackFetch(); return; }
      var reader = r.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';
      var pages = [];
      function read() {
        reader.read().then(function(result) {
          if (result.done) {
            if (pages.length === 0) fallbackFetch();
            else setState({ storyLoading: false });
            return;
          }
          buf += decoder.decode(result.value, { stream: true });
          var events = buf.split('\\n\\n');
          buf = events.pop() || '';
          for (var i = 0; i < events.length; i++) {
            var lines = events[i].split('\\n');
            var eventType = '';
            var data = '';
            for (var j = 0; j < lines.length; j++) {
              if (lines[j].indexOf('event: ') === 0) eventType = lines[j].slice(7);
              if (lines[j].indexOf('data: ') === 0) data = lines[j].slice(6);
            }
            if (eventType === 'page' && data) {
              try {
                var page = JSON.parse(data);
                pages.push(page);
                setState({ storyPages: pages.slice(), storyLoading: false });
              } catch(e) {}
            } else if (eventType === 'error') {
              setState({ storyLoading: false, storyPages: errorPages });
              return;
            }
          }
          read();
        }).catch(function() {
          if (pages.length === 0) fallbackFetch();
          else setState({ storyLoading: false });
        });
      }
      read();
    }).catch(function() { fallbackFetch(); });
  };

  window.__storyPrev = function () {
    var idx = state.storyPage || 0;
    if (idx > 0) {
      playSound('tap');
      setState({ storyPage: idx - 1, storyFade: 'prev' });
      setTimeout(function() { setState({ storyFade: '' }); }, 300);
    }
  };

  window.__storyNext = function () {
    var idx = state.storyPage || 0;
    var pages = state.storyPages || [];
    if (idx < pages.length - 1) {
      playSound('tap');
      setState({ storyPage: idx + 1, storyFade: 'next' });
      setTimeout(function() { setState({ storyFade: '' }); }, 300);
    }
  };

  window.__storyRestart = function () {
    playSound('tap');
    setState({ storyPage: 0, storyFade: '' });
  };

  function fetchStories() {
    fetch('/api/stories').then(function(r) {
      if (!r.ok) return;
      return r.json();
    }).then(function(data) {
      if (data && data.stories) {
        setState({ stories: data.stories });
        var hasWriting = data.stories.some(function(s) { return s.status === 'writing'; });
        if (hasWriting && state.screen === 'storyhome') {
          setTimeout(fetchStories, 10000);
        }
      }
    }).catch(function() {});
  }

  window.__goStoryRead = function (id) {
    playSound('tap');
    setState({ screen: 'storyread', readingStoryId: id, storyPage: 0, storyFade: '' });
  };

  window.__makeStory = function () {
    var words = state.storySel || [];
    if (words.length < 2) return;
    if (state.tickets <= 0) {
      setState({ sheet: 'tickets' });
      return;
    }
    playSound('tap');
    fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: words })
    }).then(function(r) {
      if (!r.ok) throw new Error('API error');
      return r.json();
    }).then(function(data) {
      setState({ tickets: state.tickets - 1, screen: 'storyhome' });
      fetchStories();
    }).catch(function() {
      setState({ screen: 'storyhome' });
    });
  };

  window.__storyReadPrev = function () {
    var idx = state.storyPage || 0;
    if (idx > 0) {
      playSound('tap');
      setState({ storyPage: idx - 1, storyFade: 'prev' });
      setTimeout(function() { setState({ storyFade: '' }); }, 300);
    }
  };

  window.__storyReadNext = function () {
    var idx = state.storyPage || 0;
    var story = null;
    for (var i = 0; i < state.stories.length; i++) {
      if (state.stories[i].id === state.readingStoryId) { story = state.stories[i]; break; }
    }
    if (!story || !story.pages) return;
    if (idx < story.pages.length - 1) {
      playSound('tap');
      setState({ storyPage: idx + 1, storyFade: 'next' });
      setTimeout(function() { setState({ storyFade: '' }); }, 300);
    }
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

  window.__goMitsukeru = function () {
    playSound('tap');
    var pool = mitsukePool(state);
    if (pool.length > 0) {
      var pick = pool[Math.floor(Math.random() * pool.length)];
      if (state.prepared.indexOf(pick) !== -1) {
        window.__openSecret(pick);
      } else {
        window.__goWriteWord(pick, false, 'mitsuke');
      }
    } else if (state.zukanWords.length > 0) {
      var reviewPick = state.zukanWords[Math.floor(Math.random() * state.zukanWords.length)];
      window.__goWriteWord(reviewPick, false, 'review');
    } else {
      setState({ screen: 'mitsukeru' });
    }
  };

  window.__goTanken = function () {
    playSound('tap');
    setState({ screen: 'tanken', tankenChars: [], tankenMsg: null });
  };

  window.__goWriteWord = function (word, discovering, kind) {
    playSound('tap');
    _canvasWired = null;
    setState({ screen: 'trace', word: word, charIndex: 0, confirmed: [], discovering: discovering, revealKind: kind || 'normal', drew: false });
  };

  window.__goWrite = function () {
    playSound('tap');
    _canvasWired = null;
    setState({ screen: 'trace', word: nextWord(), charIndex: 0, confirmed: [], revealKind: 'normal', drew: false });
  };

  window.__goZukan = function () {
    playSound('tap');
    var c = state.zukanWords.length;
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

  window.__showLogin = function () {
    setState({ sheet: 'signup', authMode: 'email-login' });
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

  window.__setAuthMode = function (mode) {
    setState({ authMode: mode, authError: '' });
  };

  window.__submitAuth = function (mode) {
    var email = document.getElementById('auth-email');
    var pass = document.getElementById('auth-pass');
    if (!email || !pass) return;
    var emailVal = email.value.trim();
    var passVal = pass.value;
    if (!emailVal || !passVal) {
      setState({ authError: 'メールアドレスと パスワードを いれてね' });
      return;
    }
    var endpoint = mode === 'email-login' ? '/api/auth/login' : '/api/auth/signup';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password: passVal })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          setState({ authError: data.error || 'エラーが おきました' });
          return;
        }
        var afterScreen = state.authReason === 'story' ? 'storyhome' : (state.authReason === 'tanken' ? 'tanken' : null);
        var newState = { authed: true, userId: data.id, tickets: data.tickets || 0, sheet: null, authMode: 'choose', authError: '', authReason: null };
        if (afterScreen) newState.screen = afterScreen;
        setState(newState);
        if (afterScreen === 'storyhome') { fetchStories(); }
      });
    }).catch(function () {
      setState({ authError: 'つうしん エラーです' });
    });
  };

  window.__googleLogin = function () {
    window.location.href = '/api/auth/google';
  };

  window.__logout = function () {
    fetch('/api/auth/logout', { method: 'POST' }).then(function () {
      setState({ authed: false, userId: null, tickets: 0, screen: 'home', sheet: null });
    });
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

  window.__toggleSpeak = function () {
    setState({ speak: !state.speak });
  };

  window.__openStylePicker = function () {
    playSound('tap');
    setState({ sheet: 'style' });
  };

  window.__selectStyle = function (style) {
    playSound('tap');
    setState({ imgStyle: style, sheet: null });
    fetch('/api/styles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_style: style })
    }).catch(function() {});
  };

  window.__speakChar = function () {
    var word = state.word || '';
    var ch = word[state.charIndex || 0] || '';
    speakText(ch);
  };

  window.__speakWord = function () {
    speakText(state.word || state.detailWord || '');
  };

  window.__confirmChar = function () {
    if (!state.drew) return;
    var word = state.word;
    var idx = state.charIndex;
    var nc = state.confirmed.concat([word[idx]]);

    var dataURL = null;
    if (_ink) {
      dataURL = _ink.toDataURL('image/png');
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
        var col = state.zukanWords.indexOf(word) === -1
          ? state.zukanWords.concat([word])
          : state.zukanWords;
        if (state.authed) {
          fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: word })
          });
        }
        setState({ confirmed: nc, charIndex: idx + 1, screen: 'reveal', zukanWords: col, lastHakken: false, handwriting: hw });
      }
    } else {
      playSound('confirm');
      _canvasWired = null;
      setState({ confirmed: nc, charIndex: idx + 1, handwriting: hw, drew: false });
    }
  };

  window.__clearCanvas = function () {
    clearInk();
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

  window.__incDaily = function() {
    playSound('tap');
    setState({ dailyHakkenMax: Math.min(9, (state.dailyHakkenMax || 3) + 1) });
  };

  window.__decDaily = function() {
    playSound('tap');
    setState({ dailyHakkenMax: Math.max(0, (state.dailyHakkenMax || 3) - 1) });
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
      if (state.zukanWords.indexOf(w) === -1 && state.prepared.indexOf(w) === -1) {
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
    var newPrepared = state.prepared.slice();
    for (var i = 0; i < state.prepSel.length; i++) {
      if (state.prepSel[i].selected && state.prepSel[i].status === 'ok') {
        newPrepared.push(state.prepSel[i].w);
      }
    }
    setState({ prepared: newPrepared, prepSel: [], sheet: null, screen: 'parent' });
  };

  window.__openSecret = function(word) {
    if (!state.authed && (state.hakkenWords || []).length >= 10) {
      setState({ sheet: 'signup', authReason: 'mitsuke' });
      return;
    }
    if (state.authed && (state.tickets || 0) <= 0) {
      setState({ tankenMsg: { type: 'limit', text: 'チケットが たりないよ' } });
      return;
    }
    playSound('tap');
    _canvasWired = null;
    setState({ screen: 'trace', word: word, charIndex: 0, confirmed: [], discovering: true, revealKind: 'mitsuke', drew: false });
  };

  window.__tkAdd = function(ch) {
    if (state.tankenChars.length >= 6) return;
    playSound('tap');
    speakText(ch);
    setState({ tankenChars: state.tankenChars.concat([ch]), tankenMsg: null });
  };

  window.__tkBack = function() {
    if (state.tankenChars.length === 0) return;
    playSound('cancel');
    setState({ tankenChars: state.tankenChars.slice(0, -1), tankenMsg: null });
  };

  window.__tkClearAll = function() {
    playSound('cancel');
    setState({ tankenChars: [], tankenMsg: null });
  };

  window.__tkDaku = function() {
    var chars = state.tankenChars;
    if (chars.length === 0) return;
    var last = chars[chars.length - 1];
    if (DAKU[last]) {
      playSound('tap');
      setState({ tankenChars: chars.slice(0, -1).concat([DAKU[last]]), tankenMsg: null });
    } else {
      var rev = null;
      for (var k in DAKU) { if (DAKU[k] === last) { rev = k; break; } }
      if (rev) { playSound('tap'); setState({ tankenChars: chars.slice(0, -1).concat([rev]), tankenMsg: null }); }
    }
  };

  window.__tkHandaku = function() {
    var chars = state.tankenChars;
    if (chars.length === 0) return;
    var last = chars[chars.length - 1];
    if (HANDAKU[last]) {
      playSound('tap');
      setState({ tankenChars: chars.slice(0, -1).concat([HANDAKU[last]]), tankenMsg: null });
    } else {
      var rev = null;
      for (var k in HANDAKU) { if (HANDAKU[k] === last) { rev = k; break; } }
      if (rev) { playSound('tap'); setState({ tankenChars: chars.slice(0, -1).concat([rev]), tankenMsg: null }); }
    }
  };

  window.__tkSmall = function() {
    var chars = state.tankenChars;
    if (chars.length === 0) return;
    var last = chars[chars.length - 1];
    if (SMALL[last]) {
      playSound('tap');
      setState({ tankenChars: chars.slice(0, -1).concat([SMALL[last]]), tankenMsg: null });
    } else {
      var rev = null;
      for (var k in SMALL) { if (SMALL[k] === last) { rev = k; break; } }
      if (rev) { playSound('tap'); setState({ tankenChars: chars.slice(0, -1).concat([rev]), tankenMsg: null }); }
    }
  };

  window.__tkChouon = function() {
    if (state.tankenChars.length >= 6) return;
    playSound('tap');
    setState({ tankenChars: state.tankenChars.concat(['ー']), tankenMsg: null });
  };

  window.__tkNext = function() {
    var word = state.tankenChars.join('');
    if (word.length < 2) return;
    var result = classifyTanken(word);
    if (result === 'ng') {
      setState({ tankenMsg: { type: 'ng', text: 'この ことばは つかえないよ' } });
      return;
    }
    playSound('tap');
    if (result === 'dict') {
      window.__goWriteWord(word, false, 'tanken');
    } else if (result === 'rediscovery') {
      window.__goWriteWord(word, false, 'tanken-rediscovery');
    } else {
      if (!state.authed && (state.hakkenWords || []).length >= 10) {
        setState({ sheet: 'signup', authReason: 'tanken' });
        return;
      }
      if (state.authed && (state.dailyHakkenUsed >= state.dailyHakkenMax || (state.tickets || 0) <= 0)) {
        setState({ screen: 'tankenlimit', limitWord: word });
        return;
      }
      setState({ tankenMode: true });
      window.__goWriteWord(word, true, 'tanken');
    }
  };

  window.__startHakkenGen = function() {
    var word = state.word;
    setState({ genCached: false, genPhase: 1 });
    var phaseTimer = setTimeout(function() {
      if (state.screen === 'hakkengen') {
        setState({ genPhase: 2 });
      }
    }, 2700);
    fetch('/api/hakken/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: word })
    })
    .then(function(res) {
      if (res.status === 401) {
        return { description: 'あたらしく はっけんした ことばだよ！', image_url: null, cached: false };
      }
      if (!res.ok) throw new Error('API error: ' + res.status);
      return res.json();
    })
    .then(function(data) {
      clearTimeout(phaseTimer);
      if (data.cached) {
        setState({ genCached: true });
        setTimeout(function() {
          window.__finishHakken(data.description || '', data.image_url || null, !data.rediscovery);
        }, 1200);
      } else {
        window.__finishHakken(data.description || '', data.image_url || null, !data.rediscovery);
      }
    })
    .catch(function(err) {
      clearTimeout(phaseTimer);
      console.error('hakken generate failed:', err);
      setState({ screen: 'hakkengenError' });
    });
  };

  window.__finishHakken = function(desc, imageUrl, consumeTicket) {
    playSound('success');
    var word = state.word;
    var col = state.zukanWords.indexOf(word) === -1
      ? state.zukanWords.concat([word])
      : state.zukanWords;
    var disc = state.hakkenWords.indexOf(word) === -1
      ? state.hakkenWords.concat([word])
      : state.hakkenWords;
    var newPrepared = state.prepared.filter(function(w) { return w !== word; });
    var tickets = consumeTicket !== false ? Math.max(0, (state.tickets || 0) - 1) : (state.tickets || 0);

    if (!window.__hakkenCache) window.__hakkenCache = {};
    window.__hakkenCache[word] = { desc: desc, image_url: imageUrl || null };

    var used = state.dailyHakkenUsed;
    if (state.tankenMode) { used = used + 1; }

    setState({
      screen: 'reveal',
      zukanWords: col,
      hakkenWords: disc,
      prepared: newPrepared,
      tickets: tickets,
      lastHakken: true,
      discovering: false,
      dailyHakkenUsed: used,
      tankenMode: false
    });
  };

  fetch('/api/auth/me').then(function (res) {
    return res.json();
  }).then(function (data) {
    if (data.authed) {
      setState({ authed: true, userId: data.id, tickets: data.tickets || 0, imgStyle: data.image_style || 'ehon' });
      fetch('/api/hakken/entries').then(function(r) { return r.json(); }).then(function(entries) {
        if (!window.__hakkenCache) window.__hakkenCache = {};
        entries.forEach(function(e) {
          window.__hakkenCache[e.word] = { desc: e.description, image_url: e.image_url };
        });
        render(state);
      }).catch(function() {});
    }
  }).catch(function () {});

  render(state);
})();
`;

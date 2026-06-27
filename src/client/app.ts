export const clientApp = `
(function () {
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
    return '<div style="padding:32px;"><h1 style="font-family:var(--fhead);">もじずかん</h1><p>[home placeholder]</p></div>';
  }

  function renderWrite(s) {
    return '<div style="padding:32px;"><h1 style="font-family:var(--fhead);">書く</h1><p>[write placeholder]</p></div>';
  }

  function renderReveal(s) {
    return '<div style="padding:32px;"><h1 style="font-family:var(--fhead);">こたえ</h1><p>[reveal placeholder]</p></div>';
  }

  function renderZukan(s) {
    return '<div style="padding:32px;"><h1 style="font-family:var(--fhead);">図鑑</h1><p>[zukan placeholder]</p></div>';
  }

  function renderDetail(s) {
    return '<div style="padding:32px;"><h1 style="font-family:var(--fhead);">詳細</h1><p>[detail placeholder]</p></div>';
  }

  function renderSheet(s) {
    var content = s.sheet === 'signup'
      ? '<p>[signup sheet placeholder]</p>'
      : s.sheet === 'tickets'
      ? '<p>[tickets sheet placeholder]</p>'
      : '';
    return '<div class="sheet-overlay" onclick="window.__closeSheet()"></div><div class="sheet">' + content + '</div>';
  }

  window.__setState = setState;
  window.__closeSheet = function () { setState({ sheet: null }); };

  render(state);
})();
`;

export const globalStyles = `
*,
*::before,
*::after {
  box-sizing: border-box;
}

:root {
  --bg: #fdf6ec;
  --card: #fff8ee;
  --cbd: #f0e4d0;
  --ink: #2a241d;
  --sub: #9a8f7e;
  --accent: #e8714c;
  --accentd: #c95835;
  --accent2: #5fb583;
  --accent2d: #3f9b68;
  --locked: #f3ece0;
  --fhead: 'Zen Maru Gothic', sans-serif;
  --rad: 24px;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Zen Kaku Gothic New', sans-serif;
  min-height: 100vh;
}

#app {
  max-width: 560px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
}

button {
  cursor: pointer;
  border: none;
  border-radius: var(--rad);
  font-family: var(--fhead);
  font-weight: 700;
  background: var(--accent);
  color: #fff;
  padding: 14px 28px;
  font-size: 1rem;
  box-shadow: 0 6px 0 var(--accentd);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

button:active,
button.tap {
  transform: translateY(3px) scale(.98);
  box-shadow: 0 3px 0 var(--accentd);
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  animation: fade 0.2s ease forwards;
}

.sheet {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 560px;
  background: var(--card);
  border-radius: var(--rad) var(--rad) 0 0;
  padding: 24px;
  z-index: 101;
  animation: sheetUp 0.25s ease forwards;
}

@keyframes pop {
  0%   { transform: scale(0.8); opacity: 0; }
  70%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes rise {
  0%   { transform: translateY(16px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes sheetUp {
  0%   { transform: translateX(-50%) translateY(100%); }
  100% { transform: translateX(-50%) translateY(0); }
}

@keyframes fade {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}

@media (min-width: 600px) {
  #app {
    max-width: 720px;
  }
}

@media (min-width: 900px) {
  #app {
    max-width: 840px;
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  html, body {
    min-height: auto;
  }
  #app {
    min-height: auto;
  }
}
`;

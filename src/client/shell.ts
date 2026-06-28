import { globalStyles } from "./styles";
import { clientApp } from "./app";

export function buildShell(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>もじずかん</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap" rel="stylesheet">
  <style>${globalStyles}</style>
</head>
<body>
  <div id="app"></div>
  <script>${clientApp}</script>
</body>
</html>`;
}

// Regenerates docs/index.html from docs/openapi.yaml so the docs open by double-click (file://).
// Usage: node docs/build-viewer.cjs
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const yaml = fs.readFileSync(path.join(dir, 'openapi.yaml'), 'utf8');
const embedded = yaml.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI SEO API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script type="text/plain" id="openapi-spec">${embedded}</script>
  <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    const spec = jsyaml.load(document.getElementById('openapi-spec').textContent);
    window.ui = SwaggerUIBundle({
      spec,
      dom_id: '#swagger-ui',
      deepLinking: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 0,
      defaultModelExpandDepth: 3,
      displayRequestDuration: true,
      filter: true,
      persistAuthorization: true,
      tryItOutEnabled: false,
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Wrote docs/index.html');

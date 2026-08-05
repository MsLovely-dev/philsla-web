const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;
const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

app.disable('x-powered-by');

app.use(
  express.static(distDir, {
    index: false,
    maxAge: '1y',
    immutable: true,
  }),
);

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.get('*', (_request, response) => {
  response.sendFile(indexPath);
});

app.listen(port, () => {
  console.log(`PhilSA frontend listening on port ${port}`);
});

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import getData from './fetch.js';
import { exec } from 'child_process';

const app = express();
app.use(express.json());

const API_PORT = 5000;
const API_URL = 'http://localhost:' + API_PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/checkUpdates', (req, res) => {
  const branch = 'main'; // O la rama que uses
  const pm2ProcessName = 'sample'; // Cambia al nombre real de tu proceso PM2

  // Comando: traer cambios, forzar igualar a remoto y reiniciar
  const cmd = `
    cd "${__dirname}" &&
    git fetch origin &&
    git reset --hard origin/${branch} &&
    if git diff --name-only HEAD@{1} HEAD | grep -q "package.json\\|package-lock.json"; then npm install; fi &&
    pm2 restart ${pm2ProcessName} --update-env
  `;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Error actualizando:', stderr || err.message);
      return res.status(500).json({ error: stderr || err.message });
    }

    console.log('Salida actualización:', stdout);
    res.json({
      updated: true,
      message: 'Código sincronizado con la nube y servidor reiniciado.'
    });
  });
});

app.get('/data', async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.listen(API_PORT, () => {
  console.log(`Servidor corriendo en ${API_URL}`);
});
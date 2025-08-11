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
  const pm2ProcessName = 'sample'; // Cambia al nombre real de tu proceso PM2

  const cmd = `
    cd "${__dirname}" &&
    git fetch origin &&
    git reset --hard origin/main &&
    git diff --name-only HEAD@{1} HEAD
  `;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Error actualizando:', stderr || err.message);
      return res.status(500).json({ error: stderr || err.message });
    }

    const changedFiles = stdout
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean);

    console.log('Archivos modificados:', changedFiles);

    // Si hay cambios en dependencias, instalar
    const npmCmd = changedFiles.some(f => ['package.json', 'package-lock.json'].includes(f))
      ? 'npm install && '
      : '';

    // Reiniciar PM2
    exec(`cd "${__dirname}" && ${npmCmd}pm2 restart ${pm2ProcessName} --update-env`, (pm2Err, pm2Out, pm2ErrOut) => {
      if (pm2Err) {
        console.error('Error reiniciando PM2:', pm2ErrOut || pm2Err.message);
        return res.status(500).json({ error: pm2ErrOut || pm2Err.message });
      }

      console.log('PM2 restart output:', pm2Out);
      res.json({
        updated: true,
        message: 'Código sincronizado con la nube y servidor reiniciado.',
        filesChanged: changedFiles
      });
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
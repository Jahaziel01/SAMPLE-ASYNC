import express from 'express';
import getData from './fetch.js';
import {exec } from 'child_process';

const app = express();
app.use(express.json());

const API_PORT = 5000;
const API_URL = 'http://localhost:' + API_PORT;

const projectPath = '/Users/jahaz/Escritorio/Project Sample';

app.get('/checkUpdates', (req, res) => {
  exec(`cd ${projectPath} && git fetch origin`, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    exec(`cd ${projectPath} && git diff --name-only origin/main`, (err, stdout) => {
      if (err) return res.status(500).json({ error: err.message });

      const filesChanged = stdout.trim().split('\n').filter(f => f);

      if (filesChanged.length === 0) {
        return res.json({ updated: false, message: 'No hay cambios en archivos.' });
      }

      let commands = filesChanged.map(f => `git checkout origin/main -- "${f}"`).join(' && ');
      exec(`cd ${projectPath} && ${commands}`, (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const changedPackages = filesChanged.includes('package.json') || filesChanged.includes('package-lock.json');
        const npmCmd = changedPackages ? 'npm install && ' : '';

        const pm2ProcessName = 'sample'; // Cambia aquí al nombre correcto según pm2 list
        const pm2Cmd = `${npmCmd}pm2 restart ${pm2ProcessName} --update-env`;

        exec(`cd ${projectPath} && ${pm2Cmd}`, (err, stdout, stderr) => {
          if (err) {
            console.error('Error reiniciando PM2:', err);
            console.error('stderr:', stderr);
            return res.status(500).json({ error: stderr || err.message });
          }
          console.log('pm2 restart output:', stdout);
          res.json({
            updated: true,
            message: 'Archivos actualizados y app reiniciada.',
            filesChanged
          });
        });
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
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
  exec(`cd ${__dirname} && git fetch origin`, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    exec(`cd ${__dirname} && git rev-parse --abbrev-ref HEAD`, (err, branchStdout) => {
      if (err) return res.status(500).json({ error: err.message });

      const branch = branchStdout.trim();

      exec(`cd ${__dirname} && git reset --hard origin/${branch}`, (err) => {
        if (err) return res.status(500).json({ error: err.message });

        exec(`cd ${__dirname} && git ls-files -m`, (err, modifiedStdout) => {
          if (err) return res.status(500).json({ error: err.message });

          const filesChanged = modifiedStdout.trim().split('\n').filter(f => f);

          exec(`cd ${__dirname} && git ls-files --others --exclude-standard`, (err, untrackedStdout) => {
            if (err) return res.status(500).json({ error: err.message });

            const untrackedFiles = untrackedStdout.trim().split('\n').filter(f => f);

            const allChangedFiles = [...new Set([...filesChanged, ...untrackedFiles])];

            // Actualizar archivos (checkout no necesario porque hicimos reset hard)
            const changedPackages = allChangedFiles.includes('package.json') || allChangedFiles.includes('package-lock.json');
            const npmCmd = changedPackages ? 'npm install && ' : '';

            const pm2ProcessName = 'sample'; // Cambia por tu proceso PM2 real
            const pm2Cmd = `${npmCmd}pm2 restart ${pm2ProcessName} --update-env`;

           exec(`cd ${__dirname} && ${pm2Cmd}`, (err, stdout, stderr) => {
             console.log('Salida PM2 restart:', stdout);
              if (err) {
                return res.status(500).json({ error: stderr || err.message });
              }

              res.json({
                updated: true,
                message: 'Archivos actualizados y app reiniciada.',
                filesChanged: allChangedFiles
              });
            });

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
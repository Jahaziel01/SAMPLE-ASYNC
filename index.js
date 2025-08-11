import express from 'express';
import getData from './fetch.js';
import {exec } from 'child_process';

const app = express();
app.use(express.json());

const API_PORT = 5000;
const API_URL = 'http://localhost:' + API_PORT;

const projectPath = '/Users/jahaz/Escritorio/Project Sample';

app.get('/checkUpdates', (req, res) => {
  // 1. Fetch remoto
  exec(`cd ${projectPath} && git fetch origin`, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    // 2. Obtener lista de archivos modificados entre local y remoto
    exec(`cd ${projectPath} && git diff --name-only origin/main`, (err, stdout) => {
      if (err) return res.status(500).json({ error: err.message });

      const filesChanged = stdout.trim().split('\n').filter(f => f);

      if (filesChanged.length === 0) {
        return res.json({ updated: false, message: 'No hay cambios en archivos.' });
      }

      // 3. Actualizar cada archivo modificado desde remoto
      let commands = filesChanged.map(f => `git checkout origin/main -- "${f}"`).join(' && ');

      // 4. Ejecutar comandos para actualizar archivos
      exec(`cd ${projectPath} && ${commands}`, (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // 5. Si cambió package.json, actualizar dependencias
        const changedPackages = filesChanged.includes('package.json') || filesChanged.includes('package-lock.json');

        const npmCmd = changedPackages ? 'npm install && ' : '';

        // 6. Reiniciar app
        exec(`cd ${projectPath} && ${npmCmd}pm2 restart sample`, (err) => {
          if (err) return res.status(500).json({ error: err.message });

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
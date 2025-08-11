import express from 'express';
import getData from './fetch.js';
import {exec } from 'child_process';

const app = express();
app.use(express.json());

const API_PORT = 5000;
const API_URL = 'http://localhost:' + API_PORT;

app.get('/checkUpdates', (req, res) => {
    // Ejecutar git fetch para traer los cambios remotos
    exec('git fetch', (err, stdout, stderr) => {
      if (err) return res.status(500).json({ error: stderr });
  
      // Verificar si hay diferencias entre local y remoto
      exec('git rev-parse HEAD', (err, localSha) => {
        if (err) return res.status(500).json({ error: err.message });
  
        exec('git rev-parse origin/main', (err, remoteSha) => {
          if (err) return res.status(500).json({ error: err.message });
  
          if (localSha.trim() === remoteSha.trim()) {
            return res.json({ updated: false, message: 'No hay cambios.' });
          }
  
          // Si son diferentes, hacer git pull + npm install + reinicio
          exec('git pull origin main && npm install && pm2 restart app', (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: stderr });
            res.json({ updated: true, message: 'Actualizado y reiniciado.' });
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
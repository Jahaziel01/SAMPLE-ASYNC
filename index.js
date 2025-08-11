import path from 'path';
import express from 'express';
import getData from './fetch.js';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const API_PORT = 5000;
const API_URL = 'http://localhost:' + API_PORT;

app.get('/checkUpdates', (req, res) => {
  try {
    const projectPath = path.resolve();

    // Obtener rama actual
    const branch = execSync(`git rev-parse --abbrev-ref HEAD`, { cwd: projectPath })
      .toString().trim();

    // Forzar sincronización con remoto
    execSync(`git fetch origin`, { cwd: projectPath });
    execSync(`git reset --hard origin/${branch}`, { cwd: projectPath });

    // Ver si cambió package.json o package-lock.json
    const diff = execSync(`git diff --name-only HEAD@{1} HEAD`, { cwd: projectPath })
      .toString().split('\n');
    const changedPackages = diff.includes('package.json') || diff.includes('package-lock.json');

    if (changedPackages) {
      execSync(`npm install`, { cwd: projectPath });
    }

    const restart = spawn('pm2', ['restart', process.env.PM2_PROCESS_NAME, '--update-env'], {
      cwd: projectPath,
      detached: true,
      stdio: 'ignore',
    });
    restart.unref();

    const lastCommitId = execSync('git rev-parse --short HEAD').toString().trim();
    
    res.json({
      updated: true,
      message: 'Updated to commit ' + lastCommitId,
    });
    // Reiniciar PM2 sin abrir CMD extra

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
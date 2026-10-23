const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let server = null;
let serverPort = 0;

// Determine path to compiled Flutter web files
// In development: ../mobile/build/web
// In packaged app: ./web or process.resourcesPath/web
function getWebDir() {
  const candidate1 = path.join(__dirname, 'web');
  const candidate2 = path.join(__dirname, '..', 'mobile', 'build', 'web');
  const candidate3 = path.join(process.resourcesPath || '', 'web');

  if (fs.existsSync(candidate1)) return candidate1;
  if (fs.existsSync(candidate2)) return candidate2;
  if (fs.existsSync(candidate3)) return candidate3;
  return candidate1;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

// Embedded high-performance static server
function startLocalServer(webDir) {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      // Normalize URL and remove query params
      const parsedUrl = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(parsedUrl.pathname);
      if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
      }

      let filePath = path.join(webDir, pathname);

      // Prevent directory traversal
      if (!filePath.startsWith(webDir)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // SPA Fallback: serve index.html for unknown routes
          filePath = path.join(webDir, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'no-cache');

        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
          res.writeHead(500);
          res.end('Server Error');
        });
        stream.pipe(res);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      console.log(`[Politics CRM Desktop] Local server started on port ${serverPort}`);
      resolve(serverPort);
    });

    server.on('error', reject);
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    title: 'Politics CRM - Voter Management System',
    backgroundColor: '#0f172a',
    autoHideMenuBar: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows cross-origin API calls to backend server
    },
  });

  // Native application menu
  const menuTemplate = [
    {
      label: 'फाइल (File)',
      submenu: [
        {
          label: 'रिफ्रेश (Reload)',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload(),
        },
        {
          label: 'प्रिंट करें (Print)',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.print(),
        },
        { type: 'separator' },
        {
          label: 'बाहर निकलें (Exit)',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'एडिट (Edit)',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' },
      ],
    },
    {
      label: 'दृश्य (View)',
      submenu: [
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Reset Zoom', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Full Screen', role: 'togglefullscreen' },
        {
          label: 'डेवलपर टूल्स (DevTools)',
          accelerator: 'F12',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'सहायता (Help)',
      submenu: [
        {
          label: 'About Politics CRM',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Politics CRM - Windows Desktop',
              message: 'Politics CRM Desktop v1.0.0',
              detail: 'Complete Voter Management, Election Slips & Panchayat Analytics System.\nDeveloped for Windows 10 & 11.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load the web app
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/index.html`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Handle external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const webDir = getWebDir();
      console.log(`[Politics CRM Desktop] Serving files from: ${webDir}`);
      await startLocalServer(webDir);
      createMainWindow();
    } catch (err) {
      console.error('Failed to start desktop app:', err);
      dialog.showErrorBox('Politics CRM Error', `Failed to start local server:\n${err.message}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (server) {
      server.close();
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}

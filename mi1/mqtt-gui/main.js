const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow () {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.setMenuBarVisibility(false); // Ẩn menu nếu muốn
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
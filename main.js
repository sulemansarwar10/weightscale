const Datastore = require('nedb')
const electron = require('electron');
const path = require('path');
const url = require('url');
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

let users = new Datastore({ filename: 'users.db', autoload: true })

// SET ENV
process.env.NODE_ENV = 'development';

const { app, BrowserWindow, Menu, ipcMain } = electron;

var Port = new SerialPort({ path: "COM4", baudRate: 9600, autoOpen: false }, function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
});

const parser = new ReadlineParser({
  delimiter: '\r\n'
})
Port.pipe(parser);
function portopen(){
  Port.open(function (err) {
    if (err) {
      return console.log('Error opening port: ', err.message)
    }
  }) 
}
function portclose(){
  Port.close(function (err) {
    if (err) {
      return console.log('Error closing port: ', err.message)
    }
  }) 
}

function dataon() {

  parser.on('data', function (data) {
  
    console.log('Received data from port: ' + data.substring(data.search("+"), data.length - 2));
    console.log('Received data from port: ' + data);
   
   
  });
}
function messagewrite() {
  Port.write('R', function (err) {
    if (err) {
      return console.log('Error on write: ', err.message)
    }
    console.log('message written')

  })
}
function update() {
  
  setTimeout(update, 500);
}

// Set a timeout that will check for new serialPorts every 2 seconds.
// This timeout reschedules itself.
setTimeout(update, 500);

let mainWindow;
let addWindow;
let printWindow;
let settingWindow;
// Listen for app to be ready
app.on('ready', function () {
  // Create new window
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  // Load html in window
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'mainWindow.html'),
    protocol: 'file:',
    slashes: true
  }));
  // Quit app when closed
  mainWindow.on('closed', function () {
    app.quit();
  });

  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
});

// Handle add item window
function createAddWindow() {
  addWindow = new BrowserWindow({
    width: 800,
    height: 550,
    title: 'Add Shopping List Item',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });
  addWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'addWindow.html'),
    protocol: 'file:',
    slashes: true
  }));
  // Handle garbage collection
  addWindow.on('close', function () {
    addWindow = null;
  });
}


// Handle setting item window
function createsettingWindow() {
  settingWindow = new BrowserWindow({
    width: 800,
    height: 550,
    title: 'Add Shopping List Item',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });
  settingWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'settingWindow.html'),
    protocol: 'file:',
    slashes: true
  }));
  // Handle garbage collection
  settingWindow.on('close', function () {
    settingWindow = null;
  });
}


// Handle print item window
function createprintWindow() {
  printWindow = new BrowserWindow({
    width: 800,
    height: 500,
    title: 'Add Shopping List Item',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });
  printWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'printWindow.html'),
    protocol: 'file:',
    slashes: true
  }));
  // Handle garbage collection
  printWindow.on('close', function () {
    printWindow = null;
  });
}

ipcMain.on('item:print', (event, someArgument) => {
  console.log(someArgument)
  if (!printWindow)
    createprintWindow();
  printWindow.webContents.send('item:printitem', someArgument)

})
ipcMain.on('portopen', (event, someArgument) => {
  console.log(someArgument)
  event.returnValue = 'Hi, sync reply';

})


// Catch item:add
ipcMain.on('item:add', function (e, item) {
  let ticketno
  users.count({}, function (err, count) {
    item.ticketno = Number(count) + 1


    users.insert(item, function (err, newDoc) {
      if (mainWindow)
        mainWindow.webContents.send('item:add', newDoc);
      e.returnValue = newDoc.ticketno
    });
  });


  //addWindow.close();
});

// Create menu template
const mainMenuTemplate = [
  // Each object is a dropdown
  {
    label: 'File',
    submenu: [
      {
        label: 'History',
        click() {
          if (!addWindow)
            createAddWindow();
        }
      },
      {
        label: 'Print Item',
        click() {
          if (!printWindow)
            createprintWindow();
        }
      },
      {
        label: 'Setting',
        click() {
          if (!settingWindow)
            createsettingWindow();
        }
      },
      {
        label: 'Quit',
        accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
        click() {
          app.quit();
        }
      }
    ]
  }
];

// If OSX, add empty object to menu
if (process.platform == 'darwin') {
  mainMenuTemplate.unshift({});
}

// Add developer tools option if in dev
if (process.env.NODE_ENV !== 'production') {
  mainMenuTemplate.push({
    label: 'Developer Tools',
    submenu: [
      {
        role: 'reload'
      },
      {
        label: 'Toggle DevTools',
        accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      }
    ]
  });
}
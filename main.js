const {app, BrowserWindow, Menu, screen} = require('electron');
const RPC = require('discord-rpc');
const path = require("path");

const CLIENT_ID = '812338041582649374';
const NEW_CLIENTID = '1353596133145837579'
const rpc = new RPC.Client({ transport: 'ipc' });
const details = "";
const state = require('./lib/enums/states.json');

const menu_template = [  
  // { role: 'langMenu' }
  {
    label: 'Language | Linguagem',
    submenu: [
	{
      label: 'Switch to English',
	  click: function(){
		let mainWindow = BrowserWindow.getFocusedWindow();    
		createWindow('EN');
		mainWindow.close();
	  },
	},
	{
      label: 'Mudar para Português',
	  click: function(){
		let mainWindow = BrowserWindow.getFocusedWindow();    
		createWindow('PT');
		mainWindow.close();
	  },
	}
    ]
  },
  // { role: 'settingsMenu' }
  {
    label: 'Options',
    submenu: [
		{ role: 'togglefullscreen' },
		{ type: 'separator' },
		{ role: 'zoomin' },
		{ role: 'zoomout' },
		{ role: 'resetZoom' },
		{ type: 'separator' },
    ]
  },

]


let flash_plugin = null;
switch (process.platform) {
    case 'win32':
        flash_plugin = `lib/flash/pepflashplayer64_32_0_0_303.dll`
        break;
    case 'darwin':
        flash_plugin = `lib/flash/PepperFlashPlayer.plugin`
        break;
    case 'linux':
        flash_plugin = `lib/flash/libpepflashplayer.so`
        break;
}
app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname, flash_plugin));
const TIMESTAMP = new Date();

function createWindow(lang = 'EN') {
    let splash = new BrowserWindow(
        {width: 512,
            height: 512,
            icon: `${__dirname}/lib/img/icon.ico`,
            transparent: true,
            frame: false,
            alwaysOnTop: true
        });
    splash.loadFile(`${__dirname}/lib/splash.html`).then(() => console.log('loaded splash.'));
	
	primaryDisplay = screen.getPrimaryDisplay()
    console.log(primaryDisplay);
    let screenDimention = primaryDisplay.workAreaSize
    width = screenDimention.width
    height = screenDimention.height

	
    const win = new BrowserWindow({
        width: width,
        height: height,
        icon: `${__dirname}/lib/img/icon.ico`,
        webPreferences: {
            plugins: true,
			devTools: true
        },
        show: false
    })

	const menu = Menu.buildFromTemplate(menu_template)
    win.setMenu(menu);

    win.webContents.session.clearCache().then(() => {
        console.log('Cleared cache.');
		
		url = `https://play.antiquepengu.in`;
		
		if(lang == 'PT'){
			url = `https://play.antiquepengu.in/pt`
		}		

        win.loadURL(url).then(() => {
			
		  setTimeout(() => {
			win.webContents.openDevTools({ mode: 'detach' }); // or 'right', 'bottom'
		  }, 1000);
			
            win.webContents.executeJavaScript('window.scrollTo(0,55)').then(() => {
                splash.destroy();
                win.show();

                rpc.login({clientId: NEW_CLIENTID}).catch(() => console.log('RPC timed out...'));

                setInterval(async () => {
                    let room = await win.webContents.executeJavaScript('current_room').catch(() => console.log('current_room not found.'));
					let id = await win.webContents.executeJavaScript('penguin_id').catch(() => console.log('penguin_id not found.'));
					let username = await win.webContents.executeJavaScript('penguin_user').catch(() => console.log('penguin_user not found.'));
                    let iggyuser = await win.webContents.executeJavaScript('igloo_penguin_user').catch(() => console.log('igloo_penguin_user not found.'));
					let isgaming = await win.webContents.executeJavaScript('is_gaming').catch(() => console.log('is_gaming not found.'));
					
					ccusername = username[0].toUpperCase() + username.substring(1);
					if(!room){ return; }
					
					else if(room > 1000)
					{
						if(room - 1000 == id){
						rpc.setActivity({
							largeImageKey: "main-logo",
							largeImageText: "Play now at antiquepengu.in",
							startTimestamp: TIMESTAMP,
							details: "Signed in as " + ccusername,
							state: "in their igloo",
						}).catch(e => console.log(e));
							return;
						}
						else if (!iggyuser) {
						rpc.setActivity({
							largeImageKey: "main-logo",
							largeImageText: "Play now at antiquepengu.in",
							startTimestamp: TIMESTAMP,
							details: "Signed in as " + ccusername,
							state: "in someone's igloo",
						}).catch(e => console.log(e));
							return;																					
						}
						else if (isgaming) {
						rpc.setActivity({
							largeImageKey: "main-logo",
							largeImageText: "Play now at antiquepengu.in",
							startTimestamp: TIMESTAMP,
							details: "Signed in as " + ccusername,
							state: "waiting: 1/2",
						}).catch(e => console.log(e));
							return;							
						}
						else {
						rpc.setActivity({
							largeImageKey: "main-logo",
							largeImageText: "Play now at antiquepengu.in",
							startTimestamp: TIMESTAMP,
							details: "Signed in as " + ccusername,
							state: "in " + iggyuser + "'s igloo",
						}).catch(e => console.log(e));
							return;
						}
					}
					
                    rpc.setActivity({
                        largeImageKey: "main-logo",
						largeImageText: "Play now at antiquepengu.in",
                        startTimestamp: TIMESTAMP,
						details: "Signed in as " + ccusername,
                        state: state[room]
                    }).catch(e => console.log(e));
                }, 1000)
            })
        }).catch(e => console.log(e));
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit(); 
})

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
})

rpc.on('ready', () => {
    rpc.setActivity({
        largeImageKey: "main-logo",
		largeImageText: "Play now at antiquepengu.in",
        startTimestamp: TIMESTAMP,
        state: "admiring the menu."
    }).catch(e => console.log(e));

    console.log('Rich presence is ready.');
})
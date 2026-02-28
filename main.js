const {app, BrowserWindow, Menu, screen} = require('electron');
const RPC = require('discord-rpc');
const notifier = require('node-notifier');
const Pusher = require('pusher');
const path = require("path");
const https = require("https");

const PUSHER_APP_ID = '2121229';
const PUSHER_KEY = '7169db8eacae243fa133';
const PUSHER_SECRET = '0e5d1b554cc5c7f63b0a';
const PUSHER_CLUSTER = 'mt1';
const PUSHER_CHANNEL = 'notifications';
const PUSHER_EVENT = 'notification';

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
		{
			label: 'Check for Updates',
			click: function() {
				checkForUpdates(true);
			}
		},
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
		
		url = `https://staging.antiquepengu.in`;
		
		if(lang == 'PT'){
			url = `https://play.antiquepengu.in/pt`
		}		

		win.webContents.on('login', (event, request, authInfo, callback) => {
			event.preventDefault();
			callback('magecuck', 'salderedev'); // You can hardcode, or prompt user yourself
		});

        win.loadURL(url).then(() => {
			
		  setTimeout(() => {
			win.webContents.openDevTools({ mode: 'detach' }); // or 'right', 'bottom'
		  }, 1000);
			
            win.webContents.executeJavaScript('window.scrollTo(0,55)').then(() => {
                splash.destroy();
                win.show();
                
                checkForUpdates(false);
                
                // Initialize Pusher with device-specific channel
                win.webContents.executeJavaScript(`
                    // Generate or get unique client ID for this device
                    function getClientId() {
                        var clientId = localStorage.getItem('antique-penguin-client-id');
                        if (!clientId) {
                            clientId = 'client-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                            localStorage.setItem('antique-penguin-client-id', clientId);
                        }
                        return clientId;
                    }
                    
                    var clientId = getClientId();
                    console.log('[PUSHER] Client ID:', clientId);
                    
                    var script = document.createElement('script');
                    script.src = 'https://js.pusher.com/7.0/pusher.min.js';
                    script.onload = function() {
                        console.log('[PUSHER] SDK loaded');
                        var pusher = new Pusher('7169db8eacae243fa133', { cluster: 'mt1' });
                        
                        // Subscribe to device-specific channel
                        var channelName = 'notifications-' + clientId;
                        var channel = pusher.subscribe(channelName);
                        channel.bind('notification', function(data) {
                            console.log('[PUSHER] Notification received:', data);
                            window.pendingNotification = data;
                        });
                        
                        console.log('[PUSHER] Subscribed to channel:', channelName);
                        
                        // Automatically grant consent for notifications
                        if (typeof clientId !== 'undefined' && clientId) {
                            fetch('/api/notification/consent', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    Session: clientId,
                                    Subscription: clientId,
                                    Consent: true
                                })
                            }).then(function(response) {
                                return response.json();
                            }).then(function(data) {
                                console.log('[PUSHER] Subscribed:', data);
                            }).catch(() => {});
                        }
                    };
                    script.onerror = function(e) { console.log('[PUSHER] SDK load error:', e); };
                    document.head.appendChild(script);
                `).catch(e => console.log('[PUSHER] Error:', e));
                
                // Poll for pending notifications
                setInterval(() => {
                    win.webContents.executeJavaScript('window.pendingNotification').then(notification => {
                        if (notification) {
                            notifier.notify({
                                title: notification.title || 'Antique Penguin',
                                message: notification.body || 'You have a notification!',
                                appID: 'com.antiquepenguin.client',
                                sound: true
                            });
                            win.webContents.executeJavaScript('window.pendingNotification = null').catch(() => {});
                        }
                    }).catch(() => {});
                }, 2000);

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

const REPO_OWNER = 'darktohka';
const REPO_NAME = 'antique-penguin-client';
const CURRENT_VERSION = app.getVersion();

async function checkForUpdates(manual = false) {
	try {
		const data = await fetchJson(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
		const latestVersion = data.tag_name.replace(/^v/, '');

		console.log(`[UPDATER] Current: ${CURRENT_VERSION}, Latest: ${latestVersion}`);

		if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
			const {dialog} = require('electron');
			const result = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
				type: 'info',
				title: 'Update Available',
				message: `A new version (${latestVersion}) is available. Your version is ${CURRENT_VERSION}.`,
				buttons: ['Download Update', 'Later'],
				defaultId: 0
			});

			if (result.response === 0) {
				await downloadAndInstallUpdate(data);
			}
		} else if (manual) {
			const {dialog} = require('electron');
			dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
				type: 'info',
				title: 'No Updates',
				message: `You are running the latest version (${CURRENT_VERSION}).`,
				buttons: ['OK'],
				defaultId: 0
			});
		}
	} catch (err) {
		console.error('[UPDATER] Check failed:', err);
		if (manual) {
			const {dialog} = require('electron');
			dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
				type: 'error',
				title: 'Update Error',
				message: `Failed to check for updates: ${err.message}`,
				buttons: ['OK'],
				defaultId: 0
			});
		}
	}
}

function fetchJson(url) {
	return new Promise((resolve, reject) => {
		https.get(url, { headers: { 'User-Agent': ' Antique-Penguin-Client' } }, (res) => {
			let data = '';
			res.on('data', chunk => data += chunk);
			res.on('end', () => {
				try {
					resolve(JSON.parse(data));
				} catch (e) {
					reject(e);
				}
			});
		}).on('error', reject);
	});
}

function compareVersions(v1, v2) {
	const parts1 = v1.split('.').map(Number);
	const parts2 = v2.split('.').map(Number);
	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const p1 = parts1[i] || 0;
		const p2 = parts2[i] || 0;
		if (p1 > p2) return 1;
		if (p1 < p2) return -1;
	}
	return 0;
}

async function downloadAndInstallUpdate(releaseData) {
	const {dialog, shell} = require('electron');
	
	const asset = releaseData.assets.find(a => a.name.endsWith('.exe') || a.name.includes('Setup') || a.name.includes('installer'));
	
	if (asset) {
		const result = await dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {
			type: 'info',
			title: 'Download Update',
			message: `Download version ${releaseData.tag_name}?`,
			detail: `This will download the installer from GitHub.`,
			buttons: ['Download', 'Open in Browser', 'Cancel'],
			defaultId: 0
		});

		if (result.response === 0) {
			shell.openExternal(asset.browser_download_url);
		} else if (result.response === 1) {
			shell.openExternal(releaseData.html_url);
		}
	} else {
		shell.openExternal(releaseData.html_url);
	}
}

	app.whenReady().then(() => {
	createWindow();
});

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
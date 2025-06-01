const SOCIAL_MEDIA_DOMAINS = [
  'youtube.com',
];

let sessions = {};

const defaultOptions = {
  visualDegradation: true,
  audioFilter: false,
  colorTemperature: false,
  speedAdjust: false,
  todoIntegration: false,
  videoCounter: false,
  enableDesaturation: true,
  enableBlur: true,
  enableOpacity: true,
  enableDelays: true,
  levelInterval: 5,
  maxLevels: 5,
  blurIntensity: 50,
  desaturationIntensity: 75,
  opacityIntensity: 60
};

let currentOptions = {...defaultOptions};

chrome.storage.local.get(['options', 'sessions'], (result) => {
  if (result.options) {
    currentOptions = {...defaultOptions, ...result.options};
  }
  if (result.sessions) {
    sessions = result.sessions;
  }
});

function isSocialMediaSite(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return SOCIAL_MEDIA_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch (e) {
    return false;
  }
}

function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getSessionData':
      handleGetSessionData(sender, sendResponse);
      break;
      
    case 'resetSessions':
      handleResetSessions();
      break;
      
    case 'optionsUpdated':
      handleOptionsUpdated(message.options);
      break;
      
    case 'getOptions':
      sendResponse({ options: currentOptions });
      break;
      
    case 'updateVideosWatched':
      handleUpdateVideosWatched(message, sender);
      break;
      
    case 'updateSessionTime':
      handleUpdateSessionTime(sender);
      break;
  }
  
  return true; 
});

function handleGetSessionData(sender, sendResponse) {
  if (!sender.tab) {
    sendResponse({ error: 'No tab information' });
    return;
  }
  
  const domain = getDomainFromUrl(sender.tab.url);
  if (domain && sessions[domain]) {
    sendResponse({ sessionData: sessions[domain] });
  } else {
    sendResponse({ sessionData: null });
  }
}

function handleResetSessions() {
  sessions = {};
  chrome.storage.local.set({ sessions: {} });
  
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (isSocialMediaSite(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { action: 'sessionReset' }).catch(() => {});
      }
    });
  });
}

function handleOptionsUpdated(newOptions) {
  currentOptions = {...defaultOptions, ...newOptions};
  
  chrome.storage.local.set({ options: currentOptions });
  
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (isSocialMediaSite(tab.url)) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateOptions',
          options: currentOptions
        }).catch(() => {});
      }
    });
  });
}

function handleUpdateVideosWatched(message, sender) {
  if (!sender.tab) return;
  
  const domain = getDomainFromUrl(sender.tab.url);
  if (domain && sessions[domain]) {
    sessions[domain].videosWatched = message.videosWatched;
    saveSessions();
  }
}

function handleUpdateSessionTime(sender) {
  if (!sender.tab) return;
  
  const domain = getDomainFromUrl(sender.tab.url);
  if (domain && sessions[domain]) {
    const now = Date.now();
    const elapsed = now - sessions[domain].lastChecked;
    sessions[domain].totalTime += elapsed;
    sessions[domain].lastChecked = now;
    saveSessions();
  }
}

function createNewSession(domain) {
  return {
    startTime: Date.now(),
    totalTime: 0,
    lastChecked: Date.now(),
    videosWatched: 0
  };
}

function saveSessions() {
  chrome.storage.local.set({ sessions: sessions });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isSocialMediaSite(tab.url)) {
    handleTabUpdate(tabId, tab);
  }
});

function handleTabUpdate(tabId, tab) {
  const domain = getDomainFromUrl(tab.url);
  if (!domain) return;
  
  if (!sessions[domain]) {
    sessions[domain] = createNewSession(domain);
    saveSessions();
  }
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }).then(() => {
    chrome.tabs.sendMessage(tabId, {
      action: 'initialize',
      sessionData: sessions[domain],
      options: currentOptions
    }).catch(() => {});
  }).catch(err => {
    console.error('Failed to inject content script:', err);
  });
}

let activeTabMonitor = null;

function startActiveTabMonitoring() {
  if (activeTabMonitor) {
    clearInterval(activeTabMonitor);
  }
  
  activeTabMonitor = setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && isSocialMediaSite(tabs[0].url)) {
        const domain = getDomainFromUrl(tabs[0].url);
        if (domain && sessions[domain]) {
          const now = Date.now();
          const elapsed = now - sessions[domain].lastChecked;
          sessions[domain].totalTime += elapsed;
          sessions[domain].lastChecked = now;
          saveSessions();
          
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSessionData',
            sessionData: sessions[domain]
          }).catch(() => {});
        }
      }
    });
  }, 5000);
}

startActiveTabMonitoring();

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    
    if (isSocialMediaSite(tab.url)) {
      const domain = getDomainFromUrl(tab.url);
      if (domain && sessions[domain]) {
        sessions[domain].lastChecked = Date.now();
        saveSessions();
      }
    }
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  
  chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
    if (tabs.length > 0 && isSocialMediaSite(tabs[0].url)) {
      const domain = getDomainFromUrl(tabs[0].url);
      if (domain && sessions[domain]) {
        sessions[domain].lastChecked = Date.now();
        saveSessions();
      }
    }
  });
});

setInterval(() => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  let changed = false;
  
  for (const domain in sessions) {
    if (sessions[domain].lastChecked < oneDayAgo) {
      delete sessions[domain];
      changed = true;
    }
  }
  
  if (changed) {
    saveSessions();
  }
}, 60 * 60 * 1000); 
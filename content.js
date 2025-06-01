const state = {
  sessionData: {
    startTime: Date.now(),
    totalTime: 0,
    videosWatched: 0
  },
  options: {
    visualDegradation: true,
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
  },
  pageLoadTime: Date.now(),
  currentVideoId: '',
  todosLoaded: false,
  todoItems: [],
  endScreenObserver: null,
  updateInterval: null,
  delayedElements: new WeakSet()
};

const defaultTodos = [
  { text: "Read for 15 minutes", completed: false },
  { text: "Take a 10 minute walk", completed: false },
  { text: "Drink a glass of water", completed: false },
  { text: "Call a friend", completed: false },
  { text: "Clean one area of your room", completed: false },
  { text: "Write in your journal", completed: false },
  { text: "Do a 5 minute meditation", completed: false },
  { text: "Review tomorrow's schedule", completed: false }
];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'initialize':
      handleInitialize(message);
      break;
    case 'updateSessionData':
      handleUpdateSessionData(message);
      break;
    case 'updateOptions':
      handleUpdateOptions(message);
      break;
    case 'sessionReset':
      handleSessionReset();
      break;
    case 'updateTodos':
      handleUpdateTodos(message);
      break;
  }
});

function handleInitialize(message) {
  if (message.sessionData) {
    state.sessionData = message.sessionData;
  }
  if (message.options) {
    state.options = message.options;
  }
  startEffectSystem();
}

function handleUpdateSessionData(message) {
  if (message.sessionData) {
    state.sessionData = message.sessionData;
  }
}

function handleUpdateOptions(message) {
  if (message.options) {
    state.options = message.options;
    restartEffectSystem();
  }
}

function handleSessionReset() {
  state.sessionData = {
    startTime: Date.now(),
    totalTime: 0,
    videosWatched: 0
  };
  state.pageLoadTime = Date.now();
  restartEffectSystem();
}

function handleUpdateTodos(message) {
  state.todoItems = message.todos.map(text => ({ text, completed: false }));
  updateExistingTodoOverlay();
}

function startEffectSystem() {
  if (state.updateInterval) {
    clearInterval(state.updateInterval);
  }
  
  if (state.options.todoIntegration && !state.todosLoaded) {
    loadCustomTodos();
  }
  
  applyAllEffects();
  
  if (state.options.todoIntegration) {
    observeVideoState();
  }
  
  if (state.options.videoCounter) {
    trackVideoChanges();
  }
  
  const updateIntervalMs = Math.min(10000, state.options.levelInterval * 60 * 1000 / 10);
  state.updateInterval = setInterval(applyAllEffects, updateIntervalMs);
}

function restartEffectSystem() {
  clearAllEffects();
  state.pageLoadTime = Date.now();
  startEffectSystem();
}

function calculateCurrentLevel() {
  const elapsedMs = Date.now() - state.pageLoadTime + state.sessionData.totalTime;
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const level = Math.min(
    Math.floor(elapsedMinutes / state.options.levelInterval) + 1,
    state.options.maxLevels
  );
  return level;
}

function calculateEffectIntensity(maxValue, intensityPercent, currentLevel) {
  const progression = (currentLevel - 1) / (state.options.maxLevels - 1);
  return maxValue * (intensityPercent / 100) * progression;
}

function applyAllEffects() {
  if (!state.options.visualDegradation) {
    clearAllEffects();
    return;
  }
  
  const currentLevel = calculateCurrentLevel();
  
  if (currentLevel >= 1) {
    applyVisualEffects(currentLevel);
    
    if (state.options.colorTemperature) {
      applyColorTemperature(currentLevel);
    }
    
    if (state.options.speedAdjust) {
      applySpeedAdjustment(currentLevel);
    }
    
    updateStatusIndicator(currentLevel);
  }
}

function applyVisualEffects(currentLevel) {
  const effects = {
    saturation: state.options.enableDesaturation 
      ? 1 - calculateEffectIntensity(1, state.options.desaturationIntensity, currentLevel) 
      : 1,
    opacity: state.options.enableOpacity 
      ? 1 - calculateEffectIntensity(0.7, state.options.opacityIntensity, currentLevel) 
      : 1,
    blur: state.options.enableBlur 
      ? calculateEffectIntensity(8, state.options.blurIntensity, currentLevel) 
      : 0
  };
  
  document.body.style.opacity = effects.opacity;
  
  let filters = [];
  if (effects.blur > 0) filters.push(`blur(${effects.blur}px)`);
  if (effects.saturation < 1) filters.push(`saturate(${effects.saturation})`);
  document.body.style.filter = filters.join(' ');
  
  if (state.options.enableOpacity) {
    document.querySelectorAll('img').forEach(img => {
      const brightness = effects.opacity * 100;
      img.style.filter = `brightness(${brightness}%) contrast(${brightness}%)`;
    });
  }
  
  if (state.options.enableDelays && currentLevel > 1) {
    const delayMs = calculateEffectIntensity(5000, 100, currentLevel);
    applyInteractionDelays(delayMs);
  }
}

function applyColorTemperature(currentLevel) {
  const tempRange = 7500; 
  const temperature = 1500 + (tempRange * (currentLevel - 1) / (state.options.maxLevels - 1));
  
  const rgb = calculateColorTemperatureRGB(temperature);
  const intensity = Math.min(0.7, (currentLevel - 1) / (state.options.maxLevels - 1) * 0.7);
  
  let overlay = document.getElementById('detox-color-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'detox-color-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      mix-blend-mode: screen;
      z-index: 9997;
    `;
    document.body.appendChild(overlay);
  }
  
  overlay.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`;
}

function calculateColorTemperatureRGB(temperature) {
  let r, g, b;
  
  temperature = temperature / 100;
  
  if (temperature <= 66) {
    r = 255;
    g = temperature;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    
    if (temperature <= 19) {
      b = 0;
    } else {
      b = temperature - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
    }
  } else {
    r = temperature - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    
    g = temperature - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    
    b = 255;
  }
  
  return {
    r: Math.min(255, Math.max(0, Math.round(r))),
    g: Math.min(255, Math.max(0, Math.round(g))),
    b: Math.min(255, Math.max(0, Math.round(b)))
  };
}

function applySpeedAdjustment(currentLevel) {
  const speedReduction = 0.1 * (currentLevel - 1);
  const playbackRate = Math.max(0.5, 1 - speedReduction);
  
  document.querySelectorAll('video').forEach(video => {
    video.playbackRate = playbackRate;
  });
  
  updateSpeedIndicator(playbackRate);
}

function applyInteractionDelays(delayMs) {
  const selectors = [
    'a[href*="/watch"]',
    '.ytp-play-button',
    '.ytp-next-button',
    '[aria-label*="Subscribe"]'
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(element => {
      if (state.delayedElements.has(element)) return;
      
      state.delayedElements.add(element);
      
      element.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const originalCursor = this.style.cursor;
        const originalOpacity = this.style.opacity;
        
        this.style.cursor = 'wait';
        this.style.opacity = '0.5';
        
        setTimeout(() => {
          this.style.cursor = originalCursor;
          this.style.opacity = originalOpacity;
          
          const newEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          
          state.delayedElements.delete(this);
          this.dispatchEvent(newEvent);
          state.delayedElements.add(this);
        }, delayMs);
      }, true);
    });
  });
}

function updateStatusIndicator(currentLevel) {
  let indicator = document.getElementById('detox-status');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'detox-status';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 9999;
      min-width: 200px;
    `;
    document.body.appendChild(indicator);
  }
  
  const elapsedMinutes = Math.round((Date.now() - state.pageLoadTime + state.sessionData.totalTime) / 60000);
  const activeEffects = [
    state.options.enableDesaturation && 'Desaturation',
    state.options.enableBlur && 'Blur',
    state.options.enableOpacity && 'Fade',
    state.options.enableDelays && 'Delays'
  ].filter(Boolean);
  
  indicator.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">Digital Detox Active</div>
    <div style="font-size: 12px; opacity: 0.9;">
      Level ${currentLevel}/${state.options.maxLevels} • ${elapsedMinutes}min
    </div>
    ${activeEffects.length > 0 ? `
      <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">
        ${activeEffects.join(', ')}
      </div>
    ` : ''}
  `;
}

function updateSpeedIndicator(playbackRate) {
  if (playbackRate === 1) {
    const indicator = document.getElementById('detox-speed');
    if (indicator) indicator.remove();
    return;
  }
  
  let indicator = document.getElementById('detox-speed');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'detox-speed';
    indicator.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 9999;
    `;
    document.body.appendChild(indicator);
  }
  
  indicator.textContent = `Speed: ${playbackRate.toFixed(1)}x`;
}

function trackVideoChanges() {
  if (!window.location.href.includes('youtube.com/watch')) return;
  
  const checkVideoId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (videoId && videoId !== state.currentVideoId) {
      state.currentVideoId = videoId;
      state.sessionData.videosWatched++;
      
      chrome.runtime.sendMessage({
        action: 'updateVideosWatched',
        videosWatched: state.sessionData.videosWatched
      });
      
      updateVideoCounter();
    }
  };
  
  checkVideoId();
  
  window.addEventListener('yt-navigate-finish', checkVideoId);
}

function updateVideoCounter() {
  if (!state.options.videoCounter) return;
  
  let counter = document.getElementById('detox-video-counter');
  if (!counter) {
    counter = document.createElement('div');
    counter.id = 'detox-video-counter';
    counter.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 9999;
    `;
    document.body.appendChild(counter);
  }
  
  counter.textContent = `Videos: ${state.sessionData.videosWatched}`;
}

async function loadCustomTodos() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['customTodos'], (result) => {
      if (result.customTodos && result.customTodos.length > 0) {
        state.todoItems = result.customTodos.map(text => ({ text, completed: false }));
      } else {
        state.todoItems = [...defaultTodos];
      }
      state.todosLoaded = true;
      resolve();
    });
  });
}

function observeVideoState() {
  if (!window.location.href.includes('youtube.com/watch')) return;
  
  if (state.endScreenObserver) {
    state.endScreenObserver.disconnect();
  }
  
  state.endScreenObserver = new MutationObserver(() => {
    const endScreen = document.querySelector('.html5-endscreen.ytp-player-content');
    if (endScreen && endScreen.style.display !== 'none' && !document.getElementById('detox-todo-overlay')) {
      injectTodoOverlay();
    }
  });
  
  const playerContainer = document.querySelector('#movie_player');
  if (playerContainer) {
    state.endScreenObserver.observe(playerContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('ended', () => {
      setTimeout(() => {
        if (state.options.todoIntegration) {
          const endScreen = document.querySelector('.html5-endscreen.ytp-player-content');
          if (endScreen && endScreen.style.display !== 'none') {
            injectTodoOverlay();
          }
        }
      }, 500);
    });
  }
}

function injectTodoOverlay() {
  if (!state.todosLoaded) {
    loadCustomTodos().then(injectTodoOverlay);
    return;
  }
  
  const backdrop = document.createElement('div');
  backdrop.id = 'detox-todo-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 999998;
  `;
  
  const overlay = document.createElement('div');
  overlay.id = 'detox-todo-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 30px;
    border-radius: 12px;
    z-index: 999999;
    max-width: 400px;
    width: 90%;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;
  
  overlay.innerHTML = createTodoHTML();
  
  document.body.appendChild(backdrop);
  document.body.appendChild(overlay);
  
  setupTodoEventListeners(overlay, backdrop);
  startTodoTimer(overlay);
}

function createTodoHTML() {
  return `
    <h2 style="margin: 0 0 20px 0; font-size: 24px; text-align: center;">
      Before the next video...
    </h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; text-align: center; opacity: 0.8;">
      Take a moment to do something productive:
    </p>
    <div id="todo-list-items" style="margin-bottom: 20px;">
      ${state.todoItems.map((item, index) => `
        <div class="todo-item" data-index="${index}" style="
          padding: 12px;
          margin-bottom: 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 10px;
        ">
          <input type="checkbox" class="todo-checkbox" style="
            width: 20px;
            height: 20px;
            cursor: pointer;
          " ${item.completed ? 'checked' : ''}>
          <span style="flex: 1; ${item.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${item.text}</span>
        </div>
      `).join('')}
    </div>
    <div style="text-align: center;">
      <button id="close-todo-overlay" disabled style="
        padding: 12px 24px;
        background: #666;
        border: none;
        color: white;
        border-radius: 6px;
        cursor: not-allowed;
        font-size: 16px;
        transition: all 0.3s;
        opacity: 0.6;
      ">
        Please wait... (15s)
      </button>
      <p id="todo-timer-text" style="
        margin-top: 10px;
        font-size: 12px;
        opacity: 0.7;
      ">
        Take a moment to consider these activities
      </p>
    </div>
  `;
}

function setupTodoEventListeners(overlay, backdrop) {
  overlay.querySelectorAll('.todo-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const index = parseInt(this.closest('.todo-item').dataset.index);
      state.todoItems[index].completed = this.checked;
      
      const span = this.nextElementSibling;
      if (this.checked) {
        span.style.textDecoration = 'line-through';
        span.style.opacity = '0.6';
      } else {
        span.style.textDecoration = 'none';
        span.style.opacity = '1';
      }
    });
  });
  
  const closeButton = overlay.querySelector('#close-todo-overlay');
  closeButton.addEventListener('click', function() {
    if (!this.disabled) {
      overlay.remove();
      backdrop.remove();
    }
  });
  
  overlay.querySelectorAll('.todo-item').forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(255, 255, 255, 0.1)';
    });
  });
}

function startTodoTimer(overlay) {
  const closeButton = overlay.querySelector('#close-todo-overlay');
  const timerText = overlay.querySelector('#todo-timer-text');
  let timeLeft = 15;
  
  const timerInterval = setInterval(() => {
    timeLeft--;
    
    if (timeLeft > 0) {
      closeButton.textContent = `Please wait... (${timeLeft}s)`;
    } else {
      clearInterval(timerInterval);
      closeButton.textContent = 'Continue Watching';
      closeButton.disabled = false;
      closeButton.style.background = '#4285f4';
      closeButton.style.cursor = 'pointer';
      closeButton.style.opacity = '1';
      
      if (timerText) {
        timerText.textContent = 'Click continue when ready';
      }
    }
  }, 1000);
}

function updateExistingTodoOverlay() {
  const overlay = document.getElementById('detox-todo-overlay');
  if (!overlay) return;
  
  const listContainer = overlay.querySelector('#todo-list-items');
  if (listContainer) {
    listContainer.innerHTML = state.todoItems.map((item, index) => `
      <div class="todo-item" data-index="${index}" style="
        padding: 12px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 10px;
      ">
        <input type="checkbox" class="todo-checkbox" style="
          width: 20px;
          height: 20px;
          cursor: pointer;
        " ${item.completed ? 'checked' : ''}>
        <span style="flex: 1; ${item.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${item.text}</span>
      </div>
    `).join('');
    
    const backdrop = document.getElementById('detox-todo-backdrop');
    setupTodoEventListeners(overlay, backdrop);
  }
}

function clearAllEffects() {
  if (state.updateInterval) {
    clearInterval(state.updateInterval);
    state.updateInterval = null;
  }
  
  if (state.endScreenObserver) {
    state.endScreenObserver.disconnect();
    state.endScreenObserver = null;
  }
  
  document.body.style.opacity = '';
  document.body.style.filter = '';
  
  document.querySelectorAll('img').forEach(img => {
    img.style.filter = '';
  });
  
  const elementsToRemove = [
    'detox-status',
    'detox-color-overlay',
    'detox-speed',
    'detox-video-counter',
    'detox-todo-overlay',
    'detox-todo-backdrop'
  ];
  
  elementsToRemove.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.remove();
  });
  
  document.querySelectorAll('video').forEach(video => {
    video.playbackRate = 1;
  });
  
  state.delayedElements = new WeakSet();
}

function initialize() {
  console.log('Digital Detox Enforcer: Initializing...');
  
  chrome.runtime.sendMessage({ action: 'getOptions' }, (response) => {
    if (response && response.options) {
      state.options = response.options;
    }
    
    chrome.runtime.sendMessage({ action: 'getSessionData' }, (response) => {
      if (response && response.sessionData) {
        state.sessionData = response.sessionData;
      }
      
      startEffectSystem();
    });
  });
}

window.addEventListener('yt-navigate-finish', () => {
  console.log('Digital Detox Enforcer: YouTube navigation detected');
  
  state.pageLoadTime = Date.now();
  
  const todoOverlay = document.getElementById('detox-todo-overlay');
  const todoBackdrop = document.getElementById('detox-todo-backdrop');
  if (todoOverlay) todoOverlay.remove();
  if (todoBackdrop) todoBackdrop.remove();
  
  if (state.options.todoIntegration) {
    observeVideoState();
  }
  
  if (state.options.videoCounter) {
    trackVideoChanges();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

setInterval(() => {
  chrome.runtime.sendMessage({ action: 'updateSessionTime' });
}, 30000); 
document.addEventListener('DOMContentLoaded', function() {
  const defaultOptions = {
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
  };
  
  const defaultTodos = [
    "Read for 15 minutes",
    "Take a 10 minute walk",
    "Drink a glass of water",
    "Call a friend",
    "Clean one area of your room",
    "Write in your journal",
    "Do a 5 minute meditation",
    "Review tomorrow's schedule"
  ];
  
  function toggleDegradationOptions() {
    const options = document.getElementById('degradation-options');
    const arrow = document.getElementById('degradation-arrow');
    const isVisible = options.style.display === 'block';
    
    if (isVisible) {
      options.style.display = 'none';
      arrow.classList.remove('expanded');
    } else {
      options.style.display = 'block';
      arrow.classList.add('expanded');
    }
  }
  
  function setTimingPreset(preset) {
    const levelInterval = document.getElementById('level-interval');
    const maxLevels = document.getElementById('max-levels');
    const buttons = document.querySelectorAll('.preset-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    
    switch(preset) {
      case 'gentle':
        levelInterval.value = 10;
        maxLevels.value = 4;
        document.querySelector('.preset-btn[onclick*="gentle"]').classList.add('active');
        break;
      case 'standard':
        levelInterval.value = 5;
        maxLevels.value = 5;
        document.querySelector('.preset-btn[onclick*="standard"]').classList.add('active');
        break;
      case 'aggressive':
        levelInterval.value = 3;
        maxLevels.value = 7;
        document.querySelector('.preset-btn[onclick*="aggressive"]').classList.add('active');
        break;
    }
  }
  
  function getIntensityLabel(value) {
    if (value <= 20) return 'Very Low';
    if (value <= 40) return 'Low';
    if (value <= 60) return 'Medium';
    if (value <= 80) return 'High';
    return 'Very High';
  }
  
  function updateIntensityValues() {
    const blurSlider = document.getElementById('blur-intensity');
    const desaturationSlider = document.getElementById('desaturation-intensity');
    const opacitySlider = document.getElementById('opacity-intensity');
    
    const blurValue = document.getElementById('blur-value');
    const desaturationValue = document.getElementById('desaturation-value');
    const opacityValue = document.getElementById('opacity-value');
    
    if (blurSlider && blurValue) {
      blurSlider.addEventListener('input', function() {
        blurValue.textContent = `${getIntensityLabel(this.value)} (${this.value}%)`;
      });
      blurValue.textContent = `${getIntensityLabel(blurSlider.value)} (${blurSlider.value}%)`;
    }
    
    if (desaturationSlider && desaturationValue) {
      desaturationSlider.addEventListener('input', function() {
        desaturationValue.textContent = `${getIntensityLabel(this.value)} (${this.value}%)`;
      });
      desaturationValue.textContent = `${getIntensityLabel(desaturationSlider.value)} (${desaturationSlider.value}%)`;
    }
    
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener('input', function() {
        opacityValue.textContent = `${getIntensityLabel(this.value)} (${this.value}%)`;
      });
      opacityValue.textContent = `${getIntensityLabel(opacitySlider.value)} (${opacitySlider.value}%)`;
    }
  }
  
  function loadStats() {
    chrome.storage.local.get(['sessions'], function(result) {
      const sessions = result.sessions || {};
      const statsContainer = document.getElementById('site-stats');
      
      if (Object.keys(sessions).length === 0) {
        statsContainer.innerHTML = '<p>No social media usage recorded yet.</p>';
        return;
      }
      
      statsContainer.innerHTML = '';
      
      for (const domain in sessions) {
        const minutes = Math.round(sessions[domain].totalTime / (1000 * 60));
        
        const siteDiv = document.createElement('div');
        siteDiv.className = 'site-stat';
        
        const siteName = document.createElement('span');
        siteName.textContent = domain;
        
        const siteTime = document.createElement('span');
        siteTime.textContent = `${minutes} min`;
        
        siteDiv.appendChild(siteName);
        siteDiv.appendChild(siteTime);
        statsContainer.appendChild(siteDiv);
      }
    });
  }
  
  function loadSettings() {
    chrome.storage.local.get(['options'], function(result) {
      const options = result.options || defaultOptions;
      
      document.getElementById('visual-degradation').checked = options.visualDegradation;
      document.getElementById('color-temperature').checked = options.colorTemperature;
      document.getElementById('speed-adjust').checked = options.speedAdjust;
      document.getElementById('todo-integration').checked = options.todoIntegration;
      document.getElementById('video-counter').checked = options.videoCounter;
      
      if (document.getElementById('enable-desaturation')) {
        document.getElementById('enable-desaturation').checked = options.enableDesaturation !== undefined ? options.enableDesaturation : true;
      }
      if (document.getElementById('enable-blur')) {
        document.getElementById('enable-blur').checked = options.enableBlur !== undefined ? options.enableBlur : true;
      }
      if (document.getElementById('enable-opacity')) {
        document.getElementById('enable-opacity').checked = options.enableOpacity !== undefined ? options.enableOpacity : true;
      }
      if (document.getElementById('enable-delays')) {
        document.getElementById('enable-delays').checked = options.enableDelays !== undefined ? options.enableDelays : true;
      }
      
      if (document.getElementById('level-interval')) {
        document.getElementById('level-interval').value = options.levelInterval || 5;
      }
      if (document.getElementById('max-levels')) {
        document.getElementById('max-levels').value = options.maxLevels || 5;
      }
      
      if (document.getElementById('blur-intensity')) {
        document.getElementById('blur-intensity').value = options.blurIntensity || 50;
      }
      if (document.getElementById('desaturation-intensity')) {
        document.getElementById('desaturation-intensity').value = options.desaturationIntensity || 75;
      }
      if (document.getElementById('opacity-intensity')) {
        document.getElementById('opacity-intensity').value = options.opacityIntensity || 60;
      }
      
      updateIntensityValues();
      
      updateTodoSectionVisibility();
      
      updateDegradationSectionVisibility();
    });
  }
  
  function saveSettings() {
    const options = {
      visualDegradation: document.getElementById('visual-degradation').checked,
      colorTemperature: document.getElementById('color-temperature').checked,
      speedAdjust: document.getElementById('speed-adjust').checked,
      todoIntegration: document.getElementById('todo-integration').checked,
      videoCounter: document.getElementById('video-counter').checked
    };
    
    if (document.getElementById('enable-desaturation')) {
      options.enableDesaturation = document.getElementById('enable-desaturation').checked;
    }
    if (document.getElementById('enable-blur')) {
      options.enableBlur = document.getElementById('enable-blur').checked;
    }
    if (document.getElementById('enable-opacity')) {
      options.enableOpacity = document.getElementById('enable-opacity').checked;
    }
    if (document.getElementById('enable-delays')) {
      options.enableDelays = document.getElementById('enable-delays').checked;
    }
    
    if (document.getElementById('level-interval')) {
      options.levelInterval = parseInt(document.getElementById('level-interval').value) || 5;
    }
    if (document.getElementById('max-levels')) {
      options.maxLevels = parseInt(document.getElementById('max-levels').value) || 5;
    }
    
    if (document.getElementById('blur-intensity')) {
      options.blurIntensity = parseInt(document.getElementById('blur-intensity').value) || 50;
    }
    if (document.getElementById('desaturation-intensity')) {
      options.desaturationIntensity = parseInt(document.getElementById('desaturation-intensity').value) || 75;
    }
    if (document.getElementById('opacity-intensity')) {
      options.opacityIntensity = parseInt(document.getElementById('opacity-intensity').value) || 60;
    }
    
    chrome.storage.local.set({options: options}, function() {
      chrome.runtime.sendMessage({action: 'optionsUpdated', options: options});
      
      const saveButton = document.getElementById('save-options');
      const originalText = saveButton.textContent;
      saveButton.textContent = "Saved!";
      
      setTimeout(() => {
        saveButton.textContent = originalText;
      }, 1500);
    });
    
    updateTodoSectionVisibility();
  }
  
  function loadTodos() {
    chrome.storage.sync.get(['customTodos'], function(result) {
      const todos = result.customTodos || defaultTodos;
      displayTodos(todos);
    });
  }
  
  function displayTodos(todos) {
    const todoList = document.getElementById('todo-list');
    if (!todoList) return;
    
    todoList.innerHTML = '';
    
    todos.forEach((todo, index) => {
      const todoItem = document.createElement('div');
      todoItem.className = 'todo-item';
      
      const todoText = document.createElement('span');
      todoText.textContent = todo;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-todo';
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => deleteTodo(index);
      
      todoItem.appendChild(todoText);
      todoItem.appendChild(deleteBtn);
      todoList.appendChild(todoItem);
    });
  }
  
  function addTodo() {
    const input = document.getElementById('new-todo-input');
    if (!input) return;
    
    const newTodo = input.value.trim();
    
    if (!newTodo) return;
    
    chrome.storage.sync.get(['customTodos'], function(result) {
      const todos = result.customTodos || defaultTodos;
      todos.push(newTodo);
      
      chrome.storage.sync.set({customTodos: todos}, function() {
        loadTodos();
        input.value = '';
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateTodos',
              todos: todos
            });
          }
        });
      });
    });
  }
  
  function deleteTodo(index) {
    chrome.storage.sync.get(['customTodos'], function(result) {
      const todos = result.customTodos || defaultTodos;
      todos.splice(index, 1);
      
      chrome.storage.sync.set({customTodos: todos}, function() {
        loadTodos();
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateTodos',
              todos: todos
            });
          }
        });
      });
    });
  }
  
  function updateTodoSectionVisibility() {
    const todoSection = document.getElementById('todo-section');
    const todoIntegrationEnabled = document.getElementById('todo-integration').checked;
    if (todoSection) {
      todoSection.style.display = todoIntegrationEnabled ? 'block' : 'none';
    }
  }
  
  function updateDegradationSectionVisibility() {
    const degradationOptions = document.getElementById('degradation-options');
    const visualDegradationEnabled = document.getElementById('visual-degradation').checked;
    if (degradationOptions) {
      if (visualDegradationEnabled) {
        degradationOptions.style.display = 'block';
        const arrow = document.getElementById('degradation-arrow');
        if (arrow) arrow.classList.add('expanded');
      } else {
        degradationOptions.style.display = 'none';
        const arrow = document.getElementById('degradation-arrow');
        if (arrow) arrow.classList.remove('expanded');
      }
    }
  }
  
  loadStats();
  loadSettings();
  loadTodos();
  
  document.getElementById('save-options').addEventListener('click', saveSettings);
  
  document.getElementById('reset-stats').addEventListener('click', function() {
    chrome.storage.local.set({sessions: {}}, function() {
      document.getElementById('site-stats').innerHTML = '<p>No social media usage recorded yet.</p>';
    });
    
    chrome.runtime.sendMessage({action: 'resetSessions'});
  });
  
  const degradationHeader = document.getElementById('degradation-header');
  if (degradationHeader) {
    degradationHeader.addEventListener('click', toggleDegradationOptions);
  }
  
  const visualDegradationToggle = document.getElementById('visual-degradation');
  if (visualDegradationToggle) {
    visualDegradationToggle.addEventListener('change', updateDegradationSectionVisibility);
  }
  
  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach(button => {
    button.addEventListener('click', function() {
      const preset = this.textContent.toLowerCase();
      setTimingPreset(preset);
    });
  });
  
  const addTodoBtn = document.getElementById('add-todo-btn');
  if (addTodoBtn) {
    addTodoBtn.addEventListener('click', addTodo);
  }
  
  const newTodoInput = document.getElementById('new-todo-input');
  if (newTodoInput) {
    newTodoInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addTodo();
      }
    });
  }
  
  const todoIntegrationToggle = document.getElementById('todo-integration');
  if (todoIntegrationToggle) {
    todoIntegrationToggle.addEventListener('change', updateTodoSectionVisibility);
  }
  
  window.toggleDegradationOptions = toggleDegradationOptions;
  window.setTimingPreset = setTimingPreset;
});
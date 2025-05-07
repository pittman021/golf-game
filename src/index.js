// Import Three.js
import * as THREE from 'three';

// Make Three.js available globally for existing code
window.THREE = THREE;

// Wait for DOM to be fully loaded before initializing the game
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing Three.js');
  
  try {
    // Import main game file
    const mainModule = await import('./main.js');
    console.log('main.js loaded successfully');
    
    // Call loadModules function directly instead of waiting for the 'load' event
    // This will kick off the game initialization immediately
    if (typeof mainModule.loadModules === 'function') {
      await mainModule.loadModules();
      console.log('Game initialization started via loadModules()');
    } else {
      console.warn('loadModules function not found in main.js - the game should initialize via its own event handlers');
    }
  } catch (error) {
    console.error('Error loading main.js:', error);
    
    // Add error display to the page
    const errorElement = document.createElement('div');
    errorElement.style.backgroundColor = 'rgba(255,0,0,0.8)';
    errorElement.style.color = 'white';
    errorElement.style.padding = '20px';
    errorElement.style.position = 'fixed';
    errorElement.style.top = '20px';
    errorElement.style.left = '20px';
    errorElement.style.zIndex = '1000';
    errorElement.textContent = 'Failed to load game: ' + error.message;
    document.body.appendChild(errorElement);
  }
}); 
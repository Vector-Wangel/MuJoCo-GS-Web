/**
 * Keyboard Control Module for MuJoCo Scenes
 *
 * Provides configurable keyboard controls for different scenes.
 * Add new scene configurations to SCENE_CONFIGS to enable keyboard control.
 */

// Scene-specific control configurations
// Add new scenes here to enable keyboard control
const SCENE_CONFIGS = {
  'xlerobot/scene.xml': {
    controls: [
      { key: 'KeyW', actuator: 'forward', value: 1 },
      { key: 'KeyS', actuator: 'forward', value: -1 },
      { key: 'KeyA', actuator: 'turn', value: -1 },
      { key: 'KeyD', actuator: 'turn', value: 1 },
    ],
    description: 'W/S: Forward/Back | A/D: Turn Left/Right'
  }
  // Example: Add more scenes like this:
  // 'car.xml': {
  //   controls: [
  //     { key: 'KeyW', actuator: 'throttle', value: 1 },
  //     { key: 'KeyS', actuator: 'throttle', value: -1 },
  //     { key: 'KeyA', actuator: 'steering', value: -1 },
  //     { key: 'KeyD', actuator: 'steering', value: 1 },
  //   ],
  //   description: 'W/S: Throttle | A/D: Steering'
  // }
};

export class KeyboardController {
  constructor() {
    this.enabled = false;
    this.config = null;
    this.model = null;
    this.data = null;
    this.keyStates = {};
    this.actuatorIndices = {};

    // Bind event handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  /**
   * Get configuration for a scene
   * @param {string} sceneName - The scene filename
   * @returns {object|null} - Configuration object or null if not configured
   */
  getConfig(sceneName) {
    return SCENE_CONFIGS[sceneName] || null;
  }

  /**
   * Check if a scene has keyboard control configured
   * @param {string} sceneName - The scene filename
   * @returns {boolean}
   */
  hasConfig(sceneName) {
    return sceneName in SCENE_CONFIGS;
  }

  /**
   * Enable keyboard control for a scene
   * @param {string} sceneName - The scene filename
   * @param {object} model - MuJoCo model
   * @param {object} data - MuJoCo data
   * @returns {boolean} - Whether enabling was successful
   */
  enable(sceneName, model, data) {
    // Disable any existing control first
    this.disable();

    const config = this.getConfig(sceneName);
    if (!config) {
      return false;
    }

    this.config = config;
    this.model = model;
    this.data = data;

    // Build actuator name to index mapping
    const textDecoder = new TextDecoder("utf-8");
    const nullChar = textDecoder.decode(new ArrayBuffer(1));

    this.actuatorIndices = {};
    for (let i = 0; i < model.nu; i++) {
      const name = textDecoder.decode(
        model.names.subarray(model.name_actuatoradr[i])
      ).split(nullChar)[0];
      this.actuatorIndices[name] = i;
    }

    // Initialize key states
    this.keyStates = {};
    for (const ctrl of config.controls) {
      this.keyStates[ctrl.key] = false;
    }

    // Add event listeners
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);

    this.enabled = true;
    return true;
  }

  /**
   * Disable keyboard control
   */
  disable() {
    if (!this.enabled) return;

    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);

    this.enabled = false;
    this.config = null;
    this.model = null;
    this.data = null;
    this.keyStates = {};
    this.actuatorIndices = {};
  }

  /**
   * Update actuator controls based on current key states
   * Call this in the render loop
   */
  update() {
    if (!this.enabled || !this.config || !this.data) return;

    // Group controls by actuator to handle opposing keys (e.g., W and S both affect 'forward')
    const actuatorValues = {};

    for (const ctrl of this.config.controls) {
      const actuatorIdx = this.actuatorIndices[ctrl.actuator];
      if (actuatorIdx === undefined) continue;

      if (!(ctrl.actuator in actuatorValues)) {
        actuatorValues[ctrl.actuator] = 0;
      }

      if (this.keyStates[ctrl.key]) {
        actuatorValues[ctrl.actuator] += ctrl.value;
      }
    }

    // Apply values to data.ctrl
    for (const [actuatorName, value] of Object.entries(actuatorValues)) {
      const idx = this.actuatorIndices[actuatorName];
      if (idx !== undefined) {
        // Clamp to control range if available
        let clampedValue = value;
        if (this.model.actuator_ctrllimited[idx]) {
          const min = this.model.actuator_ctrlrange[2 * idx];
          const max = this.model.actuator_ctrlrange[2 * idx + 1];
          clampedValue = Math.max(min, Math.min(max, value));
        }
        this.data.ctrl[idx] = clampedValue;
      }
    }
  }

  /**
   * Get current control description for GUI display
   * @returns {string}
   */
  getDescription() {
    return this.config ? this.config.description : '';
  }

  _onKeyDown(event) {
    if (!this.enabled) return;

    // Ignore if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.code in this.keyStates) {
      this.keyStates[event.code] = true;
      event.preventDefault();
    }
  }

  _onKeyUp(event) {
    if (!this.enabled) return;

    if (event.code in this.keyStates) {
      this.keyStates[event.code] = false;
      event.preventDefault();
    }
  }
}

// Singleton instance for easy access
export const keyboardController = new KeyboardController();

/**
 * Robot Loader Utility
 *
 * Handles loading robot files from:
 * 1. Predefined robot folders in assets/robots/
 * 2. User-uploaded robot folders (zip or directory)
 *
 * Manages writing files to MuJoCo's virtual filesystem.
 */

export class RobotLoader {
  constructor(mujoco) {
    this.mujoco = mujoco;
    this.loadedRobots = new Map(); // Track loaded robots
  }

  /**
   * Load a predefined robot from assets/robots/
   * @param {string} robotName - Robot folder name (e.g., 'xlerobot', 'SO101', 'panda')
   * @param {string} basePath - Base path to robots folder
   * @returns {Promise<{robotXml: string, objectsXml: string|null}>}
   */
  async loadPredefinedRobot(robotName, basePath = './assets/robots') {
    const robotDir = `${basePath}/${robotName}`;

    // Try to load main robot XML (try common names)
    const xmlNames = [`${robotName}.xml`, 'robot.xml', 'main.xml'];
    let robotXml = null;

    for (const name of xmlNames) {
      try {
        const response = await fetch(`${robotDir}/${name}`);
        if (response.ok) {
          robotXml = await response.text();
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!robotXml) {
      throw new Error(`Could not find robot XML in ${robotDir}`);
    }

    // Try to load objects XML (optional)
    let objectsXml = null;
    try {
      const response = await fetch(`${robotDir}/objects.xml`);
      if (response.ok) {
        objectsXml = await response.text();
      }
    } catch (e) {
      // Objects file is optional
    }

    return { robotXml, objectsXml, robotDir };
  }

  /**
   * Load robot from user-uploaded files (FileList from input[webkitdirectory])
   * @param {FileList|File[]} files - Uploaded files
   * @returns {Promise<{robotXml: string, objectsXml: string|null, meshFiles: Map, robotName: string}>}
   */
  async loadUploadedRobot(files) {
    const meshFiles = new Map();
    let robotXml = null;
    let objectsXml = null;
    let robotName = null;

    for (const file of files) {
      const path = file.webkitRelativePath || file.name;
      const pathParts = path.split('/');

      // Extract robot folder name from first directory
      if (pathParts.length > 1 && !robotName) {
        robotName = pathParts[0];
      }

      if (path.endsWith('.xml')) {
        const content = await file.text();
        const fileName = path.split('/').pop().toLowerCase();

        if (fileName.includes('object')) {
          objectsXml = content;
        } else if (!robotXml) {
          // First non-object XML is the main robot XML
          robotXml = content;
        }
      } else if (path.includes('meshes/') || path.includes('mesh/')) {
        // Store mesh files
        const buffer = await file.arrayBuffer();
        const meshName = path.split(/meshes?\//).pop();
        meshFiles.set(meshName, buffer);
      }
    }

    if (!robotXml) {
      throw new Error('No robot XML file found in uploaded folder');
    }

    // Default robot name if not detected from folder structure
    if (!robotName) {
      robotName = 'user_robot';
    }

    return { robotXml, objectsXml, meshFiles, robotName };
  }

  /**
   * Clean up uploaded robot files from virtual filesystem
   * @param {string} robotName - Robot identifier to remove
   */
  cleanupRobot(robotName) {
    const robotInfo = this.loadedRobots.get(robotName);
    if (!robotInfo) return;

    try {
      this.loadedRobots.delete(robotName);
    } catch (e) {
      console.warn(`Failed to cleanup robot ${robotName}:`, e);
    }
  }

  /**
   * Get list of loaded robots
   * @returns {string[]} - Array of robot names
   */
  getLoadedRobots() {
    return Array.from(this.loadedRobots.keys());
  }
}

/**
 * Scene Configuration Manager
 *
 * Manages the mapping between environments, robots, and their configurations.
 */
export class SceneConfigManager {
  constructor() {
    // Environment definitions
    this.environments = {
      'tabletop': {
        envPath: './assets/environments/tabletop/scene.xml',
        spzPath: './assets/environments/tabletop/scene.spz',
        description: 'Tabletop manipulation environment'
      }
    };

    // Robot definitions with their controllers
    this.robots = {
      'xlerobot': {
        robotPath: './assets/robots/xlerobot/xlerobot.xml',
        objectsPath: './assets/robots/xlerobot/objects.xml',
        controllerType: 'XLeRobotController',
        description: 'XLeRobot Dual-Arm Mobile Robot'
      },
      'SO101': {
        robotPath: './assets/robots/xlerobot/SO101.xml',
        objectsPath: './assets/robots/xlerobot/objects_SO101.xml',
        controllerType: 'SO101Controller',
        description: 'SO101 Single Arm'
      },
      'panda': {
        robotPath: './assets/robots/panda/panda.xml',
        objectsPath: './assets/robots/panda/objects.xml',
        controllerType: 'PandaController',
        description: 'Franka Emika Panda'
      },
      'humanoid': {
        robotPath: './assets/robots/humanoid/humanoid.xml',
        objectsPath: null,
        controllerType: null,
        description: 'DeepMind Humanoid'
      }
    };
  }

  getEnvironment(envName) {
    return this.environments[envName];
  }

  getRobot(robotName) {
    return this.robots[robotName];
  }

  listEnvironments() {
    return Object.keys(this.environments);
  }

  listRobots() {
    return Object.keys(this.robots);
  }

  /**
   * Register a user-uploaded robot
   */
  registerUploadedRobot(robotName, config) {
    this.robots[robotName] = {
      ...config,
      isUserUploaded: true
    };
  }
}

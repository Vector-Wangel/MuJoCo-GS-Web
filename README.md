<p align="center">

  <a href="https://vector-wangel.github.io/XLeRobot-Web/"><img src="https://github.com/user-attachments/assets/dfb13107-02b8-468d-ac18-3ea1fa3ec46d" href></a>
</p>


## Run XLeRobot in MuJoCo in your Browser.

Load and Run MuJoCo 3.3.8 Models using JavaScript and the official MuJoCo WebAssembly Bindings.

### [See the Live Demo Here](https://vector-wangel.github.io/XLeRobot-Web/)


## JavaScript API

```javascript
import load_mujoco from "./dist/mujoco_wasm.js";

// Load the MuJoCo Module
const mujoco = await load_mujoco();

// Set up Emscripten's Virtual File System
mujoco.FS.mkdir('/working');
mujoco.FS.mount(mujoco.MEMFS, { root: '.' }, '/working');
mujoco.FS.writeFile("/working/humanoid.xml", await (await fetch("./assets/scenes/humanoid.xml")).text());

// Load model and create data
let model = mujoco.MjModel.loadFromXML("/working/humanoid.xml");
let data  = new mujoco.MjData(model);

// Access model properties directly
let timestep = model.opt.timestep;
let nbody = model.nbody;

// Access data buffers (typed arrays)
let qpos = data.qpos;  // Joint positions
let qvel = data.qvel;  // Joint velocities
let ctrl = data.ctrl;  // Control inputs
let xpos = data.xpos;  // Body positions

// Step the simulation
mujoco.mj_step(model, data);

// Run forward kinematics
mujoco.mj_forward(model, data);

// Reset simulation
mujoco.mj_resetData(model, data);

// Apply forces (force, torque, point, body, qfrc_target)
mujoco.mj_applyFT(model, data, [fx, fy, fz], [tx, ty, tz], [px, py, pz], bodyId, data.qfrc_applied);

// Clean up
data.delete();
model.delete();
```





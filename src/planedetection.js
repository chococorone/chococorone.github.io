import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { XRButton } from "three/addons/webxr/XRButton.js";

import { XRPlanes } from "three/addons/webxr/XRPlanes.js";

const width = window.innerWidth;
const height = window.innerHeight;

let camera, scene, renderer;
let group, box;
let isControllerConnectedLeft = false;
let isControllerConnectedRight = false;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 50);
  camera.position.set(0, 1.0, 0.5);

  //表示するオブジェクト
  group = new THREE.Group();
  scene.add(group);
  box = new THREE.Mesh(
    //new THREE.BoxBufferGeometry(0.2, 0.2, 0.2),
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    //new THREE.MeshNormalMaterial()
    new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.0,
    })
  );
  box.position.set(0.0, 1.0, -0.5);
  box.name = "testbox";
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  //ライトの設定
  //scene.add(new THREE.HemisphereLight(0xbbbbbb, 0x888888, 3));
  scene.add(new THREE.HemisphereLight(0x808080, 0x606060));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(1, 1, 1).normalize();
  scene.add(light);

  //グリッドの設定
  const axes = new THREE.AxesHelper(1);
  axes.position.set(0.0, 1.0, -0.5);
  scene.add(axes);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.setAnimationLoop(onDrawAnimation);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, {
      requiredFeatures: ["plane-detection"],
    })
    //XRButton.createButton(renderer)
  );

  //コントローラーの準備
  const controller0 = settingController(0);
  const controller1 = settingController(1);
  scene.add(controller0);
  scene.add(controller1);

  //コントローラーモデルの準備
  const controllerModelFactory = new XRControllerModelFactory();
  const controllerGrip0 = renderer.xr.getControllerGrip(0);
  controllerGrip0.add(
    controllerModelFactory.createControllerModel(controllerGrip0)
  );
  const controllerGrip1 = renderer.xr.getControllerGrip(1);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip0);
  scene.add(controllerGrip1);
}

//コントローラーの取得
function settingController(index) {
  const controller = renderer.xr.getController(index);
  if (index === 0) {
    controller.name = "left controller";
  } else {
    controller.name = "right controller";
  }
  controller.addEventListener("connected", function (event) {
    console.log(event);
    this.add(buildController(event.data));
    if (index === 0) {
      isControllerConnectedLeft = true;
    } else {
      isControllerConnectedRight = true;
    }
  });
  controller.addEventListener("selectstart", onSelectStart);
  controller.addEventListener("selectend", onSelectEnd);
  controller.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
  });
}

function buildController(data) {
  console.log("build controller");
  let geometry, material;
  geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
  );
  material = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geometry, material);
  line.name = "line";

  switch (data.targetRayMode) {
    case "tracked-pointer":
      console.log("connected");
      console.log(line);
      return line;
    case "gaze":
      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
      });
      return new THREE.Mesh(geometry, material);
    case "screen":
      return line;
  }
}

function onSelectStart(event) {}
function onSelectEnd(event) {}

//描画のためにループする。setanimationloopでコールバックとして登録される
function onDrawAnimation(time, xrFrame) {
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;

  const planes = xrFrame.detectedPlanes;
  console.log(box);

  renderer.render(scene, camera);
}

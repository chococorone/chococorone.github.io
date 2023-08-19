//import * as THREE from "https://unpkg.com/three@0.113.2/build/three.module.js";
import * as THREE from "three";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";
import { XRButton } from "three/addons/webxr/XRButton.js";
import { OculusHandModel } from "three/addons/webxr/OculusHandModel.js";

const width = window.innerWidth;
const height = window.innerHeight;

let camera, scene, renderer;
let group, box;
let isTakingPinchAction = false;
const handModelFactory = new XRHandModelFactory();
const handList = [];
const intersected = [];
const TOUCH_RADIUS = 0.01;

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

  // コントローラーの追加
  const controller0 = addHandController(0);
  const controller1 = addHandController(1);
  handList.push(controller0);
  handList.push(controller1);

  //XRButtonクラスの内部で、現在の端末がimmersive-arに対応可能かの確認。セッションの開始をやってくれる
  document.body.appendChild(XRButton.createButton(renderer));
}

function addHandController(index) {
  const hand = renderer.xr.getHand(index);
  //hand.add(handModelFactory.createHandModel(hand, "mesh"));
  const handgrip = new OculusHandModel(hand);
  hand.add(handgrip);

  const indexSphere = new THREE.Mesh(
    new THREE.SphereGeometry(TOUCH_RADIUS),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  indexSphere.castShadow = true;
  indexSphere.receiveShadow = true;
  hand.userData.indexSphere = indexSphere;
  scene.add(hand.userData.indexSphere);

  hand.addEventListener("pinchstart", onPinchStart);
  hand.addEventListener("pinchend", onPinchEnd);

  scene.add(hand);
  return hand;
}

function onPinchStart() {
  console.log("pinch start");
  box.material.emissive.b = 1;
  isTakingPinchAction = true;
}
function onPinchEnd() {
  console.log("pinch end");
  box.material.emissive.b = 0;
  isTakingPinchAction = false;
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    object.material.emissive.r = 0;
    group.attach(object);
  }
}

//コントローラーと重なっているオブジェクトをリストで返す
function getIntersectedObjects(objects, hand) {
  const intersectedObjects = [];
  const pointerPosition = getPointerPosition(hand);
  if (pointerPosition) {
    const touchSphere = new THREE.Sphere(pointerPosition, TOUCH_RADIUS);

    objects.forEach((object) => {
      const box = new THREE.Box3().setFromObject(object);
      if (touchSphere.intersectsBox(box)) {
        intersectedObjects.push(object);
      }
    });
  }
  return intersectedObjects;
}

// https://github.com/mrdoob/three.js/blob/dev/examples/jsm/webxr/OculusHandModel.js の同名関数を参考としている
function getPointerPosition(hand) {
  const indexFingerTip = hand.joints["index-finger-tip"]; //https://www.w3.org/TR/webxr-hand-input-1/
  if (indexFingerTip) {
    return indexFingerTip.position;
  } else {
    return null;
  }
}

//人差し指先につけているsphereの座標更新
function updateIndexSphere(hand) {
  const pointerPosition = getPointerPosition(hand);
  if (pointerPosition) {
    hand.userData.indexSphere.position.set(
      pointerPosition.x,
      pointerPosition.y,
      pointerPosition.z
    );
  }
}

//描画のためにループする。setanimationloopでコールバックとして登録される
function onDrawAnimation(time, xrFrame) {
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;

  //handとobjectsの接触判定
  handList.forEach((hand) => {
    if (hand) {
      // 判定可視化の座標更新
      updateIndexSphere(hand);

      if (isTakingPinchAction) {
        cleanIntersected();
      } else {
        // 接触判定としてオブジェクトの色を赤くする
        //const intersected_objects = hand.intersectBoxObject(object); //用意されている関数。true,falseで返すのでイマイチ
        const intersectedObjects = getIntersectedObjects(group.children, hand);
        if (intersectedObjects.length > 0) {
          console.log("intersected");
          console.log(intersectedObjects);
          intersectedObjects.forEach((object) => {
            object.material.emissive.r = 1;
            intersected.push(object);
            console.log("hand");
            console.log(hand);
            hand.userData.indexSphere.attach(object);
            hand.userData.selected = object;
          });
        }
      }
    }
  });

  renderer.render(scene, camera);
}

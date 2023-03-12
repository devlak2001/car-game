import "./style.css";
import "./style.scss";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

// Register the MotionPathPlugin
gsap.registerPlugin(MotionPathPlugin);

let barricadeArray = [];
let starsArray = [];

// models
const models = {
  carModel: {
    url: "static/carModified.glb",
    object: null,
  },
  barricadeModel: {
    url: "static/barikada.glb",
    object: null,
  },
  mapModel: {
    url: "static/naseljev3.glb",
    object: null,
  },
  starModel: {
    url: "static/star.glb",
    object: null,
  },
};

const tracks = [
  {
    name: "left",
    x: -15.5,
  },
  {
    name: "middle",
    x: 0,
  },
  {
    name: "right",
    x: 15.5,
  },
];

const wallAvatars = [
  "capybara.jpg",
  "hedgehog.jpg",
  "black-footed-cat.jpg",
  "fennec-fox.png",
  "quokka.jpg",
  "sea-otter.jpg",
];

const starCollectedAudio = new Audio("static/audios/starCollected.mp3");
starCollectedAudio.playsInline = true;

const wallAvatarsTextures = [];

const loadingTextures = () => {
  const textureLoader = new THREE.TextureLoader();
  for (let i = 0; i < wallAvatars.length; i++) {
    // Load the texture image and create a texture object
    const texture = textureLoader.load("static/images/" + wallAvatars[i]);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    wallAvatarsTextures.push(new THREE.MeshBasicMaterial({ map: texture }));
  }
};

loadingTextures();

let userScore = 0;

const loadingModels = (scene) => {
  let modelsLoaded = 0;
  const loader = new GLTFLoader();

  for (const key in models) {
    loader.load(models[key].url, (model) => {
      models[key] = model.scene;

      if (scene) {
        scene.add(model.scene);
      }

      modelsLoaded++;

      if (modelsLoaded / Object.keys(models).length === 1) {
        const event = new CustomEvent("modelsLoaded");
        window.dispatchEvent(event);
      }
    });
  }
};

let carData = {
  track: tracks[Math.floor(Math.random() * tracks.length)],
  previousTrack: null,
};

const gameSettings = {
  start: false,
  gameOver: false,
  carSpeed: 2,
};

let camera;

function InitializeScene() {
  // Create a basic scene
  const scene = new THREE.Scene();

  loadingModels(scene);

  // Create a camera and add it to the scene
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.5,
    1000
  );
  scene.add(camera);
  camera.position.set(0, 60, 0);
  camera.rotation.x = -Math.PI / 4;
  // camera.rotation.x = -Math.PI / 4;

  // Add a hemisphere light
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.45);
  scene.add(hemisphereLight);

  // Add a directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  scene.add(directionalLight);
  directionalLight.position.set(0, 20, -5);

  // Add ambient light to the scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  // Create a renderer and add it to the DOM
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.prepend(renderer.domElement);
  renderer.setClearColor(0x32cd32, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Add resize listener to update the renderer and camera
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  function accelerate(startValue, endValue, duration, onUpdate) {
    const increment = (endValue - startValue) / (duration / 16); // 16ms is about 1 frame at 60fps
    let currentValue = startValue;
    const intervalId = setInterval(() => {
      if (gameSettings.start) {
        currentValue += increment;
      }
      onUpdate(currentValue);
      if (currentValue >= endValue) {
        clearInterval(intervalId);
      }
    }, 16);
  }

  window.addEventListener("modelsLoaded", () => {
    (() => {
      models.starModel.scale.set(0.013, 0.013, 0.013);
    })();
    (() => {
      models.barricadeModel.position.set(
        tracks[Math.floor(Math.random() * tracks.length)].x,
        0,
        models.carModel.position.z - 100
      );
      models.barricadeModel.scale.set(7, 7, 7);

      barricadeArray.push(models.barricadeModel);
    })();
    (() => {
      const box = new THREE.Box3().setFromObject(models.mapModel);
      const boxDepth = box.max.z - box.min.z;
      // Position the map section at the center of the scene, and at a distance of 50 units from the camera
      models.mapModel.position.set(0, 0, 0 - boxDepth / 2);

      // Create an array to keep track of the map sections
      const mapSections = [models.mapModel];

      // Create a function to duplicate and arrange the map sections as needed
      function duplicateMapSections() {
        const lastSection = mapSections[mapSections.length - 1];
        const newSection = lastSection.clone();
        newSection.rotation.y = Math.random() < 0.5 ? 0 : Math.PI;

        const wall1 = newSection.getObjectByName("wall1");
        const wall2 = newSection.getObjectByName("wall2");

        // Create a new material with the texture and assign it to the face Mesh
        wall1.material =
          wallAvatarsTextures[
            Math.floor(Math.random() * wallAvatarsTextures.length)
          ];

        wall2.material =
          wallAvatarsTextures[
            Math.floor(Math.random() * wallAvatarsTextures.length)
          ];

        // Position the new map section at the end of the last section
        newSection.position
          .copy(lastSection.position)
          .add(new THREE.Vector3(0, 0, -boxDepth));
        mapSections.push(newSection);
        scene.add(newSection);
      }

      // Create a function to move the map sections and remove any that are out of view
      function deleteMapSections() {
        mapSections.forEach((section) => {
          // section.position.z += 0.1; // Move the section forward
          if (section.position.z > camera.position.z + 50) {
            // Remove the section if it's out of view
            scene.remove(section);
            mapSections.shift();
          }
        });
      }

      const clock = new THREE.Clock();
      let deltaTime = 0;

      // Set up the render loop
      function animate() {
        deltaTime = clock.getDelta();
        requestAnimationFrame(animate);
        if (gameSettings.start) {
          // Move the camera forward
          if (!gameSettings.gameOver) {
            models.carModel.position.z -=
              deltaTime * 80 * gameSettings.carSpeed;
            camera.position.z -= deltaTime * 80 * gameSettings.carSpeed;
          }

          // Duplicate and move the map sections as needed
          if (
            camera.position.z <
            mapSections[mapSections.length - 1].position.z + boxDepth * 10
          ) {
            duplicateMapSections();
          }
          if (
            barricadeArray[barricadeArray.length - 1].position.z + 500 >
            models.carModel.position.z
          ) {
            generateBarricade();
          }

          if (!gameSettings.gameOver) {
            deleteMapSections();
            monitorBarricades();
          }
          // Render the scene
          renderer.render(scene, camera);
        }
      }
      animate();
    })();

    (() => {
      models.carModel.position.set(carData.track.x, 1.5, -14);
      models.carModel.scale.set(4, 4, 4);
      accelerate(0.5, 2, 180000, (value) => {
        gameSettings.carSpeed = value;
      });
    })();
  });

  function monitorBarricades() {
    const carBox = new THREE.Box3().setFromObject(models.carModel);
    const barricadeBox = new THREE.Box3().setFromObject(barricadeArray[0]);
    if (carBox.intersectsBox(barricadeBox)) {
      if (!gameSettings.gameOver) {
        const positionX = models.carModel.position.x;
        const positionY = models.carModel.position.y;
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(positionX, positionY, models.carModel.position.z),
          new THREE.Vector3(
            positionX,
            positionY + 20,
            models.carModel.position.z
          ),
          new THREE.Vector3(
            positionX,
            positionY + 20,
            models.carModel.position.z - gameSettings.carSpeed * 25
          ),
          new THREE.Vector3(
            positionX,
            positionY,
            models.carModel.position.z - gameSettings.carSpeed * 50
          )
        );

        // Create an array of points along the curve
        const points = curve.getPoints(300);

        gsap
          .timeline({ repeat: 0, ease: "none" })
          .to(models.carModel.position, {
            duration: 1,
            ease: "ease-in",
            motionPath: {
              path: points,
              type: "cubic",
              curviness: 0.5,
            },
          })
          .play();
        gsap.to(models.carModel.rotation, {
          x: -Math.PI,
          duration: 0.9,
          ease: "power1",
        });
      }

      gameSettings.gameOver = true;

      gsap.to(camera.position, {
        z: camera.position.z - gameSettings.carSpeed * 35,
        duration: 0.9,
        ease: "power1",
      });

      setTimeout(() => {
        document.querySelector(".gameOver").classList.add("show");
        managingBestScore();
      }, 1000);
    }

    if (barricadeArray[0].position.z > models.carModel.position.z + 20) {
      // Remove the barricade if it's out of view
      const tempBarricade = barricadeArray[0];
      barricadeArray.shift();
      setTimeout(() => {
        scene.remove(tempBarricade);
      }, 1000);
    }
    const starBox = new THREE.Box3().setFromObject(starsArray[0].model);
    if (carBox.intersectsBox(starBox) && !starsArray[0].interscected) {
      // synchronize the gsap animation with the animation loop
      const clonedAudio = starCollectedAudio.cloneNode();
      clonedAudio.autoplay = true;
      clonedAudio.play();
      starsArray[0].interscected = true;
      userScore++;
      document.querySelector(".userScore .number").innerHTML = userScore
        .toString()
        .padStart(4, "0");
      scene.remove(starsArray[0].model);
    }
    if (starsArray[0].model.position.z > models.carModel.position.z + 20) {
      // Remove the barricade if it's out of view
      const tempStar = starsArray[0];
      starsArray.shift();
      setTimeout(() => {
        scene.remove(tempStar.model);
      }, 1000);
    }
  }
  function generateBarricade() {
    barricadeArray.push(barricadeArray[barricadeArray.length - 1].clone());
    barricadeArray[barricadeArray.length - 1].position.set(
      tracks[Math.floor(Math.random() * tracks.length)].x,
      0,
      barricadeArray[barricadeArray.length - 2].position.z -
        getRandomNumber(30, 75)
    );
    const starCopy = models.starModel.clone();
    scene.add(starCopy);
    starsArray.push({ model: starCopy, interscected: false });
    gsap.to(starCopy.rotation, {
      duration: 0.5,
      y: Math.PI,
      repeat: -1,
      ease: "power1",
    });

    starCopy.position.set(
      tracks[Math.floor(Math.random() * tracks.length)].x,
      5,
      barricadeArray[barricadeArray.length - 2].position.z -
        (barricadeArray[barricadeArray.length - 2].position.z -
          barricadeArray[barricadeArray.length - 1].position.z) /
          2
    );
    scene.add(barricadeArray[barricadeArray.length - 1]);
  }

  window.addEventListener("swipeleft", function () {
    carData.previousTrack = carData.track.name;
    switch (carData.track.name) {
      case "right":
        carData.track = tracks[1];
        break;
      case "middle":
        carData.track = tracks[0];
        break;
      default:
        break;
    }
    if (
      carData.previousTrack !== carData.track.name &&
      !gameSettings.gameOver
    ) {
      gsap.to(models.carModel.position, {
        duration: 0.3,
        x: carData.track.x,
      });

      gsap
        .timeline()
        .to(models.carModel.rotation, {
          duration: 0.15,
          y: 0.2,
          ease: "none",
        })
        .to(models.carModel.rotation, {
          duration: 0.15,
          y: 0,
          ease: "none",
        });
    }
  });
  window.addEventListener("swiperight", function () {
    carData.previousTrack = carData.track.name;
    switch (carData.track.name) {
      case "left":
        carData.track = tracks[1];
        break;
      case "middle":
        carData.track = tracks[2];
        break;
      default:
        break;
    }
    if (
      carData.previousTrack !== carData.track.name &&
      !gameSettings.gameOver
    ) {
      gsap.to(models.carModel.position, {
        duration: 0.3,
        x: carData.track.x,
      });

      gsap
        .timeline()
        .to(models.carModel.rotation, {
          duration: 0.15,
          y: -0.2,
          ease: "none",
        })
        .to(models.carModel.rotation, {
          duration: 0.15,
          y: 0,
          ease: "none",
        });
    }
  });
}
InitializeScene();

const swipeDetection = () => {
  let startX, startY, endX, endY;
  let minDistance = 30; // minimum swipe distance in pixels

  window.addEventListener("touchstart", function (event) {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  });

  window.addEventListener("touchend", function (event) {
    endX = event.changedTouches[0].clientX;
    endY = event.changedTouches[0].clientY;

    let deltaX = endX - startX;
    let deltaY = endY - startY;

    // Check if the swipe distance is greater than the minimum distance
    if (Math.abs(deltaX) > minDistance || Math.abs(deltaY) > minDistance) {
      // Determine the direction of the swipe based on the angle of the swipe vector
      let angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
      if (angle < -45 && angle > -135) {
        // Dispatch a custom event for an upward swipe
        let event = new CustomEvent("swipeup");
        window.dispatchEvent(event);
      } else if (angle >= 45 && angle < 135) {
        // Dispatch a custom event for a downward swipe
        let event = new CustomEvent("swipedown");
        window.dispatchEvent(event);
      } else if (angle >= 135 || angle < -135) {
        // Dispatch a custom event for a leftward swipe
        let event = new CustomEvent("swipeleft");
        window.dispatchEvent(event);
      } else {
        // Dispatch a custom event for a rightward swipe
        let event = new CustomEvent("swiperight");
        window.dispatchEvent(event);
      }
    }
  });
};
swipeDetection();

const keyBoardControls = () => {
  document.addEventListener("keydown", function (event) {
    if (event.code === "KeyA" || event.code === "ArrowLeft") {
      let event = new CustomEvent("swipeleft");
      window.dispatchEvent(event);
    } else if (event.code === "KeyD" || event.code === "ArrowRight") {
      // D or Right arrow key is pressed
      let event = new CustomEvent("swiperight");
      window.dispatchEvent(event);
    }
  });
};
keyBoardControls();

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function handleUI() {
  document.querySelector("#restartButton").addEventListener("click", () => {
    location.reload();
  });
  document.querySelector("#startButton").addEventListener("click", (e) => {
    e.currentTarget.blur();
    gameSettings.start = true;
    document.querySelector(".startScreen").classList.add("hide");
    const audio = new Audio("static/audios/backgroundMusic.mp3");
    audio.loop = true;
    audio.volume = 0.1; // Set volume to 50%
    audio.play();
  });
  window.addEventListener("load", function () {
    document.body.style.opacity = 1;
  });
  if (localStorage.getItem("bestScore")) {
    document.querySelector(".userScore .bestScore").innerHTML =
      "Best score: " +
      localStorage.getItem("bestScore").toString().padStart(4, "0");
  }
}
handleUI();

const managingBestScore = () => {
  if (!localStorage.getItem("bestScore")) {
    localStorage.setItem("bestScore", userScore);
  } else if (localStorage.getItem("bestScore") < userScore) {
    localStorage.setItem("bestScore", userScore);
  }
};

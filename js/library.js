//variables
const video = document.getElementById("video");
const canvas = document.getElementById("output");

/*------VIDEOS RESOURCES -----*/
// Get available Devices of THE uSER
const getDevices = async () => {
  console.log("entro");
  //que el user agent sea compatible con mediaDevices
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    alertPrompt();
    return [];
  }
  //ahora miramos si  que devices ofrece el USER
  //alertPrompt('Lo soporta');
  const devices = await navigator.mediaDevices.enumerateDevices();

  // Por ahora me interesa solo el video-Label-deviceId
  const VideoDevices = devices.filter((device) => device.kind === "videoinput");

  //si no retornar error si no tiene
  console.log("Video devices here");
  console.log(VideoDevices[0].deviceId);
  return VideoDevices;
};
//stop any video playing before basically
const stopVideo = () => {
  //solo si srcObject esta definido borra sus tracks.... y exista el video element..
  if (video && video.srcObject) {
    console.log("papi");
    video.srcObject.getTracks().forEach((track) => {
      track.stop();
    });
    video.srcObject = null;
  }
};

//load video configs
const setVideo = async () => {
  stopVideo(video);
  const config = {
    audio: false,
    video: true,
  };
  const stream = await navigator.mediaDevices.getUserMedia(config);
  video.srcObject = stream;

  //retornamos promesa para forzar que espere y retorne
  return PromiseCreator();
};

//ponemos el video con sus valores
const PromiseCreator = () => {
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      resolve(video);
    };
  });
};

async function loadVideo() {
  let state_video;
  try {
    state_video = await setVideo();
  } catch (e) {
    throw e;
  }
  //"comenzamos" el stream para que se carge y podamos a empezar a aplica prediciones
  state_video.play();
}

/* --------- ML PART-------*/
async function loadModel() {
  const modelConfig = {
    architecture: "MobileNetV1",
    outputStride: 16,
    multiplier: 0.5,
    quantBytes: 4,
  };

  net = await bodyPix.load(modelConfig);
  console.log(net);
  return net;
}

async function blurRealBackground() {
  //podemos hacer como un slider aqui con estos 2 parametros
  const backgroundBlurAmount = 20;
  const edgeBlurAmount = 3;
  const flipHorizontal = false;

  // Draw the image with the background blurred onto the canvas. The edge between
  // the person and blurred background is blurred by 3 pixels.
  bodyPix.drawBokehEffect(
    canvas,
    video,
    prediction,
    true
  );
}

//el perreo
async function makePredictionPerson() {
  const config = {
    flipHorizontal: true,
    internalResolution: "high",
    segmentationThreshold: 0.5,
  };
  prediction = await net.segmentPerson(video, config);
  //console.log(prediction);
  return prediction;
}

async function maskEffect(prediction) {
  //consists of 0 and 1
  //1 where the person is 0 the background
  const maskBackground = true;
  // Convert the segmentation into a mask to darken the background.
  const foregroundColor = { r: 0, g: 0, b: 0, a: 0 }; //the human part
  const backgroundColor = { r: 0, g: 0, b: 0, a: 0 }; //the background part
  const mask = await bodyPix.toMask(
    prediction,
    foregroundColor,
    backgroundColor
  );
  return mask;
}

//remove background...
async function removeBackground() {
  const context = canvas.getContext("2d");
  const camera = video;
  context.drawImage(camera, 0, 0, camera.width, camera.height);
  var imageData = context.getImageData(0, 0, camera.width, camera.height);
  var pixel = imageData.data; //los pixeles de la imagen
  for (var p = 0; p < pixel.length; p += 4) {
    if (prediction.data[p / 4] == 0) {
      pixel[p + 3] = 0; // la matrix es de RGB A la idea es poner la transparencia en 0
    }
  }
  context.imageSmoothingEnabled = true;
  context.putImageData(imageData, 0, 0);
}
async function drawMaskVirtualBackground() {
  //Effect to call
  const opacity = 1;
  const maskBlurAmount = 4;
  const flipHorizontal = false;
  //console.log(prediction);
  const mask = await maskEffect(prediction);

  //put background image
  canvas.getContext("2d").drawImage(video, 0, 0, video.width, video.height);

  const imageData = canvas
    .getContext("2d")
    .getImageData(0, 0, video.width, video.height);
  const pixel = imageData.data;

  for (var p = 0; p < pixel.length; p += 4) {
    if (prediction.data[p / 4] == 0) {
      pixel[p + 3] = 0;
    }
  }

  canvas.getContext("2d").imageSmoothingEnabled = true;
  canvas.getContext("2d").putImageData(imageData, 0, 0);
}

async function clearCanvas() {
  const context = canvas.getContext("2d");
  await context.clearRect(0, 0, canvas.width, canvas.height);
}

let net;
let prediction;
async function execute() {
  await getDevices(); //good mira devices disponibles
  await loadVideo(); //good carga el video

  await loadModel(); //carga el modelo pertinente

  //hacemos el loop 1-hace prediccion , 2-limpiar el canvas 3-colorear el canvas 4- repetir
  setInterval(async () => {
    //console.log('positivo');
    await makePredictionPerson();
    await clearCanvas();

    //para el background virtual
    //await drawMaskVirtualBackground();
    await removeBackground();
    //blur para el background real
    //await blurRealBackground();
  }, 200);

  //await drawMask(await makePredictionPerson(await loadModel(await loadVideo()))) ;

  //await stopVideo();
}

execute();

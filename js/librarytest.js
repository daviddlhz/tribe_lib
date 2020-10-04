/*
 * TribeLibCam
 * Copyright 2020
 * Author: Kayman Lab
 * All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
 *
 * Project: --
 */

function TribeLibCam() {
  /**
   * @desc Library that use for remove background
   * and add blur using TensorFlow
   */
  const video = document.getElementById("video");
  const canvas = document.getElementById("output");

  this.modelConfigs = {
    GoodPC: {
      architecture: "ResNet50",
      outputStride: 32,
      quantBytes: 2,
    },

    MediumPC: {
      architecture: "MobileNetV1",
      outputStride: 16,
      multiplier: 1,
      quantBytes: 4,
    },

    SlowPC: {
      architecture: "MobileNetV1",
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2,
    },

    SuperSlowPC: {
      architecture: "MobileNetV1",
      outputStride: 16,
      multiplier: 0.50,
      quantBytes: 2,
    },
  };

  this.segmentationConfigs = {
    GoodSeg: {
      flipHorizontal: false,
      internalResolution: "high",
      segmentationThreshold: 0.7,
    },

    MediumSeg: {
      flipHorizontal: false,
      internalResolution: "medium",
      segmentationThreshold: 0.7,
    },

    LowSeg: {
      flipHorizontal: false,
      internalResolution: "low",
      segmentationThreshold: 0.7,
    },
  };

  this.GetDevices = async () => {
    /**
     * @desc Obtain permissions of camera and microfone
     * @return Array - Contains device information
     */

    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.log("Devices not support");
      return [];
    } else {
      let devices = await navigator.mediaDevices.enumerateDevices();
      console.log(devices);
      let VideoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      if (VideoDevices[0].deviceid == "") {
        console.log("Devices permissions denied");
      } else {
        return VideoDevices;
      }
    }
  };

  this.stopVideo = () => {
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
      video.srcObject = null;
    }
  };

  this.setVideo = async () => {
    this.stopVideo(video);
    const config = {
      audio: false,
      video: true,
    };
    const stream = await navigator.mediaDevices.getUserMedia(config);
    video.srcObject = stream;

    return this.PromiseCreator();
  };

  this.PromiseCreator = () => {
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

  this.loadVideo = async () => {
    let state_video;
    try {
      state_video = await this.setVideo();
    } catch (e) {
      throw e;
    }
    state_video.play();
  };

  this.loadModel = () => {
    const net = bodyPix.load(this.modelConfigs.SuperSlowPC);
    return net;
  };

  this.makePredictionPerson = async () => {
    let prediction;
    let net = await this.loadModel();
    prediction = await net.segmentPerson(video, this.segmentationConfigs.MediumSeg);
    return prediction;
  };

  this.clearCanvas = async () => {
    const context = canvas.getContext("2d");
    await context.clearRect(0, 0, canvas.width, canvas.height);
  };

  this.removeBackground = async () => {
    const context = canvas.getContext("2d");
    const camera = video;
    let prediction = await this.makePredictionPerson();
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
  };

  this.draw = async () => {
    await this.removeBackground();
    requestAnimationFrame(this.draw);
  }

  this.execute = async () => {
    await this.GetDevices();
    await this.loadVideo();
    await this.makePredictionPerson();
    requestAnimationFrame(this.draw);
  }
}

const cam = new TribeLibCam();
cam.execute();

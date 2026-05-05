"use client"

type VisionModule = typeof import("@mediapipe/tasks-vision")
type VisionSegmenter = import("@mediapipe/tasks-vision").ImageSegmenter

export type VideoBackgroundBlurProcessor = {
  outputStream: MediaStream
  destroy: () => void
}

const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
const SELFIE_SEGMENTER_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite"

let visionModulePromise: Promise<VisionModule> | null = null
let segmenterPromise: Promise<VisionSegmenter> | null = null

function getVisionModule() {
  if (!visionModulePromise) {
    visionModulePromise = import("@mediapipe/tasks-vision")
  }
  return visionModulePromise
}

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const visionModule = await getVisionModule()
      const vision = await visionModule.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL)
      return visionModule.ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: SELFIE_SEGMENTER_MODEL_URL,
          delegate: "GPU",
        },
        canvas: document.createElement("canvas"),
        runningMode: "VIDEO",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      })
    })()
  }
  return segmenterPromise
}

function waitForVideo(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("Unable to load camera preview for background blur"))
    }
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded)
      video.removeEventListener("error", onError)
    }
    video.addEventListener("loadedmetadata", onLoaded, { once: true })
    video.addEventListener("error", onError, { once: true })
  })
}

export async function createVideoBackgroundBlurProcessor(track: MediaStreamTrack): Promise<VideoBackgroundBlurProcessor> {
  const segmenter = await getSegmenter()
  const sourceStream = new MediaStream([track])
  const sourceVideo = document.createElement("video")
  sourceVideo.autoplay = true
  sourceVideo.muted = true
  sourceVideo.playsInline = true
  sourceVideo.srcObject = sourceStream
  await waitForVideo(sourceVideo)
  await sourceVideo.play().catch(() => {})

  const outputCanvas = document.createElement("canvas")
  const outputCtx = outputCanvas.getContext("2d", { alpha: true })
  if (!outputCtx) {
    throw new Error("Unable to create output canvas for background blur")
  }

  const personCanvas = document.createElement("canvas")
  const personCtx = personCanvas.getContext("2d", { alpha: true })
  if (!personCtx) {
    throw new Error("Unable to create foreground canvas for background blur")
  }

  const maskCanvas = document.createElement("canvas")
  const maskCtx = maskCanvas.getContext("2d", { alpha: true })
  if (!maskCtx) {
    throw new Error("Unable to create mask canvas for background blur")
  }

  let frameRequestId = 0
  let animationFrameId = 0
  let destroyed = false
  let maskImageData: ImageData | null = null

  const syncCanvasSize = () => {
    const width = sourceVideo.videoWidth || 720
    const height = sourceVideo.videoHeight || 1280
    if (outputCanvas.width === width && outputCanvas.height === height) return
    outputCanvas.width = width
    outputCanvas.height = height
    personCanvas.width = width
    personCanvas.height = height
  }

  const renderFrame = () => {
    if (destroyed) return
    syncCanvasSize()

    const result = segmenter.segmentForVideo(sourceVideo, performance.now())
    try {
      const confidenceMask = result.confidenceMasks?.[1] ?? result.confidenceMasks?.[0]
      const maskPixels = confidenceMask?.getAsFloat32Array()
      if (!confidenceMask || !maskPixels) {
        outputCtx.filter = "none"
        outputCtx.drawImage(sourceVideo, 0, 0, outputCanvas.width, outputCanvas.height)
        return
      }

      if (
        maskCanvas.width !== confidenceMask.width ||
        maskCanvas.height !== confidenceMask.height ||
        !maskImageData
      ) {
        maskCanvas.width = confidenceMask.width
        maskCanvas.height = confidenceMask.height
        maskImageData = maskCtx.createImageData(confidenceMask.width, confidenceMask.height)
      }

      const maskData = maskImageData.data
      for (let maskIndex = 0, pixelIndex = 0; maskIndex < maskPixels.length; maskIndex += 1, pixelIndex += 4) {
        const confidence = Math.max(0, Math.min(maskPixels[maskIndex], 1))
        const alpha = Math.round(confidence * 255)
        maskData[pixelIndex] = 255
        maskData[pixelIndex + 1] = 255
        maskData[pixelIndex + 2] = 255
        maskData[pixelIndex + 3] = alpha
      }
      maskCtx.putImageData(maskImageData, 0, 0)

      personCtx.clearRect(0, 0, personCanvas.width, personCanvas.height)
      personCtx.globalCompositeOperation = "source-over"
      personCtx.drawImage(sourceVideo, 0, 0, personCanvas.width, personCanvas.height)
      personCtx.globalCompositeOperation = "destination-in"
      personCtx.filter = "blur(1.5px)"
      personCtx.drawImage(maskCanvas, 0, 0, personCanvas.width, personCanvas.height)
      personCtx.filter = "none"
      personCtx.globalCompositeOperation = "source-over"

      outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height)
      outputCtx.filter = "blur(18px)"
      outputCtx.drawImage(sourceVideo, 0, 0, outputCanvas.width, outputCanvas.height)
      outputCtx.filter = "none"
      outputCtx.drawImage(personCanvas, 0, 0, outputCanvas.width, outputCanvas.height)
    } finally {
      result.close()
    }
  }

  const scheduleNextFrame = () => {
    if (destroyed) return
    const frameVideo = sourceVideo as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number
      cancelVideoFrameCallback?: (handle: number) => void
    }
    if (typeof frameVideo.requestVideoFrameCallback === "function") {
      frameRequestId = frameVideo.requestVideoFrameCallback(() => {
        renderFrame()
        scheduleNextFrame()
      })
      return
    }
    animationFrameId = window.requestAnimationFrame(() => {
      renderFrame()
      scheduleNextFrame()
    })
  }

  renderFrame()
  scheduleNextFrame()

  const outputStream = outputCanvas.captureStream(Math.max(track.getSettings().frameRate ?? 24, 24))

  return {
    outputStream,
    destroy: () => {
      destroyed = true
      const frameVideo = sourceVideo as HTMLVideoElement & {
        cancelVideoFrameCallback?: (handle: number) => void
      }
      if (frameRequestId && typeof frameVideo.cancelVideoFrameCallback === "function") {
        frameVideo.cancelVideoFrameCallback(frameRequestId)
      }
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
      outputStream.getTracks().forEach((streamTrack) => streamTrack.stop())
      sourceVideo.pause()
      sourceVideo.srcObject = null
    },
  }
}

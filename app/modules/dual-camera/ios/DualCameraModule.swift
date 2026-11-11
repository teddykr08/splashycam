// dual-camera (iOS): front camera on the top half, back camera on the bottom half,
// recorded as ONE video.
//
// STATUS: written against Apple's documented AVFoundation APIs (AVCaptureMultiCamSession,
// the approach of Apple's "AVMultiCamPiP" sample) and Expo's module/view API, but NEVER
// COMPILED OR RUN. Needs an EAS build and a real iPhone (XS / A12 or newer). Spots most
// likely to need fixing are marked "CHECK ON DEVICE".
//
// How it works:
//  - One AVCaptureMultiCamSession with the back wide camera, the front camera and the mic.
//  - Two preview layers wired with explicit connections: front fills the top half, back the
//    bottom half (the same split as the Expo Go preview in app/record.tsx).
//  - Recording: each back-camera frame is stacked under the latest front-camera frame
//    (Core Image, each centre-cropped to fill its half, no stretching) into a pixel buffer
//    and appended to an AVAssetWriter, with the mic audio.

import AVFoundation
import CoreImage
import ExpoModulesCore
import UIKit

/// Split layout. Mirrors LAYOUT in ../index.ts: the front camera gets this share of the
/// height, at the top; the back camera gets the rest, at the bottom.
internal enum Split {
  static let frontFraction: CGFloat = 0.5
}

/// Scale `image` to fill `rect` (aspect-fill, centred) and crop it to `rect`.
internal func fill(_ image: CIImage, into rect: CGRect) -> CIImage {
  let scale = max(rect.width / image.extent.width, rect.height / image.extent.height)
  let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
  let dx = rect.midX - scaled.extent.midX
  let dy = rect.midY - scaled.extent.midY
  return scaled.transformed(by: CGAffineTransform(translationX: dx, y: dy)).cropped(to: rect)
}

internal final class DualCameraUnsupportedException: Exception {
  override var reason: String { "This iPhone can't run two cameras at once (needs A12 / iPhone XS or newer)" }
}

internal final class DualCameraStateException: GenericException<String> {
  override var reason: String { param }
}

public class DualCameraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DualCamera")

    // AVCaptureMultiCamSession exists since iOS 13 and runs on A12 (iPhone XS) and later.
    Function("isSupported") { () -> Bool in
      AVCaptureMultiCamSession.isMultiCamSupported
    }

    View(DualCameraView.self) {
      Events("onCameraReady", "onMountError")

      AsyncFunction("startRecording") { (view: DualCameraView) in
        try view.startRecording()
      }

      AsyncFunction("stopRecording") { (view: DualCameraView) async throws -> String in
        try await view.stopRecording()
      }
    }
  }
}

public final class DualCameraView: ExpoView, AVCaptureVideoDataOutputSampleBufferDelegate,
  AVCaptureAudioDataOutputSampleBufferDelegate {
  let onCameraReady = EventDispatcher()
  let onMountError = EventDispatcher()

  private let session = AVCaptureMultiCamSession()
  private let sessionQueue = DispatchQueue(label: "splashycam.dualcamera.session")
  private let dataQueue = DispatchQueue(label: "splashycam.dualcamera.data")

  private let backPreview = AVCaptureVideoPreviewLayer()
  private let frontPreview = AVCaptureVideoPreviewLayer()

  private let backOutput = AVCaptureVideoDataOutput()
  private let frontOutput = AVCaptureVideoDataOutput()
  private let audioOutput = AVCaptureAudioDataOutput()

  private let ciContext = CIContext()
  private var latestFront: CIImage?

  // Recording state: touched only on dataQueue.
  private var writer: AVAssetWriter?
  private var videoInput: AVAssetWriterInput?
  private var audioInput: AVAssetWriterInput?
  private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var sessionStarted = false
  private var outputURL: URL?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    backPreview.videoGravity = .resizeAspectFill
    frontPreview.videoGravity = .resizeAspectFill
    backPreview.masksToBounds = true
    frontPreview.masksToBounds = true
    layer.addSublayer(backPreview)
    layer.addSublayer(frontPreview)
    sessionQueue.async { [weak self] in self?.configure() }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    // UIKit's origin is top-left: front on the top half, back on the bottom half.
    let frontH = (bounds.height * Split.frontFraction).rounded()
    frontPreview.frame = CGRect(x: 0, y: 0, width: bounds.width, height: frontH)
    backPreview.frame = CGRect(x: 0, y: frontH, width: bounds.width, height: bounds.height - frontH)
  }

  deinit {
    session.stopRunning()
  }

  // MARK: - Session

  private func configure() {
    guard AVCaptureMultiCamSession.isMultiCamSupported else {
      onMountError(["message": DualCameraUnsupportedException().reason])
      return
    }
    session.beginConfiguration()
    do {
      try addCamera(position: .back, output: backOutput, preview: backPreview, mirrored: false)
      try addCamera(position: .front, output: frontOutput, preview: frontPreview, mirrored: true)
      try addMicrophone()
    } catch {
      session.commitConfiguration()
      onMountError(["message": "Couldn't set up both cameras: \(error.localizedDescription)"])
      return
    }
    session.commitConfiguration()

    // CHECK ON DEVICE: multi-cam has a hardware cost budget. If this is > 1 the session won't
    // run; lower the formats (e.g. pick 1280x720 activeFormats) until it's <= 1.
    if session.hardwareCost > 1.0 {
      onMountError(["message": "Two cameras at this quality are too much for this iPhone (cost \(session.hardwareCost))"])
      return
    }
    session.startRunning()
    DispatchQueue.main.async { self.onCameraReady([:]) }
  }

  private func addCamera(position: AVCaptureDevice.Position, output: AVCaptureVideoDataOutput,
                         preview: AVCaptureVideoPreviewLayer, mirrored: Bool) throws {
    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position) else {
      throw DualCameraStateException("No \(position == .back ? "back" : "front") camera")
    }
    let input = try AVCaptureDeviceInput(device: device)
    guard session.canAddInput(input) else { throw DualCameraStateException("Can't add camera input") }
    session.addInputWithNoConnections(input)

    guard let port = input.ports(for: .video, sourceDeviceType: device.deviceType, sourceDevicePosition: position).first
    else { throw DualCameraStateException("No video port") }

    output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    output.alwaysDiscardsLateVideoFrames = true
    output.setSampleBufferDelegate(self, queue: dataQueue)
    guard session.canAddOutput(output) else { throw DualCameraStateException("Can't add video output") }
    session.addOutputWithNoConnections(output)

    let dataConnection = AVCaptureConnection(inputPorts: [port], output: output)
    guard session.canAddConnection(dataConnection) else { throw DualCameraStateException("Can't connect camera") }
    session.addConnection(dataConnection)
    setPortrait(dataConnection)
    dataConnection.isVideoMirrored = mirrored

    preview.setSessionWithNoConnection(session)
    let previewConnection = AVCaptureConnection(inputPort: port, videoPreviewLayer: preview)
    guard session.canAddConnection(previewConnection) else { throw DualCameraStateException("Can't connect preview") }
    session.addConnection(previewConnection)
    setPortrait(previewConnection)
  }

  private func addMicrophone() throws {
    guard let mic = AVCaptureDevice.default(for: .audio) else { return } // record silent rather than fail
    let input = try AVCaptureDeviceInput(device: mic)
    guard session.canAddInput(input) else { return }
    session.addInput(input)
    audioOutput.setSampleBufferDelegate(self, queue: dataQueue)
    if session.canAddOutput(audioOutput) { session.addOutput(audioOutput) }
  }

  private func setPortrait(_ connection: AVCaptureConnection) {
    if #available(iOS 17.0, *) {
      if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
    } else if connection.isVideoOrientationSupported {
      connection.videoOrientation = .portrait
    }
  }

  // MARK: - Recording

  func startRecording() throws {
    try dataQueue.sync {
      guard writer == nil else { throw DualCameraStateException("Already recording") }
      let url = FileManager.default.temporaryDirectory
        .appendingPathComponent("dual-\(Int(Date().timeIntervalSince1970 * 1000)).mp4")
      let w = try AVAssetWriter(outputURL: url, fileType: .mp4)
      // Portrait 1080x1920 H.264. CHECK ON DEVICE: match the back camera's actual buffer size.
      let video = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: 1080,
        AVVideoHeightKey: 1920,
      ])
      video.expectsMediaDataInRealTime = true
      let audio = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVNumberOfChannelsKey: 1,
        AVSampleRateKey: 44_100,
      ])
      audio.expectsMediaDataInRealTime = true
      guard w.canAdd(video), w.canAdd(audio) else { throw DualCameraStateException("Can't set up the recorder") }
      w.add(video)
      w.add(audio)
      adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: video, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: 1080,
        kCVPixelBufferHeightKey as String: 1920,
      ])
      guard w.startWriting() else { throw DualCameraStateException(w.error?.localizedDescription ?? "Can't start writing") }
      writer = w
      videoInput = video
      audioInput = audio
      outputURL = url
      sessionStarted = false
    }
  }

  func stopRecording() async throws -> String {
    let (w, url): (AVAssetWriter?, URL?) = dataQueue.sync {
      let pair = (writer, outputURL)
      videoInput?.markAsFinished()
      audioInput?.markAsFinished()
      writer = nil
      videoInput = nil
      audioInput = nil
      adaptor = nil
      return pair
    }
    guard let w, let url else { throw DualCameraStateException("Not recording") }
    await w.finishWriting()
    guard w.status == .completed else {
      throw DualCameraStateException(w.error?.localizedDescription ?? "Recording failed")
    }
    return url.absoluteString
  }

  // MARK: - Frames (dataQueue)

  public func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer,
                            from connection: AVCaptureConnection) {
    if output === frontOutput {
      if let px = CMSampleBufferGetImageBuffer(sampleBuffer) { latestFront = CIImage(cvPixelBuffer: px) }
      return
    }
    guard let writer, writer.status == .writing else { return }
    let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)

    if output === audioOutput {
      if sessionStarted, let audioInput, audioInput.isReadyForMoreMediaData { audioInput.append(sampleBuffer) }
      return
    }

    // Back camera frame: composite and write.
    guard output === backOutput, let backPx = CMSampleBufferGetImageBuffer(sampleBuffer),
          let adaptor, let videoInput, videoInput.isReadyForMoreMediaData, let pool = adaptor.pixelBufferPool
    else { return }
    if !sessionStarted {
      writer.startSession(atSourceTime: time)
      sessionStarted = true
    }
    var outPx: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pool, &outPx)
    guard let outPx else { return }

    let outW = CGFloat(CVPixelBufferGetWidth(outPx)), outH = CGFloat(CVPixelBufferGetHeight(outPx))
    // Core Image's origin is bottom-left: the back camera's half is y 0..backH (bottom),
    // the front camera's half is y backH..outH (top).
    let frontH = (outH * Split.frontFraction).rounded()
    let backH = outH - frontH
    let backRect = CGRect(x: 0, y: 0, width: outW, height: backH)
    let frontRect = CGRect(x: 0, y: backH, width: outW, height: frontH)

    var composed = fill(CIImage(cvPixelBuffer: backPx), into: backRect)
    if let front = latestFront {
      composed = fill(front, into: frontRect).composited(over: composed)
    } else {
      // No front frame yet (first instants): black top half rather than stretched back.
      composed = CIImage(color: .black).cropped(to: frontRect).composited(over: composed)
    }

    ciContext.render(composed, to: outPx)
    adaptor.append(outPx, withPresentationTime: time)
  }
}

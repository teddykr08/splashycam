// stamp-video (iOS): burns the Splashy Cam camcorder stamp into a video, on-device.
//
// STATUS: written against Apple's documented AVFoundation / Core Image APIs and Expo's
// module API, but NEVER COMPILED OR RUN. It needs a real build (EAS, Xcode) and a real
// iPhone before anyone relies on it. Things most likely to need fixing on first run are
// marked "CHECK ON DEVICE".
//
// Approach: AVMutableVideoComposition with a Core Image handler. Each frame gets the
// stamp image composited over it; the stamp's clock is re-drawn once per second so it
// counts up like a camcorder. Audio is passed through by the export session.

import AVFoundation
import CoreImage
import ExpoModulesCore
import UIKit

internal struct StampSpec: Record {
  @Field var code: String = ""
  @Field var startEpochMs: Double = 0
  @Field var place: String? = nil
}

internal final class NoVideoTrackException: Exception {
  override var reason: String { "The file has no video track" }
}

internal final class ExportFailedException: GenericException<String> {
  override var reason: String { "Export failed: \(param)" }
}

public class StampVideoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StampVideo")

    AsyncFunction("burnStamp") { (inputUri: URL, spec: StampSpec) async throws -> String in
      try await StampVideoRenderer.burn(input: inputUri, spec: spec)
    }
  }
}

internal enum StampVideoRenderer {
  /// On-screen stamp was designed for a ~390 pt wide phone; scale to the video's width.
  static let designWidth: CGFloat = 390

  static func burn(input: URL, spec: StampSpec) async throws -> String {
    let asset = AVURLAsset(url: input)
    guard let track = try await asset.loadTracks(withMediaType: .video).first else {
      throw NoVideoTrackException()
    }
    let (naturalSize, transform) = try await track.load(.naturalSize, .preferredTransform)
    // Portrait recordings are stored landscape with a rotation transform.
    let oriented = CGRect(origin: .zero, size: naturalSize).applying(transform).size
    let width = abs(oriented.width)
    let scale = width / designWidth
    let start = Date(timeIntervalSince1970: spec.startEpochMs / 1000)

    let cache = StampCache()

    // CHECK ON DEVICE: this API is documented to hand the handler frames that already have
    // the track's preferredTransform applied, so the stamp should land bottom-left of the
    // upright picture. Verify with a portrait clip.
    let composition = try await AVMutableVideoComposition.videoComposition(
      with: asset,
      applyingCIFiltersWithHandler: { request in
        let second = max(0, Int(CMTimeGetSeconds(request.compositionTime)))
        let stamp = cache.image(for: second) {
          StampImage.make(spec: spec, at: start.addingTimeInterval(TimeInterval(second)), scale: scale)
        }

        let margin = 16 * scale
        // Core Image's origin is bottom-left, so this is the bottom-left corner.
        let placed = stamp.transformed(by: CGAffineTransform(translationX: margin, y: margin))
        request.finish(with: placed.composited(over: request.sourceImage), context: nil)
      }
    )

    let out = FileManager.default.temporaryDirectory
      .appendingPathComponent("stamped-\(Int(Date().timeIntervalSince1970 * 1000)).mp4")
    guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
      throw ExportFailedException("could not create export session")
    }
    session.videoComposition = composition
    session.outputURL = out
    session.outputFileType = .mp4
    session.shouldOptimizeForNetworkUse = true

    // CHECK ON DEVICE: `export()` is the async form of exportAsynchronously; Apple deprecates
    // it in iOS 18 in favour of `export(to:as:)`, which would need an iOS 18 availability branch.
    await session.export()
    guard session.status == .completed else {
      throw ExportFailedException(session.error?.localizedDescription ?? "status \(session.status.rawValue)")
    }
    return out.absoluteString
  }
}

/// One stamp image per second of video. The frame handler runs on AVFoundation's threads,
/// so access is locked; a class (not a captured var) keeps the @Sendable closure legal.
internal final class StampCache: @unchecked Sendable {
  private var images: [Int: CIImage] = [:]
  private let lock = NSLock()

  func image(for second: Int, make: () -> CIImage) -> CIImage {
    lock.lock()
    defer { lock.unlock() }
    if let hit = images[second] { return hit }
    let img = make()
    images[second] = img
    return img
  }
}

/// Draws the same camcorder stamp as components/StampOverlay.tsx: dark plate, blue dot,
/// "SPLASHY CAM", big code, fixed-width time, city in caps.
internal enum StampImage {
  static let formatter: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = .current
    f.dateFormat = "yyyy-MM-dd  HH:mm:ss" // must match lib/code.ts stampTime()
    return f
  }()

  static func make(spec: StampSpec, at date: Date, scale: CGFloat) -> CIImage {
    func mono(_ size: CGFloat, _ weight: UIFont.Weight) -> UIFont {
      UIFont.monospacedSystemFont(ofSize: size * scale, weight: weight)
    }
    let white = UIColor.white
    let tint = UIColor(red: 0xDC / 255, green: 0xE6 / 255, blue: 0xFF / 255, alpha: 1)
    let blue = UIColor(red: 0x2E / 255, green: 0x7B / 255, blue: 0xFF / 255, alpha: 1)

    var lines: [(String, UIFont, UIColor, CGFloat)] = [
      ("SPLASHY CAM", mono(10, .bold), tint, 2),
      (spec.code, mono(22, .bold), white, 3),
      (formatter.string(from: date), mono(13, .regular), white, 1),
    ]
    if let place = spec.place, !place.isEmpty {
      lines.append((place.uppercased(), mono(12, .regular), tint, 1.5))
    }

    let padX = 10 * scale, padY = 8 * scale, gap = 2 * scale, dot = 7 * scale, dotGap = 6 * scale
    let attributed = lines.map { text, font, color, kern in
      NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: color, .kern: kern * scale])
    }
    let sizes = attributed.map { $0.size() }
    let contentW = sizes.enumerated().map { i, s in i == 0 ? s.width + dot + dotGap : s.width }.max() ?? 0
    let contentH = sizes.reduce(0) { $0 + $1.height } + gap * CGFloat(max(0, sizes.count - 1))
    let size = CGSize(width: ceil(contentW + padX * 2), height: ceil(contentH + padY * 2))

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1 // 1 image pixel = 1 video pixel
    format.opaque = false
    let image = UIGraphicsImageRenderer(size: size, format: format).image { _ in
      UIColor(white: 0, alpha: 0.68).setFill()
      UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 6 * scale).fill()
      var y = padY
      for (i, line) in attributed.enumerated() {
        var x = padX
        if i == 0 {
          blue.setFill()
          UIBezierPath(ovalIn: CGRect(x: x, y: y + (sizes[i].height - dot) / 2, width: dot, height: dot)).fill()
          x += dot + dotGap
        }
        line.draw(at: CGPoint(x: x, y: y))
        y += sizes[i].height + gap
      }
    }
    return CIImage(image: image) ?? CIImage.empty()
  }
}

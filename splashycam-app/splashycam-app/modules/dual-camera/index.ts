/**
 * dual-camera: record the front camera on the top half and the back camera on the bottom
 * half, stacked into ONE video.
 *
 * STATUS: native code written for iOS (AVCaptureMultiCamSession) and Android (CameraX
 * concurrent-camera composition), but NEVER COMPILED OR RUN. It only exists in an EAS
 * build; in Expo Go `isAvailable` is false and the recorder shows a layout preview instead.
 * See README.md.
 */
import type { ComponentType, Ref } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { requireOptionalNativeModule, requireNativeView } from "expo";

type NativeDualCamera = {
  /** Whether this phone can run two cameras at once (hardware + OS). */
  isSupported(): boolean;
};

/** Methods on the native view, called through a ref (same pattern as expo-camera). */
export type DualCameraHandle = {
  startRecording(): Promise<void>;
  /** Resolves with a file:// URI of the combined video in the app cache. */
  stopRecording(): Promise<string>;
};

export type DualCameraViewProps = {
  ref?: Ref<DualCameraHandle>;
  style?: StyleProp<ViewStyle>;
  onCameraReady?: () => void;
  onMountError?: (e: { nativeEvent: { message: string } }) => void;
};

const native = requireOptionalNativeModule<NativeDualCamera>("DualCamera");

/** True only in a build that contains this native module (never in Expo Go). */
export const isAvailable = native != null;

/** False when the module is missing, so callers never need to guard twice. */
export function isSupported(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

/** The native view, or null when the module isn't in this build. Only render it if non-null. */
export const DualCameraView: ComponentType<DualCameraViewProps> | null = isAvailable
  ? requireNativeView<DualCameraViewProps>("DualCamera")
  : null;

/**
 * Split-screen layout shared by the Expo Go preview and the native views: front camera on
 * the top half, back camera on the bottom half. (Other layouts, like a small front inset or
 * back-only, could become a personal setting later.)
 */
export const LAYOUT = { frontFraction: 0.5 } as const;

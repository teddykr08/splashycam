/**
 * dual-camera: record the back camera full-frame with the front camera inset top-right,
 * as ONE video (the BeReal / TikTok dual layout).
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

/** Inset geometry shared by the Expo Go layout preview and the native views. */
export const INSET = { widthFraction: 0.3, aspect: 16 / 9, marginFraction: 0.035 } as const;

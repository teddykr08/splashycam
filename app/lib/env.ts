import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * True inside Expo Go. (StoreClient also covers `expo-dev-client` builds; this project
 * doesn't use expo-dev-client, so here it means Expo Go.)
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Name of the app whose iOS Settings page holds the permissions right now. */
export const settingsAppName = isExpoGo ? "Expo Go" : "Splashy Cam";

import type { Adb } from "@yume-chan/adb";
import type { ScrcpyClientConnection } from "../connection";
import type { AndroidKeyEventAction } from "../message";

export const DEFAULT_SERVER_PATH = '/data/local/tmp/scrcpy-server.jar';

export enum ScrcpyLogLevel {
    Verbose = 'verbose',
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
}

export enum ScrcpyScreenOrientation {
    Initial = -2,
    Unlocked = -1,
    Portrait = 0,
    Landscape = 1,
    PortraitFlipped = 2,
    LandscapeFlipped = 3,
}

export interface ScrcpyOptions {
    formatServerArguments(): string[];

    formatGetEncoderListArguments(): string[];

    getOutputEncoderNameRegex(): RegExp;

    createConnection(device: Adb): ScrcpyClientConnection;

    createBackOrScreenOnEvent(action: AndroidKeyEventAction, device: Adb): ArrayBuffer | undefined;
}

export interface ToScrcpyOption {
    toScrcpyOption(): string;
}

export function isToScrcpyOption(value: any): value is ToScrcpyOption {
    return typeof value === 'object' &&
        value !== null &&
        typeof value.toScrcpyOption === 'function';
}

export function toScrcpyOption(value: any, empty: string): string {
    if (value === undefined) {
        return empty;
    }

    if (isToScrcpyOption(value)) {
        return value.toScrcpyOption();
    }

    return `${value}`;
}

import { AdbCommandBase } from "./base";

export class AdbPower extends AdbCommandBase {
    public reboot(name: string = '') {
        return this.adb.createSocketAndReadAll(`reboot:${name}`);
    }

    public bootloader() {
        return this.reboot('bootloader');
    }

    public fastboot() {
        return this.reboot('fastboot');
    }

    public recovery() {
        return this.reboot('recovery');
    }

    public sideload() {
        return this.reboot('sideload');
    }

    /**
     * Reboot to Qualcomm Emergency Download (EDL) Mode.
     *
     * Only works on some Qualcomm devices.
     */
    public qualcommEdlMode() {
        return this.reboot('edl');
    }

    public powerOff() {
        return this.adb.childProcess.exec('reboot', '-p');
    }

    public powerButton(longPress: boolean = false) {
        return this.adb.childProcess.exec('input', 'keyevent', longPress ? '--longpress POWER' : 'POWER');
    }

    /**
     * Reboot to Samsung Odin download mode.
     *
     * Only works on Samsung devices.
     */
    public samsungOdin() {
        return this.reboot('download');
    }
}

import { AutoDisposable } from '@yume-chan/event';
import Struct from '@yume-chan/struct';
import type { AdbPacket } from '../packet';
import type { AdbIncomingSocketEventArgs, AdbPacketDispatcher, AdbSocket } from '../socket';
import { AdbBufferedStream } from '../stream';
import { decodeUtf8 } from "../utils";

export interface AdbReverseHandler {
    onSocket(packet: AdbPacket, socket: AdbSocket): void;
}

export interface AdbForwardListener {
    deviceSerial: string;

    localName: string;

    remoteName: string;
}

const AdbReverseStringResponse =
    new Struct({ littleEndian: true })
        .string('length', { length: 4 })
        .string('content', { lengthField: 'length', lengthFieldBase: 16 });

const AdbReverseErrorResponse =
    new Struct({ littleEndian: true })
        .fields(AdbReverseStringResponse)
        .postDeserialize((value) => {
            throw new Error(value.content);
        });

export class AdbReverseCommand extends AutoDisposable {
    protected localPortToHandler = new Map<number, AdbReverseHandler>();

    protected deviceAddressToLocalPort = new Map<string, number>();

    protected dispatcher: AdbPacketDispatcher;

    protected listening = false;

    public constructor(dispatcher: AdbPacketDispatcher) {
        super();

        this.dispatcher = dispatcher;
        this.addDisposable(this.dispatcher.onIncomingSocket(this.handleIncomingSocket, this));
    }

    protected handleIncomingSocket(e: AdbIncomingSocketEventArgs): void {
        if (e.handled) {
            return;
        }

        const address = decodeUtf8(e.packet.payload!);
        // tcp:12345\0
        const port = Number.parseInt(address.substring(4));
        if (this.localPortToHandler.has(port)) {
            this.localPortToHandler.get(port)!.onSocket(e.packet, e.socket);
            e.handled = true;
        }
    }

    private async createBufferedStream(service: string) {
        const socket = await this.dispatcher.createSocket(service);
        return new AdbBufferedStream(socket);
    }

    private async sendRequest(service: string) {
        const stream = await this.createBufferedStream(service);
        const success = decodeUtf8(await stream.read(4)) === 'OKAY';
        if (!success) {
            await AdbReverseErrorResponse.deserialize(stream);
        }
        return stream;
    }

    public async list(): Promise<AdbForwardListener[]> {
        const stream = await this.createBufferedStream('reverse:list-forward');

        const response = await AdbReverseStringResponse.deserialize(stream);
        return response.content!.split('\n').map(line => {
            const [deviceSerial, localName, remoteName] = line.split(' ') as [string, string, string];
            return { deviceSerial, localName, remoteName };
        });

        // No need to close the stream, device will close it
    }

    /**
     * @param deviceAddress The address adbd on device is listening on. Can be `tcp:0` to let adbd choose an available TCP port by itself.
     * @param localPort Native ADB will open a connection to localPort when reverse connection starts. In webadb, it's only used to uniquely identify a reverse registry, `handler` will be called on connection.
     * @param handler A callback to handle incoming connections
     * @returns If `deviceAddress` is `tcp:0`, return `tcp:{ACTUAL_LISTENING_PORT}`; otherwise, return `deviceAddress`.
     */
    public async add(
        deviceAddress: string,
        localPort: number,
        handler: AdbReverseHandler,
    ): Promise<string> {
        const stream = await this.sendRequest(`reverse:forward:${deviceAddress};tcp:${localPort}`);

        // `tcp:0` tells the device to pick an available port.
        // However, device will response with the selected port for all `tcp:` requests.
        if (deviceAddress.startsWith('tcp:')) {
            const response = await AdbReverseStringResponse.deserialize(stream);
            deviceAddress = `tcp:${Number.parseInt(response.content!, 10)}`;
        }

        this.localPortToHandler.set(localPort, handler);
        this.deviceAddressToLocalPort.set(deviceAddress, localPort);
        return deviceAddress;

        // No need to close the stream, device will close it
    }

    public async remove(deviceAddress: string): Promise<void> {
        await this.sendRequest(`reverse:killforward:${deviceAddress}`);

        if (this.deviceAddressToLocalPort.has(deviceAddress)) {
            this.localPortToHandler.delete(this.deviceAddressToLocalPort.get(deviceAddress)!);
            this.deviceAddressToLocalPort.delete(deviceAddress);
        }

        // No need to close the stream, device will close it
    }

    public async removeAll(): Promise<void> {
        await this.sendRequest(`reverse:killforward-all`);

        this.deviceAddressToLocalPort.clear();
        this.localPortToHandler.clear();

        // No need to close the stream, device will close it
    }
}

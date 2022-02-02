import Struct, { StructAsyncDeserializeStream, StructLike, StructValueType } from '@yume-chan/struct';
import { AdbBufferedStream } from '../../stream';
import { decodeUtf8 } from "../../utils";

export enum AdbSyncResponseId {
    Entry = 'DENT',
    Lstat = 'STAT',
    Stat = 'STA2',
    Lstat2 = 'LST2',
    Done = 'DONE',
    Data = 'DATA',
    Ok = 'OKAY',
    Fail = 'FAIL',
}

// DONE responses' size are always same as the request's normal response.
// For example DONE responses for LIST requests are 16 bytes (same as DENT responses),
// but DONE responses for STAT requests are 12 bytes (same as STAT responses)
// So we need to know responses' size in advance.
export class AdbSyncDoneResponse implements StructLike<AdbSyncDoneResponse> {
    private length: number;

    public readonly id = AdbSyncResponseId.Done;

    public constructor(length: number) {
        this.length = length;
    }

    public async deserialize(stream: StructAsyncDeserializeStream): Promise<this> {
        await stream.read(this.length);
        return this;
    }
}

export const AdbSyncFailResponse =
    new Struct({ littleEndian: true })
        .uint32('messageLength')
        .string('message', { lengthField: 'messageLength' })
        .postDeserialize(object => {
            throw new Error(object.message);
        });

export async function adbSyncReadResponse<T extends Record<string, StructLike<any>>>(
    stream: AdbBufferedStream,
    types: T,
): Promise<StructValueType<T[keyof T]>> {
    const id = decodeUtf8(await stream.read(4));

    if (id === AdbSyncResponseId.Fail) {
        await AdbSyncFailResponse.deserialize(stream);
    }

    if (types[id]) {
        return types[id]!.deserialize(stream);
    }

    throw new Error('Unexpected response id');
}

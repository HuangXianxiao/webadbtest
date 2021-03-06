import { StructAsyncDeserializeStream, StructDeserializeStream, StructFieldDefinition, StructFieldValue, StructOptions, StructValue } from '../basic';
import { Syncbird } from "../syncbird";
import { decodeUtf8, encodeUtf8, ValueOrPromise } from "../utils";

/**
 * Base class for all types that
 * can be converted from an ArrayBuffer when deserialized,
 * and need to be converted to an ArrayBuffer when serializing
 *
 * @template TValue The actual TypeScript type of this type
 * @template TTypeScriptType Optional another type (should be compatible with `TType`)
 * specified by user when creating field definitions.
 */
export abstract class ArrayBufferLikeFieldType<TValue = unknown, TTypeScriptType = TValue> {
    public readonly TTypeScriptType!: TTypeScriptType;

    /**
     * When implemented in derived classes, converts the type-specific `value` to an `ArrayBuffer`
     *
     * This function should be "pure", i.e.,
     * same `value` should always be converted to `ArrayBuffer`s that have same content.
     */
    public abstract toArrayBuffer(value: TValue): ArrayBuffer;

    /** When implemented in derived classes, converts the `ArrayBuffer` to a type-specific value */
    public abstract fromArrayBuffer(arrayBuffer: ArrayBuffer): TValue;

    /**
     * When implemented in derived classes, gets the size in byte of the type-specific `value`.
     *
     * If the size can't be calculated without first converting the `value` back to an `ArrayBuffer`,
     * implementer should returns `-1` so the caller will get its size by first converting it to
     * an `ArrayBuffer` (and cache the result).
     */
    public abstract getSize(value: TValue): number;
}

/** An ArrayBufferLike type that's actually an `ArrayBuffer` */
export class ArrayBufferFieldType extends ArrayBufferLikeFieldType<ArrayBuffer> {
    public static readonly instance = new ArrayBufferFieldType();

    protected constructor() {
        super();
    }

    public toArrayBuffer(value: ArrayBuffer): ArrayBuffer {
        return value;
    }

    public fromArrayBuffer(arrayBuffer: ArrayBuffer): ArrayBuffer {
        return arrayBuffer;
    }

    public getSize(value: ArrayBuffer): number {
        return value.byteLength;
    }
}

/** Am ArrayBufferLike type that converts between `ArrayBuffer` and `Uint8ClampedArray` */
export class Uint8ClampedArrayFieldType
    extends ArrayBufferLikeFieldType<Uint8ClampedArray, Uint8ClampedArray> {
    public static readonly instance = new Uint8ClampedArrayFieldType();

    protected constructor() {
        super();
    }

    public toArrayBuffer(value: Uint8ClampedArray): ArrayBuffer {
        return value.buffer;
    }

    public fromArrayBuffer(arrayBuffer: ArrayBuffer): Uint8ClampedArray {
        return new Uint8ClampedArray(arrayBuffer);
    }

    public getSize(value: Uint8ClampedArray): number {
        return value.byteLength;
    }
}

/** An ArrayBufferLike type that converts between `ArrayBuffer` and `string` */
export class StringFieldType<TTypeScriptType = string>
    extends ArrayBufferLikeFieldType<string, TTypeScriptType> {
    public static readonly instance = new StringFieldType();

    public toArrayBuffer(value: string): ArrayBuffer {
        return encodeUtf8(value);
    }

    public fromArrayBuffer(arrayBuffer: ArrayBuffer): string {
        return decodeUtf8(arrayBuffer);
    }

    public getSize(): number {
        // Return `-1`, so `ArrayBufferLikeFieldDefinition` will
        // convert this `value` into an `ArrayBuffer` (and cache the result),
        // Then get the size from that `ArrayBuffer`
        return -1;
    }
}

const EmptyArrayBuffer = new ArrayBuffer(0);

export abstract class ArrayBufferLikeFieldDefinition<
    TType extends ArrayBufferLikeFieldType<any, any> = ArrayBufferLikeFieldType<unknown, unknown>,
    TOptions = void,
    TOmitInitKey extends PropertyKey = never,
    > extends StructFieldDefinition<
    TOptions,
    TType['TTypeScriptType'],
    TOmitInitKey
    >{
    public readonly type: TType;

    public constructor(type: TType, options: TOptions) {
        super(options);
        this.type = type;
    }

    protected getDeserializeSize(struct: StructValue): number {
        return this.getSize();
    }

    /**
     * When implemented in derived classes, creates a `StructFieldValue` for the current field definition.
     */
    public create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TType['TTypeScriptType'],
        arrayBuffer?: ArrayBuffer,
    ): ArrayBufferLikeFieldValue<this> {
        return new ArrayBufferLikeFieldValue(this, options, struct, value, arrayBuffer);
    }

    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream,
        struct: StructValue,
    ): ArrayBufferLikeFieldValue<this>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructAsyncDeserializeStream,
        struct: StructValue,
    ): Promise<ArrayBufferLikeFieldValue<this>>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream | StructAsyncDeserializeStream,
        struct: StructValue,
    ): ValueOrPromise<ArrayBufferLikeFieldValue<this>> {
        return Syncbird.try(() => {
            const size = this.getDeserializeSize(struct);
            if (size === 0) {
                return EmptyArrayBuffer;
            } else {
                return stream.read(size);
            }
        }).then(arrayBuffer => {
            const value = this.type.fromArrayBuffer(arrayBuffer);
            return this.create(options, struct, value, arrayBuffer);
        }).valueOrPromise();
    }
}

export class ArrayBufferLikeFieldValue<
    TDefinition extends ArrayBufferLikeFieldDefinition<ArrayBufferLikeFieldType<unknown, unknown>, any, any>,
    > extends StructFieldValue<TDefinition> {
    protected arrayBuffer: ArrayBuffer | undefined;

    public constructor(
        definition: TDefinition,
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TDefinition['TValue'],
        arrayBuffer?: ArrayBuffer,
    ) {
        super(definition, options, struct, value);
        this.arrayBuffer = arrayBuffer;
    }

    public override set(value: TDefinition['TValue']): void {
        super.set(value);
        this.arrayBuffer = undefined;
    }

    public serialize(dataView: DataView, offset: number): void {
        if (!this.arrayBuffer) {
            this.arrayBuffer = this.definition.type.toArrayBuffer(this.value);
        }

        new Uint8Array(dataView.buffer)
            .set(new Uint8Array(this.arrayBuffer), offset);
    }
}

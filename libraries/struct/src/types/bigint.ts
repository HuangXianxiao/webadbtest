import { getBigInt64, getBigUint64, setBigInt64, setBigUint64 } from '@yume-chan/dataview-bigint-polyfill/esm/fallback';
import { StructAsyncDeserializeStream, StructDeserializeStream, StructFieldDefinition, StructFieldValue, StructOptions, StructValue } from "../basic";
import { Syncbird } from "../syncbird";
import { ValueOrPromise } from "../utils";

type DataViewBigInt64Getter = (dataView: DataView, byteOffset: number, littleEndian: boolean | undefined) => bigint;

type DataViewBigInt64Setter = (dataView: DataView, byteOffset: number, value: bigint, littleEndian: boolean | undefined) => void;

export class BigIntFieldType {
    public readonly TTypeScriptType!: bigint;

    public readonly size: number;

    public readonly getter: DataViewBigInt64Getter;

    public readonly setter: DataViewBigInt64Setter;

    public constructor(
        size: number,
        getter: DataViewBigInt64Getter,
        setter: DataViewBigInt64Setter,
    ) {
        this.size = size;
        this.getter = getter;
        this.setter = setter;
    }

    public static readonly Int64 = new BigIntFieldType(8, getBigInt64, setBigInt64);

    public static readonly Uint64 = new BigIntFieldType(8, getBigUint64, setBigUint64);
}

export class BigIntFieldDefinition<
    TType extends BigIntFieldType = BigIntFieldType,
    TTypeScriptType = TType["TTypeScriptType"],
    > extends StructFieldDefinition<
    void,
    TTypeScriptType
    > {
    public readonly type: TType;

    public constructor(type: TType, _typescriptType?: TTypeScriptType) {
        super();
        this.type = type;
    }

    public getSize(): number {
        return this.type.size;
    }

    public create(
        options: Readonly<StructOptions>,
        struct: StructValue,
        value: TTypeScriptType,
    ): BigIntFieldValue<this> {
        return new BigIntFieldValue(this, options, struct, value);
    }

    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream,
        struct: StructValue,
    ): BigIntFieldValue<this>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructAsyncDeserializeStream,
        struct: StructValue,
    ): Promise<BigIntFieldValue<this>>;
    public override deserialize(
        options: Readonly<StructOptions>,
        stream: StructDeserializeStream | StructAsyncDeserializeStream,
        struct: StructValue,
    ): ValueOrPromise<BigIntFieldValue<this>> {
        return Syncbird.try(() => {
            return stream.read(this.getSize());
        }).then(buffer => {
            const view = new DataView(buffer);
            const value = this.type.getter(
                view,
                0,
                options.littleEndian
            );
            return this.create(options, struct, value as any);
        }).valueOrPromise();
    }
}

export class BigIntFieldValue<
    TDefinition extends BigIntFieldDefinition<BigIntFieldType, any>,
    > extends StructFieldValue<TDefinition> {
    public serialize(dataView: DataView, offset: number): void {
        this.definition.type.setter(
            dataView,
            offset,
            this.value!,
            this.options.littleEndian
        );
    }
}

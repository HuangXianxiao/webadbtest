import type { ValueOrPromise } from '../utils';
import type { StructAsyncDeserializeStream, StructDeserializeStream, StructOptions } from './context';
import { StructFieldDefinition } from './definition';
import { StructFieldValue } from './field-value';
import type { StructValue } from './struct-value';

describe('StructFieldValue', () => {
    describe('.constructor', () => {
        it('should save parameters', () => {
            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number): void {
                    throw new Error('Method not implemented.');
                }
            }

            const definition = {} as any;
            const options = {} as any;
            const struct = {} as any;
            const value = {} as any;

            const fieldValue = new MockStructFieldValue(definition, options, struct, value);
            expect(fieldValue).toHaveProperty('definition', definition);
            expect(fieldValue).toHaveProperty('options', options);
            expect(fieldValue).toHaveProperty('struct', struct);
            expect(fieldValue.get()).toBe(value);
        });
    });

    describe('#getSize', () => {
        it('should return same value as definition\'s', () => {
            class MockFieldDefinition extends StructFieldDefinition {
                public getSize(): number {
                    return 42;
                }
                public create(options: Readonly<StructOptions>, struct: StructValue, value: unknown): StructFieldValue<this> {
                    throw new Error('Method not implemented.');
                }

                public override deserialize(
                    options: Readonly<StructOptions>,
                    stream: StructDeserializeStream,
                    struct: StructValue,
                ): StructFieldValue<this>;
                public override deserialize(
                    options: Readonly<StructOptions>,
                    stream: StructAsyncDeserializeStream,
                    struct: StructValue,
                ): Promise<StructFieldValue<this>>;
                public override deserialize(
                    options: Readonly<StructOptions>,
                    stream: StructDeserializeStream | StructAsyncDeserializeStream,
                    struct: StructValue,
                ): ValueOrPromise<StructFieldValue<this>> {
                    throw new Error('Method not implemented.');
                }
            }

            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number): void {
                    throw new Error('Method not implemented.');
                }
            }

            const fieldDefinition = new MockFieldDefinition();
            const fieldValue = new MockStructFieldValue(fieldDefinition, undefined as any, undefined as any, undefined as any);
            expect(fieldValue.getSize()).toBe(42);
        });
    });

    describe('#set', () => {
        it('should update its internal value', () => {
            class MockStructFieldValue extends StructFieldValue {
                public serialize(dataView: DataView, offset: number): void {
                    throw new Error('Method not implemented.');
                }
            }

            const fieldValue = new MockStructFieldValue(undefined as any, undefined as any, undefined as any, undefined as any);
            fieldValue.set(1);
            expect(fieldValue.get()).toBe(1);

            fieldValue.set(2);
            expect(fieldValue.get()).toBe(2);
        });
    });
});

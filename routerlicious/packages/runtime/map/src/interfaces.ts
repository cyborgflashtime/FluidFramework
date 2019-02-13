import { ISharedObject } from "@prague/api-definitions";
import { ISequencedObjectMessage } from "@prague/runtime-definitions";

export type SerializeFilter = (key: string, serializedValue: any, type: string) => any;

export interface ISet<T> {
    add(value: T): ISet<T>;

    delete(value: T): ISet<T>;

    entries(): T[];
}

/**
 * Type of "valueChanged" event parameter
 */
export interface IValueChanged {
    key: string;
}

/**
 * Type of "KeyValueChanged" event parameter
 */
export interface IKeyValueChanged {
    key: string;

    value: any;
}

export interface IValueOpEmitter {
    emit(name: string, params: any);
}

/**
 * A value factory is used to serialize/deserialize values to a map
 */
export interface IValueFactory<T> {
    load(emitter: IValueOpEmitter, raw: any): T;

    store(value: T): any;
}

export interface IValueOperation<T> {
    /**
     * Allows the handler to prepare for the operation
     */
    prepare(value: T, params: any, local: boolean, message: ISequencedObjectMessage): Promise<any>;

    /**
     * Performs the actual processing on the operation
     */
    process(value: T, params: any, context: any, local: boolean, message: ISequencedObjectMessage);
}

/**
 * Used to register a new value type on a map
 */
export interface IValueType<T> {
    /**
     * Name of the value type
     */
    name: string;

    /**
     * Factory method used to convert to/from a JSON form of the type
     */
    factory: IValueFactory<T>;

    /**
     * Do we need initialization code here???
     */

    /**
     * Operations that can be applied to the value
     */
    ops: Map<string, IValueOperation<T>>;
}

/**
 * Shared map interface
 */
export interface ISharedMap extends ISharedObject, Map<string, any> {
    /**
     * Retrieves the given key from the map
     */
    get<T = any>(key: string): T;

    /**
     * A form of get except it will only resolve the promise once the key exists in the map.
     */
    wait<T>(key: string): Promise<T>;

    /**
     * Sets the key to the provided value. An optional type can be specified to initialize the key
     * to one of the registered value types.
     */
    set<T = any>(key: string, value: T | any, type?: string): T;

    /**
     * Registers a new operation on the map
     */
    registerValueType<T>(type: IValueType<T>);

    /**
     * Registers a custom filter to provide extra processing on the condensed log.
     * This is a very advanced feature and should be used with extreme caution.
     */
    registerSerializeFilter(filter: SerializeFilter);

    on(event: "pre-op" | "op", listener: (op: ISequencedObjectMessage, local: boolean) => void): this;
    on(
        event: "valueChanged",
        listener: (changed: IValueChanged, local: boolean, op: ISequencedObjectMessage) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}

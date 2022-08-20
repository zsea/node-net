import { Server as netServer, Socket as netSocket, connect as netConnect, NetConnectOpts, createServer as netCreateServer, ServerOpts, SocketConstructorOpts, SocketConnectOpts } from "net";
import SocketError from "./error";
function getBuffer(__buffer__: Buffer | null | undefined, length: number) {
    if (__buffer__ && __buffer__.length >= length) {
        let nBuffer = __buffer__.subarray(0, length);
        //__buffer__ = __buffer__.subarray(length);
        return nBuffer;
    }
}
function getString(__buffer__: Buffer | null | undefined, length: number = Number.MAX_VALUE, end_falg: 0 | 10 = 0) {
    if (__buffer__ && __buffer__.length) {
        let endLength = 0;
        for (let i = 0; i < __buffer__.length; i++) {
            if (__buffer__[i] === end_falg || i === length - 1) {
                endLength = i + 1;
                break;
            }
        }
        if (endLength) {
            return __buffer__.subarray(0, endLength);
        }
    }
}
type BUFFER_CALLBACK = (err: Error | null, buffer?: Buffer) => void;
class BufferReader {
    length: number
    isString: boolean = false
    string_end_falg: 0 | 10 = 0
    callback: (err: Error | null, buffer?: Buffer) => void
    constructor(length: number, callback: BUFFER_CALLBACK) {
        this.length = length;
        this.callback = callback;
    }
}

class Server extends netServer {
    constructor(options?: ServerOpts, connectionListener?: ((socket: Socket) => void)) {
        super(options);

        if (connectionListener) {
            this.addListener("connection", (socket: netSocket) => {
                connectionListener(new Socket(socket));
            })
        }
    }
}
class Socket extends netSocket {
    private __buffer__: Buffer | null | undefined
    private __readerList__: BufferReader[] = [];
    constructor(options?: any | undefined) {
        let ops: any;
        if (options && options._handle) {//传入的是一个socket
            ops = { handle: options._handle, ...options } as SocketConstructorOpts;
        }
        else { //其它参数
            ops = options;
        }
        super(ops);
        this.addListener("data", (data: Buffer): void => {
            if (this.__buffer__) {

                this.__buffer__ = Buffer.concat([this.__buffer__, data]);
            }
            else {
                this.__buffer__ = data;
            }
            this.onData();
        });
        this.addListener("close", (hadError) => {
            if (this.__readerList__ && this.__readerList__.length) {
                let err = new SocketError("socket is closed");
                err.code = "SOCKET_CLOSED";
                for (let i = 0; i < this.__readerList__.length; i++) {
                    let item = this.__readerList__[i];
                    item.callback(err);
                }
            }
            this.__readerList__ = [];
        })
    }
    private onData(): void {
        while (this.__readerList__ && this.__readerList__.length) {
            let item = this.__readerList__[0];
            let nBuffer: Buffer | undefined;
            if (item.isString) {
                nBuffer = getString(this.__buffer__, item.length, item.string_end_falg);
            }
            else {
                nBuffer = getBuffer(this.__buffer__, item.length);
            }
            //console.log("读取到",nBuffer)
            if (nBuffer) {

                this.__buffer__ = this.__buffer__?.subarray(item.length);
                this.__readerList__.shift();
                item.callback(null, nBuffer);
                continue;
            }
            break;
        }
    }
    private readBuffer(length: number, callback: BUFFER_CALLBACK, isString: boolean = false, end_falg: 0 | 10 = 0): void {
        let nBuffer: Buffer | undefined;
        if (isString) {
            nBuffer = getString(this.__buffer__, length, end_falg);
        }
        else {
            nBuffer = getBuffer(this.__buffer__, length);
        }
        if (nBuffer) {
            callback(null, nBuffer);
        }
        else {
            this.__readerList__.push({
                length: length,
                isString: isString,
                string_end_falg: end_falg,
                callback: callback
            });
        }
    }
    private readData<T>(length: number, converter: (buffer: Buffer) => T, isString: boolean = false, end_falg: 0 | 10 = 0): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.readBuffer(length, function (err: Error | null, buffer?: Buffer) {
                if (err) {
                    reject(err);
                }
                else if (buffer) {
                    resolve(converter(buffer));
                }
                else {
                    let _err_ = new Error(`buffer cant be null or undefined`);
                    reject(_err_);
                }

            }, isString, end_falg);
        });
    }

    readString(encoding: BufferEncoding | number = "utf8", length: number = Number.MAX_VALUE, end_falg: 0 | 10 = 0): Promise<string> {
        let enc: BufferEncoding, len: number;
        if (typeof encoding === "string") {
            enc = encoding;
            len = length;
        }
        else if (typeof encoding === "number") {
            enc = "utf-8";
            len = encoding;
        }
        else {
            enc = "utf8"
            len = length;
        }
        return this.readData<string>(len, buffer => buffer.toString(enc), true, end_falg);
    }
    readLine(encoding: BufferEncoding | number = "utf8", length: number = Number.MAX_VALUE): Promise<string> {
        return this.readString(encoding, length, 10);
    }
    readDoubleBE(): Promise<number> {
        return this.readData<number>(8, buffer => buffer.readDoubleBE());
    }
    readDoubleLE(): Promise<number> {
        return this.readData<number>(8, buffer => buffer.readDoubleLE());
    }
    readFloatBE(): Promise<number> {
        return this.readData<number>(4, buffer => buffer.readFloatBE());
    }
    readFloatLE(): Promise<number> {
        return this.readData<number>(4, buffer => buffer.readFloatLE());
    }
    readInt8(): Promise<number> {
        return this.readData<number>(1, buffer => buffer.readInt8());
    }
    readInt16BE(): Promise<number> {
        return this.readData<number>(2, buffer => buffer.readInt16BE());
    }
    readInt16LE(): Promise<number> {
        return this.readData<number>(2, buffer => buffer.readInt16LE());
    }
    readInt32BE(): Promise<number> {
        return this.readData<number>(4, buffer => buffer.readInt32BE());
    }
    readInt32LE(): Promise<number> {
        return this.readData<number>(4, buffer => buffer.readInt32LE());
    }
    readIntBE(byteLength: number): Promise<number> {
        return this.readData<number>(byteLength, buffer => buffer.readIntBE(0, byteLength));
    }
    readIntLE(byteLength: number): Promise<number> {
        return this.readData<number>(byteLength, buffer => buffer.readIntLE(0, byteLength));
    }
    readUInt8(): Promise<number> {
        return this.readData<number>(1, buffer => buffer.readUInt8());
    }
    readUInt16BE(): Promise<number> {
        return this.readData<number>(2, buffer => buffer.readUInt16BE());
    }
    readUInt16LE(): Promise<number> {
        return this.readData<number>(2, buffer => buffer.readUInt16LE());
    }
    readUInt32BE(): Promise<number> {
        return this.readData<number>(4, buffer => buffer.readUInt32BE());
    }
    readUInt32LE(): Promise<number> {
        return this.readData<number>(4, buffer => buffer.readUInt32LE());
    }
    readUIntBE(byteLength: number): Promise<number> {
        return this.readData<number>(byteLength, buffer => buffer.readUIntBE(0, byteLength));
    }
    readUIntLE(byteLength: number): Promise<number> {
        return this.readData<number>(byteLength, buffer => buffer.readUIntLE(0, byteLength));

    }
    readBigInt64BE(): Promise<bigint> {
        return this.readData<bigint>(8, buffer => buffer.readBigInt64BE());
    }
    readBigInt64LE(): Promise<bigint> {
        return this.readData<bigint>(8, buffer => buffer.readBigInt64LE());
    }
    readBigUInt64BE(): Promise<bigint> {
        return this.readData<bigint>(8, buffer => buffer.readBigUInt64BE());
    }
    readBigUInt64LE(): Promise<bigint> {
        return this.readData<bigint>(8, buffer => buffer.readBigUInt64LE());
    }
    readBigUint64BE(): Promise<bigint> {
        return this.readData<bigint>(8, buffer => buffer.readBigUint64BE());
    }
    readBigUint64LE(): Promise<bigint> {
        return this.readData<bigint>(8, buffer => buffer.readBigUint64LE());
    }
    //
    writeDoubleBE(value: number): void {
        let buffer = Buffer.alloc(8);
        buffer.writeDoubleBE(value);
        this.write(buffer);
    }
    writeDoubleLE(value: number): void {
        let buffer = Buffer.alloc(8);
        buffer.writeDoubleLE(value);
        this.write(buffer);
    }
    writeFloatBE(value: number): void {
        let buffer = Buffer.alloc(4);
        buffer.writeFloatBE(value);
        this.write(buffer);
    }
    writeFloatLE(value: number): void {
        let buffer = Buffer.alloc(4);
        buffer.writeFloatLE(value);
        this.write(buffer);
    }
    writeInt8(value: number): void {
        let buffer = Buffer.alloc(1);
        buffer.writeInt8(value);
        this.write(buffer);
    }
    writeInt16BE(value: number): void {
        let buffer = Buffer.alloc(2);
        buffer.writeInt16BE(value);
        this.write(buffer);
    }
    writeInt16LE(value: number): void {
        let buffer = Buffer.alloc(2);
        buffer.writeInt16LE(value);
        this.write(buffer);
    }
    writeInt32BE(value: number): void {
        let buffer = Buffer.alloc(4);
        buffer.writeInt32BE(value);
        this.write(buffer);
    }
    writeInt32LE(value: number): void {
        let buffer = Buffer.alloc(4);
        buffer.writeInt32LE(value);
        this.write(buffer);
    }
    writeIntBE(value: number, byteLength: number): void {
        let buffer = Buffer.alloc(byteLength);
        buffer.writeIntBE(value, 0, byteLength);
        this.write(buffer);
    }
    writeIntLE(value: number, byteLength: number): void {
        let buffer = Buffer.alloc(byteLength);
        buffer.writeIntLE(value, 0, byteLength);
        this.write(buffer);
    }
    writeUInt8(value: number): void {
        let buffer = Buffer.alloc(1);
        buffer.writeUInt8(value);
        this.write(buffer);
    }
    writeUInt16BE(value: number): void {
        let buffer = Buffer.alloc(2);
        buffer.writeUInt16BE(value);
        this.write(buffer);
    }
    writeUInt16LE(value: number): void {
        let buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(value);
        this.write(buffer);
    }
    writeUInt32BE(value: number): void {
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(value);
        this.write(buffer);
    }
    writeUInt32LE(value: number): void {
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(value);
        this.write(buffer);
    }
    writeUIntBE(value: number, byteLength: number): void {
        let buffer = Buffer.alloc(byteLength);
        buffer.writeUIntBE(value, 0, byteLength);
        this.write(buffer);
    }
    writeUIntLE(value: number, byteLength: number): void {
        let buffer = Buffer.alloc(byteLength);
        buffer.writeUIntLE(value, 0, byteLength);
        this.write(buffer);
    }
    writeBigInt64BE(value: bigint): void {
        let buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(value);
        this.write(buffer);
    }
    writeBigInt64LE(value: bigint): void {
        let buffer = Buffer.alloc(8);
        buffer.writeBigInt64LE(value);
        this.write(buffer);
    }
    writeBigUInt64BE(value: bigint): void {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUInt64BE(value);
        this.write(buffer);
    }
    writeBigUInt64LE(value: bigint): void {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(value);
        this.write(buffer);
    }
    writeBigUint64BE(value: bigint): void {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUint64BE(value);
        this.write(buffer);
    }
    writeBigUint64LE(value: bigint): void {
        let buffer = Buffer.alloc(8);
        buffer.writeBigUint64LE(value);
        this.write(buffer);
    }

}
function connect(options: NetConnectOpts, connectListener?: () => void): Socket;
function connect(path: string, connectListener?: () => void): Socket;
function connect(port: number, host?: string, connectListener?: () => void): Socket;
function connect(port: number | string | NetConnectOpts, host?: string | (() => void), connectListener?: () => void): Socket {
    let socket: Socket;
    if (typeof port === "number") {
        let h: string = "127.0.0.1", listener: (() => void) | undefined;
        if (typeof host === "string") {
            h = host;
            listener = connectListener;
        }
        else if (typeof host === "function") {
            listener = host;
        }
        socket=new Socket();
        socket.connect(port,h,listener);
    }
    else if (typeof port === "string") {
        let path: string = port, listener: (() => void) | undefined=host as (() => void);
        socket=new Socket();
        socket.connect(path,listener);
    }
    else {
        let o=port,listener: (() => void) | undefined=host as (() => void);
        socket=new Socket();
        socket.connect(o,listener);
    }
    return socket;
}

function createServer(connectionListener?: (socket: Socket) => void): Server;
function createServer(options?: ServerOpts | ((socket: Socket) => void), connectionListener?: (socket: Socket) => void): Server {
    if (typeof options === "function") {
        return new Server(undefined, options);
        //return netCreateServer(undefined,options as ((socket: Socket) => void));
    }
    else {
        return new Server(options, connectionListener);
    }
}

export {
    Server,
    Socket,
    connect,
    connect as createConnection,
    createServer
}
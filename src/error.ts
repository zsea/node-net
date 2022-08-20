class SocketError extends Error{
    code:string|undefined;
    constructor(message?:string){
        super(message);
    }
}

export default SocketError;

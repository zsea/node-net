import { Server, Socket, connect, createConnection, createServer } from '../net';

// let server = createServer(async function (socket) {
//   console.log(`${socket.remoteAddress}:${socket.remotePort}`);
//   console.log(socket);
//   let while_s = true
//   socket.addListener("close", () => {
//     console.log("客户端退出");
//     while_s = false;
//   });
//   while (while_s) {
//     try {
//       let u = await socket.readString()
//       console.log("读取到", u);
//     }
//     catch (e) {
//       console.error(e);
//     }
//   }
//   console.log("SOCKET退出");
// });
// server.listen(9988, function(){
//   console.log("监听已启动",arguments);
// })
(async function () {
  let socket = createConnection(9988, "127.0.0.1");
  while (true) {
    let u = await socket.readString();
    console.log("读取到", u);
    socket.writeUInt8(0x1F);
    
  }
  console.log("执行完成")
})();
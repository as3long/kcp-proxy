const kcp = require('@huamu/node-kcp');
const net = require('net');
const dgram = require('dgram');
const port = 31234;
// const address = '127.0.0.1';
const address = '149.248.53.4';
const localPort = 32002;
const KCPClientStream = require('./kcpClientStream');
// const through2 = require('through2');
// const cipher = require('./cipher');



/**
nodelay ：是否启用 nodelay模式，0不启用；1启用。
interval ：协议内部工作的 interval，单位毫秒，比如 10ms或者 20ms
resend ：快速重传模式，默认0关闭，可以设置2（2次ACK跨越将会直接重传）
nc ：是否关闭流控，默认是0代表不关闭，1代表关闭。
普通模式： ikcp_nodelay(kcp, 0, 40, 0, 0);
极速模式： ikcp_nodelay(kcp, 1, 10, 2, 1);
 */


// KCP的下层协议输出函数，KCP需要发送数据时会调用它
// buf/len 表示缓存和长度
// user指针为 kcp对象创建时传入的值，用于区别多个 KCP对象


const clients = {};
net.createServer((socket) => {
    const k = socket.remoteAddress + '_' + socket.remotePort;
    // console.log(k);
    if (undefined === clients[k]) {
        const kcpStream = new KCPClientStream({
            address,
            port,
            k
        });
        clients[k] = {
            socket,
            kcpStream
        };
        
        socket.pipe(kcpStream).pipe(socket);
    }
}).listen(localPort);

const KCPServerStream = require('./kcpServerStream');
const socks5Server = require('simple-socks').createServer();
const net = require('net');
const through2 = require('through2');
const  path  =  require('path');
const  fs  =  require('fs');
const  p  =  './tt.sock';
let access = true;
try {
    fs.accessSync(p);
    fs.unlinkSync(p);
} catch (err) {
    access = false;
}
console.log(access);
socks5Server.listen(p, function () {
  console.log('SOCKS5 proxy server started on ' + p);
});
const port = 31234;
const address = '0.0.0.0';
const kcpStream = new KCPServerStream({
    address,
    port
});

const remotes = {};
function createRemote(k, content) {
    if (undefined === remotes[k]) {
        const socket = net.createConnection(p);
        socket.on('data', (data) => {
            data.k = k;
            content.push(data);
        });
        socket.on('error', (err) => {
            // console.log('error', err);
            // content.push(null);
            socket.destroy();
            remotes[k] = undefined;
        });
        socket.on('close', () => {
            // console.log(k, '代理连接已关闭');
            // content.push(null);
            remotes[k] = undefined;
            socket.destroy();
        });
        remotes[k] = socket;
    }
    return remotes[k];
}

const linkRemote = through2.obj(function (chunk, enc, callback) {
    const k = chunk.k;
    this.callback = callback;
    const socket = createRemote(k, this);
    if (!socket.destroyed) {
        socket.write(chunk);
    }
    callback();
});




kcpStream.bind(() => {
    console.log('udp server 启动');

    kcpStream.pipe(linkRemote).pipe(kcpStream);
})

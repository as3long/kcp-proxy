const udp = require('dgram');
const nodeVersion = process.version.replace('v','').split(/\./gi).map(function (t) { return parseInt(t, 10) });
const kcp = require('@huamu/node-kcp');
const cipher = require('./cipher');

const { Duplex } = require('stream');

class KCPServerStream extends Duplex {
    constructor(options) {
        super();
        const address         = options.address       || '0.0.0.0';
        const port            = options.port          || 12345;
        const interval        = options.kcpInterval || 20;
        const conv            = options.kcpConv || 281;
        const self            = this;
        let socket;
        socket = udp.createSocket('udp4');
        const output  = (data, size, context) => {
            // console.log('output',  data);
            const ePacket = cipher.encode(data);
            socket.send(ePacket, context.port, context.address);
        }
        const clients = {};
        socket.on('message', (msg, rinfo) => {
            const k = rinfo.address + '_' + rinfo.port;
            if (undefined === clients[k]) {
                const context = {
                    address : rinfo.address,
                    port : rinfo.port,
                };
                const kcpobj = new kcp.KCP(conv, context);
                kcpobj.nodelay(1, interval, 2, 1);
                kcpobj.output(output);
                let kcpBuffer = Buffer.from('');
                let kcpIntervalNum = setInterval(() => {
                    kcpobj.update(Date.now());
                    const recv = kcpobj.recv();
                    if (recv) {
                        recv.k = k;
                        // console.log(k, recv);
                        self.push(recv);
                    }
                }, interval);
                clients[k] = kcpobj;
            }
            const dMsg = cipher.decode(msg);
            clients[k].input(dMsg);
        });
        socket.on('close', () => {
            self.push(null);
        });
        this.address = address;
        this.port = port;
        this.socket = socket;
        this.clients = clients;
    }

    _write(packet, encoding, callback) {
        if (packet === null || packet === undefined) {
            callback && callback()
            return;
        }

        let p = packet;
        if (!(p instanceof Buffer)) {
            p = Buffer.from(p)
        }

        const k = packet.k;
        // console.log('write k', packet.k);
        this.clients[k].send(p);
        callback();
    }

    _read(size) {
        
    }

    end(chunk, encoding, callback) {
        if (chunk || encoding || callback) {
            this._write(chunk, encoding, callback);
        }
    }

    bind(cb) {
        this.socket.bind(this.port, this.address, cb);
    }
}

module.exports = KCPServerStream;
const udp = require('dgram');
const nodeVersion = process.version.replace('v','').split(/\./gi).map(function (t) { return parseInt(t, 10) });
const kcp = require('@huamu/node-kcp');
const cipher2 = require('./cipher');

const { Duplex } = require('stream');

class KCPClientStream extends Duplex {
    constructor(options) {
        super();
        const address         = options.address       || '0.0.0.0';
        const port            = options.port          || 12345;
        const interval        = options.kcpInterval || 20;
        const conv            = options.kcpConv || 281;
        const k               = options.k;
        const self            = this;
        let socket = udp.createSocket('udp4');
        const output  = (data, size, context) => {
            // console.log('output',  data);
            const ePacket = cipher2.encode(data);
            socket.send(ePacket, context.port, context.address);
        }
        const kcpobj = new kcp.KCP(conv, {
            address,
            port
        });
        kcpobj.nodelay(1, interval, 2, 1);
        kcpobj.output(output);
        let kcpBuffer = Buffer.from('');
        let kcpIntervalNum = setInterval(() => {
            kcpobj.update(Date.now());
            const recv = kcpobj.recv();
            if (recv) {
                self.push(recv);
            }
        }, interval);
        socket.on('message', (msg, rinfo) => {
            const dMsg = cipher2.decode(msg);
            kcpobj.input(dMsg);
        });
        socket.on('close', () => {
            // self.push(null);
        });
        socket.on('error', (err) => {
            // self.push(null);
            socket.close();
        });
        this.address = address;
        this.port = port;
        this.socket = socket;
        this.kcpobj = kcpobj;
        this.k = k;
    }

    _write(packet, encoding, callback) {
        if (packet === null || packet === undefined) {
            callback && callback()
            return;
        }
        // console.log('packet', packet);
        if (!(packet instanceof Buffer)) {
            packet = Buffer.from(packet)
        }
        // console.log(this.k, 'write', packet);
        this.kcpobj.send(packet);
        callback();
    }

    _read(size) {
        
    }

    end(chunk, encoding, callback) {
        if (chunk || encoding || callback) {
            this._write(chunk, encoding, callback);
        }
    }

    _destroy(error, callback) {
        console.log('_destroy', error);
    }
}

module.exports = KCPClientStream;
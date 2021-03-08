const crypto = require('crypto');

const key = Buffer.from('abcdefghijklmnopqrstuvwxyz123456'); //chacha20-poly1305 key 32位
const iv = Buffer.from('1234567890lk'); //chacha20-poly1305 iv 12位
const TAG_SIZE = 16;

function incrementLE(buffer) {
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i]++ !== 255) break;
    }
  
    return buffer;
}
module.exports = {
    encode(data) {
        const cipher = crypto.createCipheriv('chacha20-poly1305', key, iv, {
            authTagLength: TAG_SIZE
        });
        const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();
        return [ciphertext, tag];
    },
    decode(data) {
        const [encData, dataTag] = [data.slice(0, -TAG_SIZE), data.slice(-TAG_SIZE)];
        const decipher = crypto.createDecipheriv('chacha20-poly1305', key, iv, {
            authTagLength: TAG_SIZE
        });
        decipher.setAuthTag(dataTag);
        const plaintext = Buffer.concat([decipher.update(encData), decipher.final()]);
        return plaintext
    }
}
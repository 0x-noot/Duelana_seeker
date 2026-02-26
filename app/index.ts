import 'react-native-get-random-values';
import { Buffer } from 'buffer';
(global as any).Buffer = Buffer;

// Patch Buffer.isBuffer to recognize Uint8Array instances in Hermes.
// base-x (used by bs58) calls Buffer.isBuffer() after Buffer.from(uint8Array),
// but in Hermes the polyfill Buffer may not pass isBuffer checks consistently.
const origIsBuffer = Buffer.isBuffer;
Buffer.isBuffer = function (b: any): b is Buffer {
  return origIsBuffer(b) || (b instanceof Uint8Array);
};

if (typeof global.structuredClone === 'undefined') {
  (global as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

// Use require() to ensure polyfills above are set up before App loads
const { registerRootComponent } = require('expo');
const { default: App } = require('./App');

registerRootComponent(App);

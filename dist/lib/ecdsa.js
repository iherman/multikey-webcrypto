"use strict";
/**
 * Base conversion functions for ECDSA. The Multikey definition requires the usage of a compressed public key
 * which must be compressed when creating the Multikey representation, and decompressed for the JWK conversion.
 *
 * The two exported functions, used by the rest of the package, just branch out to the internal functions that do the
 * key (de)compression itself.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWKToMultikeyBinary = JWKToMultikeyBinary;
exports.multikeyBinaryToJWK = multikeyBinaryToJWK;
const common_1 = require("./common");
const base_1 = require("@scure/base");
/**
 * Convert the Crypto values from JWK to the equivalent Multikey Pairs' binary data.
 * The final encoding, with preambles, are done in the general level.
 *
 * For ECDSA, the compressed form must be calculated, by adding an extra byte signaling which of the
 * two possible 'y' values are used.
 *
 * (The y value is set as optional in the signature but that is only to make TypeScript happy. A missing
 * value generates an error)
 *
 * @param curve - choice between P-256 and P-384
 * @param x - x value for the elliptical curve
 * @param d - d (private) value for the elliptical curve
 * @param y - y value for the elliptical curve
 * @returns
 */
function JWKToMultikeyBinary(curve, x, d, y) {
    if (y === undefined) {
        throw new Error("ECDSA encoding requires a 'y' value.");
    }
    return {
        public: compressPublicKey(curve, x, y),
        secret: d
    };
}
/**
 * Convert the multikey values to their JWK equivalents. The final `x` and `d` values are encoded
 * in base64 and then the relevant JWK structure are created
 *
 * For EDDSA, this is a very straightforward operation by just encoding the values and plugging them into a
 * constant JWK structure. The interface is there to be reused by the ECDSA equivalent, which must
 * do some extra processing.
 *
 * @param curve - choice between P-256 and P-384
 * @param xb - binary version of the x value for the elliptical curve
 * @param db - binary version of the d value for the elliptical curve
 * @returns
 */
function multikeyBinaryToJWK(curve, xb, db) {
    // The extra complication with ECDSA: the multikey is the compressed 'x' value, the 'y' value
    // must be calculated.
    const uncompressed = uncompressPublicKey(curve, xb);
    const x = base_1.base64urlnopad.encode(uncompressed.x);
    const y = base_1.base64urlnopad.encode(uncompressed.y);
    const output = {
        publicKey: {
            kty: "EC",
            crv: (curve === common_1.CryptoCurves.ECDSA_256) ? "P-256" : "P-384",
            x,
            y,
            key_ops: [
                "verify"
            ],
            ext: true,
        }
    };
    if (db !== undefined) {
        output.privateKey = {
            kty: "EC",
            crv: (curve === common_1.CryptoCurves.ECDSA_256) ? "P-256" : "P-384",
            x,
            y,
            d: base_1.base64urlnopad.encode(db),
            key_ops: [
                "sign"
            ],
            ext: true
        };
    }
    return output;
}
/************************************************************************
 *
 * Internal utility functions for key (de)compression. Some parts of the code below comes from
 * a Perplexity.ai prompt. (I wish there was a better documentation of the
 * packages instead...)
 *
*************************************************************************/
const p384_1 = require("@noble/curves/p384");
const p256_1 = require("@noble/curves/p256");
// Utility function to convert Uint8Array to hex string
function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}
/**
 * Compress the public key. Could be done "manually" (look at the parity of the `y` value, and add a byte at the start of the `x`), but
 * I was lazy and relied on the curve libraries' methods
 *
 * @param curve
 * @param x
 * @param y
 * @returns
 */
function compressPublicKey(curve, x, y) {
    const xBigInt = BigInt(`0x${uint8ArrayToHex(x)}`);
    const yBigInt = BigInt(`0x${uint8ArrayToHex(y)}`);
    const point = (curve === common_1.CryptoCurves.ECDSA_256) ? new p256_1.p256.ProjectivePoint(xBigInt, yBigInt, 1n) : new p384_1.p384.ProjectivePoint(xBigInt, yBigInt, 1n);
    return point.toRawBytes(true);
}
/**
 * Uncompress the compressed public key. The compressed `x` value (minus its first byte) must be by plugged in the curve equation to get the possible `y` values.
 * The curve equation makes it difficult to do it "manually", hence the reliance on the external package.
 *
 * @param curve
 * @param compressedKey
 * @returns
 */
function uncompressPublicKey(curve, compressedKey) {
    const point = (curve === common_1.CryptoCurves.ECDSA_256) ? p256_1.p256.ProjectivePoint.fromHex(compressedKey) : p384_1.p384.ProjectivePoint.fromHex(compressedKey);
    const uncompressedKey = point.toRawBytes(false);
    // The uncompressed key is a concatenation of the x and y values, plus an extra value at the start. The latter must be disposed off, and
    // the remaining array to be cut into two.
    const keyLength = (curve === common_1.CryptoCurves.ECDSA_256) ? 32 : 48;
    const joinedXY = uncompressedKey.slice(1);
    const x = joinedXY.slice(0, keyLength);
    const y = joinedXY.slice(keyLength);
    return { x, y };
}

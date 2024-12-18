"use strict";
/**
 * The real work for the whole library are done in the main functions in this module.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.multikeyToJWK = multikeyToJWK;
exports.JWKToMultikey = JWKToMultikey;
const common_1 = require("./common");
const base_1 = require("@scure/base");
/****************************************************************************************/
/* The real converter functions                                                         */
/****************************************************************************************/
/**
 * Generic function to convert a multikey pair to JWK. This function decodes the multikey data
 * into a binary buffer, checks the preambles and invokes the crypto curve specific converter functions
 * (depending on the preamble values) that do the final conversion from the binary data to JWK.
 *
 * Works for ecdsa (both P-384 and P-256), and eddsa.
 *
 * @param keys
 * @returns
 * @throws - exceptions if something is incorrect in the incoming data
 */
function multikeyToJWK(keys) {
    // Separate the preamble of a multikey from the key value. By doing so, 
    // the initial 'z' value is also removed.
    const convertBinary = (key) => {
        // Check whether the first character is a 'z' before removing it
        if (key[0] === 'z') {
            const plain_key = base_1.base58.decode(key.slice(1));
            return {
                preamble: [plain_key[0], plain_key[1]],
                keyBinary: plain_key.slice(2),
            };
        }
        else {
            throw new Error(`"${key}" is not encoded as required (first character should be a 'z')`);
        }
    };
    // Get the public values...
    const publicBinary = convertBinary(keys.publicKeyMultibase);
    // ... and find out, based on the preamble, which curve is used and whether it is indeed public
    const publicData = (0, common_1.preambleToCryptoData)(publicBinary.preamble);
    if (publicData.crType !== common_1.CryptoKeyTypes.PUBLIC) {
        throw new Error(`"${keys.publicKeyMultibase}" has the wrong preamble (should refer to a public key).`);
    }
    // Get hold of the curve specific converter function that will do the real work on the binary 
    // data
    const converter = common_1.classToDecoder[publicData.crCurve];
    // We have to repeat the previous steps for a secret key, if applicable, before converting the result into a JWK pair,
    // A check is made on the fly to see that the keys are compatible in terms of crypto methods
    if (keys.secretKeyMultibase) {
        const secretBinary = convertBinary(keys.secretKeyMultibase);
        const secretData = (0, common_1.preambleToCryptoData)(secretBinary.preamble);
        if (secretData.crCurve !== publicData.crCurve) {
            throw new Error(`Private and secret keys have different crypto methods`);
        }
        else if (secretData.crType !== common_1.CryptoKeyTypes.SECRET) {
            throw new Error(`"${keys.secretKeyMultibase}" has the wrong preamble (should refer to a secret key).`);
        }
        // Everything seems to be fine
        return converter(publicData.crCurve, publicBinary.keyBinary, secretBinary.keyBinary);
    }
    else {
        return converter(publicData.crCurve, publicBinary.keyBinary);
    }
}
/**
 * Convert JWK Key pair to Multikeys. This function decodes the JWK keys, finds out which binary key it encodes
 * and converts the key to the multikey versions depending on the exact curve.
 *
 * Note that the code does not check (yet?) all combination of the JWK pairs where they would be erroneous, only
 * those that would lead to error in this cose. E.g., it does not check whether the x (and possibly y) values
 * are identical in the secret and private JWK keys.
 *
 * Works for ecdsa (both P-384 and P-256), and eddsa.

 * @param keys
 */
function JWKToMultikey(keys) {
    // Internal function for the common last step of encoding a multikey
    const encodeMultikey = (val, preamble) => {
        const val_mk = new Uint8Array([...preamble, ...val]);
        return 'z' + base_1.base58.encode(val_mk);
    };
    const decodeJWKField = (val) => {
        if (val === undefined) {
            return undefined;
        }
        else {
            return base_1.base64urlnopad.decode(val);
        }
    };
    // Find out the key curve, will be used for branching later: is it ECDSA or EDDSA and, if the former,
    // which one?
    const keyCurve = (key) => {
        if (key.kty) {
            if (key.kty === "EC") {
                switch (key.crv) {
                    case "P-256": return common_1.CryptoCurves.ECDSA_256;
                    case "P-384": return common_1.CryptoCurves.ECDSA_384;
                    default: throw new Error(`Unknown crv value for an ecdsa key (${key.crv})`);
                }
            }
            else if (key.kty === "OKP") {
                if (key.crv === "Ed25519") {
                    return common_1.CryptoCurves.EDDSA;
                }
                else {
                    throw new Error(`Unknown crv value for an OKP key (${key.crv})`);
                }
            }
            else {
                throw new Error(`Unknown kty value for a key (${key.kty})`);
            }
        }
        else {
            throw new Error(`No kty value for the key (${JSON.stringify(key)})`);
        }
    };
    const publicKeyCurve = keyCurve(keys.publicKey);
    // The secret key class is calculated, but this is just for checking; the two must be identical...
    if (keys.privateKey !== undefined) {
        const secretKeyCurve = keyCurve(keys.privateKey);
        if (publicKeyCurve !== secretKeyCurve) {
            throw new Error(`Public and private keys refer to different EC curves (${JSON.stringify(keys)})`);
        }
    }
    // The cryptokey values are x, y (for ecdsa), and d (for the secret key).
    // Each of these are base 64 encoded strings; what we need is the 
    // binary versions thereof.
    const x = decodeJWKField(keys.publicKey.x);
    if (x === undefined) {
        throw new Error(`x value is missing from public key (${JSON.stringify(keys.publicKey)})`);
    }
    const y = decodeJWKField(keys.publicKey.y);
    if (common_1.ECDSACurves.includes(publicKeyCurve) && y === undefined) {
        throw new Error(`y value is missing from the ECDSA public key (${JSON.stringify(keys.publicKey)})`);
    }
    const d = (keys.privateKey) ? decodeJWKField(keys.privateKey.d) : undefined;
    if (keys.privateKey && d === undefined) {
        throw new Error(`d value is missing from private key  (${JSON.stringify(keys)})`);
    }
    const converter = common_1.classToEncoder[publicKeyCurve];
    const finalBinary = converter(publicKeyCurve, x, d, y);
    // We have the binary version of the multikey values, this must be converted into real multikey.
    // This means adding a preamble and convert to base58.
    const preambles = common_1.classToPreamble[publicKeyCurve];
    const output = {
        publicKeyMultibase: encodeMultikey(finalBinary.public, preambles.public)
    };
    if (finalBinary.secret !== undefined) {
        output.secretKeyMultibase = encodeMultikey(finalBinary.secret, preambles.secret);
    }
    return output;
}

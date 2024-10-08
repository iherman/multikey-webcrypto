/**
 * Conversion to and from [Multikey format](https://www.w3.org/TR/controller-document/#multikey) from
 * JWK or WebCrypto for the three EC curves that are defined for Verifiable Credentials: [ECDSA with P-256 and P-384](https://www.w3.org/TR/vc-di-ecdsa/#multikey)
 * and [EDDSA](https://www.w3.org/TR/vc-di-eddsa/#multikey).
 *
 * @package
 */
import { JWKKeyPair, Multikey, Multibase } from './lib/common';
export type { JWKKeyPair, Multikey, Multibase } from './lib/common';
/**
 * Convert a multikey pair to JWK. This function decodes the multikey data
 * into a binary buffer, checks the preambles and invokes the crypto specific converter functions
 * (depending on the preamble values) that do the final conversion from the binary data to JWK.
 *
 * Works for `ecdsa` (both `P-384` and `P-256`), and `eddsa`.
 *
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 */
export declare function multikeyToJWK(keys: Multikey): JWKKeyPair;
/**
 * Overloaded version of the conversion function for a single (public) key in Multikey, returning the generated JWK.
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 */
export declare function multikeyToJWK(keys: Multibase): JsonWebKey;
/**
 * Convert a multikey pair to Web Crypto. This function decodes the multikey data into JWK using the
 * `multikeyToJWK` function, and imports the resulting keys into Web Crypto.
 *
 * Works for `ecdsa` (both `P-384` and `P-256`), and `eddsa`.
 *
 * Note that, because WebCrypto methods are asynchronous, so is this function.
 *
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 * @async
 */
export declare function multikeyToCrypto(keys: Multikey): Promise<CryptoKeyPair>;
/**
 * Overloaded version of the conversion function for a single (public) key in Multikey, returning the generated Crypto Key.
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 */
export declare function multikeyToCrypto(keys: Multibase): Promise<CryptoKey>;
/**
 * Convert a JWK Key pair to Multikeys. This function decodes the JWK keys, finds out which binary key it encodes
 * and, converts the key to the multikey versions depending on the exact curve.
 *
 * Note that the code does not check (yet?) all combination of JWK pairs and fields for possible errors, only
 * those that would lead to error in this package. E.g., it does not check whether the x (and possibly y) values
 * are identical in the secret and private JWK keys.
 *
 * Works for `ecdsa` (both `P-384` and `P-256`), and `eddsa`.
 *
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 */
export declare function JWKToMultikey(keys: JWKKeyPair): Multikey;
/**
 * Overloaded version of the conversion function for a single (public) key in JWK, returning the generated Multikey.
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 */
export declare function JWKToMultikey(keys: JsonWebKey): Multibase;
/**
 * Convert a Crypto Key pair to Multikeys. This function exports the Cryptokeys into a JWK Key pair,
 * and uses the `JWKToMultikey` function.
 *
 * Works for `ecdsa` (both `P-384` and `P-256`), and `eddsa`.
 *
 * Note that, because WebCrypto methods are asynchronous, so is this function.
 *
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 * @async
 */
export declare function cryptoToMultikey(keys: CryptoKeyPair): Promise<Multikey>;
/**
 * Overloaded version of the conversion function for a single (public) key in JWK, returning the generated Multikey.
 * @param keys
 * @throws - exceptions if something is incorrect in the incoming data
 */
export declare function cryptoToMultikey(keys: CryptoKey): Promise<Multibase>;

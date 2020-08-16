'use strict'

const crypto = require('crypto')
const fs = require('fs')
const log = require('./utils/log')

/* Arguments that can be passed are
 * --secret <secretKey>  | -s <secretKey>
 * --out <file-path> | -o <file-path>
 * --algo <algoName> |  -a <algoName>
 * --decrypt | -d 
 */

/**
 * @param {{secret: string, encryptedFile: string, encryptionAlgo: string, ivLength: number}} options
 * @returns {String}
 */
module.exports.decrypt = (options) => {
    const secret = options.secret
    const encryptedFile = options.encryptedFile || '.env.enc'
    const encryptionAlgo = options.encryptionAlgo || 'aes256'
    const ivLength = options.ivLength || 16

    if (!fs.existsSync(encryptedFile)) throw `${encryptedFile} does not exist.`
    if (!secret || typeof (secret) !== 'string') throw 'No SecretKey provided.'

    const fileBuffer = fs.readFileSync(encryptedFile)
    const iv = fileBuffer.slice(0, ivLength)
    const ciphertext = fileBuffer.slice(ivLength, fileBuffer.length)
    const key = crypto.createHash('sha256').update(String(secret)).digest()
    const decipher = crypto.createDecipheriv(encryptionAlgo, key, iv)
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

/**
 * @param {{secret: string, inputFile: string, encryptedFile: string, encryptionAlgo: string, ivLength: number}} options
 * @returns {Promise<>}
 */
module.exports.encrypt = (options) => {

    const secret = options.secret
    const inputFile = options.inputFile
    const encryptedFile = options.encryptedFile || `${inputFile}.enc`
    const encryptionAlgo = options.encryptionAlgo || 'aes256'
    const ivLength = options.ivLength || 16
    // presumably createCipheriv() should work for all the algo in ./openssl_list-cipher-algorithms.csv with the right key/iv length

    if (!inputFile || !fs.existsSync(inputFile)) throw `Error: ${inputFile} does not exist.`
    if (!secret || typeof (secret) !== 'string') throw 'No SecretKey provided.Use -s option to specify secret'

    const key = crypto.createHash('sha256').update(String(secret)).digest() // node v10.5.0+ should use crypto.scrypt(secret, salt, keylen[, options], callback)
    const iv = crypto.randomBytes(ivLength)
    const cipher = crypto.createCipheriv(encryptionAlgo, key, iv)
    const output = fs.createWriteStream(encryptedFile)
    output.write(iv)


    const promise = new Promise((resolve, reject) => {
        fs.createReadStream(inputFile).pipe(cipher).pipe(output)
        output.on('finish', () => {
            log(`The Environment file "${inputFile}" has been encrypted to "${encryptedFile}".`, 'info')
            log(`Make sure to delete "${inputFile}" for production use.`, 'warn')
            resolve()
        })
    })
    return promise
}

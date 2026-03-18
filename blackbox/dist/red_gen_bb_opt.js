"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.read_gen_bb = read_gen_bb;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const GBBMASKLEN = 512;
const GBBDATALEN = 512;
const GBBPTAGB = "<ACC_PSW>";
const GBBPTAGE = "</ACC_PSW>";
const FILEXT = ".HKF";
async function read_gen_bb(path_name, filename) {
    const salida = {
        rc: 1,
        usr: "NULL",
        pwd: "NULL"
    };
    const fullPath = path.join(path_name, filename);
    if (!fs.existsSync(fullPath)) {
        salida.rc = -2;
        return salida;
    }
    let buffer;
    try {
        buffer = fs.readFileSync(fullPath);
    }
    catch {
        salida.rc = -1;
        return salida;
    }
    if (buffer.length < (GBBMASKLEN + GBBDATALEN)) {
        salida.rc = -6;
        return salida;
    }
    const mask = buffer.subarray(0, GBBMASKLEN);
    const data = buffer.subarray(GBBMASKLEN, GBBMASKLEN + GBBDATALEN);
    let off_a_mask = mask[GBBMASKLEN - 2] + 1;
    let off_a_dat = 1;
    // buffer final directamente
    const out = Buffer.allocUnsafe(GBBDATALEN);
    for (let i = 0; i < GBBDATALEN; i++) {
        const bm_255 = off_a_mask & 0xFF;
        const bd_255 = off_a_dat & 0xFF;
        const p1 = data[i] ^ bm_255;
        const p2 = mask[off_a_mask - 1] ^ bd_255;
        out[i] = p1 ^ p2;
        off_a_dat++;
        off_a_mask++;
        if (off_a_mask > GBBMASKLEN) {
            off_a_mask = 1;
        }
    }
    const decodedString = out.toString("utf8");
    const utagBase = filename.replace(/\.hkf$/i, "");
    const butag = `<ACC_${utagBase}>`;
    const eutag = `</ACC_${utagBase}>`;
    const userStart = decodedString.indexOf(butag);
    const userEnd = decodedString.indexOf(eutag);
    if (userStart === -1 || userEnd === -1) {
        salida.rc = -2;
        return salida;
    }
    salida.usr = decodedString.substring(userStart + butag.length, userEnd);
    if (salida.usr.length === 0) {
        salida.rc = -3;
        salida.usr = "NULL";
    }
    const pwdStart = decodedString.indexOf(GBBPTAGB);
    const pwdEnd = decodedString.indexOf(GBBPTAGE);
    if (pwdStart === -1 || pwdEnd === -1) {
        salida.rc = -4;
        return salida;
    }
    salida.pwd = decodedString.substring(pwdStart + GBBPTAGB.length, pwdEnd);
    if (salida.pwd.length === 0) {
        salida.rc = -5;
        salida.pwd = "NULL";
    }
    salida.rc = 0;
    return salida;
}

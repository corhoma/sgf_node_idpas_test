import * as fs from "fs";
import * as path from "path";

export interface BBResult {
    rc: number;
    usr: string;
    pwd: string;
}

const GBBMASKLEN = 512;
const GBBDATALEN = 512;

const GBBPTAGB = "<ACC_PSW>";
const GBBPTAGE = "</ACC_PSW>";

const FILEXT = ".HKF";

export async function read_gen_bb(path_name: string, filename: string): Promise<BBResult> {

    const salida: BBResult = {
        rc: 1,
        usr: "NULL",
        pwd: "NULL"
    };

    const fullPath = path.join(path_name, filename);

    if (!fs.existsSync(fullPath)) {
        salida.rc = -2;
        return salida;
    }

    let buffer: Buffer;

    try {
        buffer = fs.readFileSync(fullPath);
    } catch {
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

    salida.rc = 0; // ojo la convencion depablño !!!

    return salida;
}
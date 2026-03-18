
/**
 * Lee y desencripta archivos de credenciales .HKF
 * @author Corhoma srl. - Adaptado a Node.js - typescript  20260309)
 */

//
//Este es un módulo crítico porque maneja la seguridad (desencriptación de credenciales). 
// En Node.js, para manejar archivos binarios y operaciones de bytes como ord o chr, 
// utilizaremos el objeto Buffer, que es mucho más eficiente para estas tareas que los strings estándar.

import * as fs from 'fs';
import * as path from 'path';


/**
 * Interface para el retorno de la Caja Negra
 */
export interface BBResult {
    rc: number;
    usr: string;
    pwd: string;
}

/**
 * Constantes del algoritmo de Caja Negra
 */
const BBLEN = 1024;
const GBBMASKLEN = 512;
const GBBDATALEN = 512;
const GBBPTAGB = '<ACC_PSW>';
const GBBPTAGE = '</ACC_PSW>';
const FILEXT = '.HKF';


export async function read_gen_bb(path_name: string, filename: string): Promise<BBResult> {
    const salida: BBResult = {
        rc: 1,                 // asumo ok 
        usr: 'NULL',
        pwd: 'NULL'
    };

    const fullPath = path.join(path_name, filename);

    console.log (fullPath) ;

    // 1. Verificar existencia y leer archivo
    if (!fs.existsSync(fullPath)) {
        console.error(`El archivo ${fullPath} no existe`);
        salida.rc = -2;
        return salida;
    }

    let buffer: Buffer;
    try {
        // Leemos el archivo de forma sincrónica o asincrónica (usamos Sync para simplificar lógica de bytes)
        buffer = fs.readFileSync(fullPath);
    } catch (err) {
        salida.rc = -1;
        return salida;
    }

    // 2. Separar Máscara y Data (Equivalente a substr en PHP)
    const mask = buffer.subarray(0, GBBMASKLEN);
    const data = buffer.subarray(GBBMASKLEN, GBBMASKLEN + GBBDATALEN);

    // 3. Algoritmo de desencriptación
    // Tomamos el offset de la máscara (anteúltimo byte)
    let off_a_mask = mask[GBBMASKLEN - 2] + 1;
    
    let off_a_dat = 0x01;
    let wbuf: number[] = []; // Usaremos un array de números para los bytes resultantes

    for (let i = 0; i < GBBDATALEN; i++) {
        const bm_255 = off_a_mask % 256;
        const bd_255 = off_a_dat % 256;

        // Operaciones XOR siguiendo el algoritmo original
        let p1 = data[i];
        p1 = p1 ^ bm_255;

        let p2 = mask[off_a_mask - 1];
        p2 = p2 ^ bd_255;

        const nd1 = p1 ^ p2;
        wbuf.push(nd1);

        off_a_dat++;
        off_a_mask++;

        if (off_a_mask > GBBMASKLEN) {
            off_a_mask = 1;
        }
    }

    // Convertimos el array de bytes a un string (Buffer -> String)
    const decodedString = Buffer.from(wbuf).toString('utf-8');

    // 4. Extraer etiquetas (Tags)
    // Preparamos los tags dinámicos basados en el nombre del archivo
    const utagBase = filename.replace(FILEXT, '');
    const butag = `<ACC_${utagBase}>`;
    const eutag = `</ACC_${utagBase}>`;

    // Extraer Usuario
    const userStart = decodedString.indexOf(butag);
    const userEnd = decodedString.indexOf(eutag);

    if (userStart === -1 || userEnd === -1) {
        salida.rc = -2;
        return salida;
    }

    salida.usr = decodedString.substring(userStart + butag.length, userEnd);
    if (salida.usr.length === 0) {
        salida.rc = -3;
        salida.usr = 'NULL';
    }

    // Extraer Password
    const pwdStart = decodedString.indexOf(GBBPTAGB);
    const pwdEnd = decodedString.indexOf(GBBPTAGE);

    if (pwdStart === -1 || pwdEnd === -1) {
        salida.rc = -4;
        return salida;
    }

    salida.pwd = decodedString.substring(pwdStart + GBBPTAGB.length, pwdEnd);
    if (salida.pwd.length === 0) {
        salida.rc = -5;
        salida.pwd = 'NULL';
    }

    return salida;
 
}


module.exports = { read_gen_bb };


//Notas de la conversión:
//Buffer vs Strings: En PHP 4/8, los strings pueden tratarse casi como arrays de bytes. En Node.js, para archivos binarios (como un .HKF encriptado), usamos Buffer. Esto evita problemas de encoding que romperían el algoritmo XOR.

//subarray vs substr: En Node.js, buffer.subarray es el equivalente más rápido para segmentar los datos de máscara y contenido sin copiar la memoria innecesariamente.

//Encadenamiento de XOR: He mantenido la lógica exacta de los desplazamientos (off_a_mask, off_a_dat) y los operadores ^ (XOR) para asegurar que la desencriptación sea idéntica a la original.

//Tags Dinámicos: Al igual que en el original, el tag de usuario se construye dinámicamente (<ACC_NOMBREARCHIVO>), lo cual es clave para que el sistema encuentre las credenciales correctas.

// ¿Cómo lo probamos?
// Este módulo es la base para que el sistema pueda conectarse a la DB o al LDAP sin tener las claves en texto plano.


/* ----------------------------------------------------------------
	* Lectura caja negra usuario generico corhoma(c)
	*         este codigo lee los archivos .HKF generados por el 
	*         programa GENBBSET - version typescript convertida 
    *         de la version php
	*
	* @author  Corhoma srl. (c) 2026 - convertido from php
	* @version 1.02, 2026/03/17
	* @since   node 18.xxxx
    * 
    * 
	* @param   fullpath to black box file 
	*			
	* @return	asociative array [rc] = return code  
	* 				             [usr] = Nombre de usuario
	*   				         [pwd] = clave del usuario	
	* 
		Código de los errores
	
		[rc] = 0     OK
	
		['rc'] = 1    Error fopen
		['rc'] = 2    Error El archivo no existe
		['rc'] = 3    No hay tag user
			
		['rc'] = 4    El nombre es nulo
		['rc'] = 5    No hay tag de password
		['rc'] = 6    El password es nulo
---------------------------------------------------------------  */

//import * as fs from 'fs';
const fs = require("node:fs");

//import * as path from 'path';
const path = require("node:path");

import type {  BBResult } from "./types";

/**
 * Constantes del algoritmo de Caja Negra
 */
const BBLEN = 1024;
const GBBMASKLEN = 512;
const GBBDATALEN = 512;
const GBBPTAGB = '<ACC_PSW>';
const GBBPTAGE = '</ACC_PSW>';
const FILEXT = '.HKF';

/**
 * Lee y desencripta archivos de credenciales .HKF
 * @author Corhoma srl. (Adaptado a Node.js/TS 2026)
 */
// async function read_gen_bb(path_name: string, filename: string): Promise<BBResult> {

 async function read_gen_bb(path_name: string, filename: string): Promise<BBResult> {

    const salida: BBResult = {
        rc: 0,                 // asumo ok 
        usr: 'NULL',
        pwd: 'NULL'
    };

    const fullPath = path.join(path_name, filename);

   // console.log (fullPath) ;

    // 1. Verificar existencia y leer archivo
    if (!fs.existsSync(fullPath)) {
        console.error(`\n Error (-2) El archivo ${fullPath} no existe`);
        salida.rc = 2;
        return salida;
    }

    let buffer: Buffer;
    try {
        // Leemos el archivo de forma sincrónica o asincrónica (usamos Sync para simplificar lógica de bytes)
        buffer = fs.readFileSync(fullPath);
    } catch (err) {
        salida.rc = 1;
        return salida;
    }

    // 2. Separar Máscara y Data (Equivalente a substr en PHP)
    const mask = buffer.subarray(0, GBBMASKLEN);
    const data = buffer.subarray(GBBMASKLEN, GBBMASKLEN + GBBDATALEN);

    // 3. Algoritmo de desencriptación
    // Tomamos el offset de la máscara (anteúltimo byte)
    let off_a_mask =  (mask[GBBMASKLEN - 2] ?? 0) + 1;
    
    let off_a_dat = 0x01;
    let wbuf: number[] = []; // Usaremos un array de números para los bytes resultantes

    for (let i = 0; i < GBBDATALEN; i++) {
        const bm_255 = off_a_mask % 256;
        const bd_255 = off_a_dat % 256;

        // Operaciones XOR siguiendo el algoritmo original
        let p1: number = data[i] ?? 0;
        p1 = p1 ^ bm_255;

        let p2: number = mask[(off_a_mask - 1) % GBBMASKLEN] ?? 0;
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
        salida.rc = 2;  // el tag de usuario no existe
        return salida;
    }

    salida.usr = decodedString.substring(userStart + butag.length, userEnd);
    // salida.usr = "nada" ;               // para probar errores 
    if (salida.usr.length === 0) {
        salida.rc =   3;              // no hau usuario
        salida.usr = 'NULL';
    }

    // Extraer Password
    const pwdStart = decodedString.indexOf(GBBPTAGB);
    const pwdEnd = decodedString.indexOf(GBBPTAGE);

    if (pwdStart === -1 || pwdEnd === -1) {
        salida.rc = 4; // no hay tag de password 
        return salida;
    }

    salida.pwd = decodedString.substring(pwdStart + GBBPTAGB.length, pwdEnd);
    if (salida.pwd.length === 0) {
        salida.rc = 5;            // el password no existe como tal 
        salida.pwd = 'NULL';
    }

    return salida;
 
}

module.exports = { read_gen_bb  }

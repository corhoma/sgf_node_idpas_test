/* ----------------------------------------------------------------
	* funciones utilitarias grabacion de
     *buffers y log sgf_node_idpas_tst
	*         
	* @author  Corhoma srl. (c) 2026 - convertido from php
	* @version 1.02.  2026/03/17  revisado para github
	* @since   node 18.xxxx
    * 
    * 
-----------------------------------------------------------  */


// ---------------- DEPENDENCIAS ---------------------------

//import * as fs   from "node:fs";
const fs = require("node:fs");

//import * as path from "node:path";
const path = require("node:path");

//import * as os   from "node:os";
const os = require("node:os");

//import { type LdapConfig }   from "./buscar_usuario.js";
import type { LdapConfig } from "./types";

//--------------------------------------------------------------------------------------------------------------------------

// escribe el header en un buffer de log 
function escribir_header_buflog(flogBuff: string[]): void {

    const SEP = "-----------------------------------------------------------------------------------------------";

    const ahora = new Date();	
  
	const dd  = String(ahora.getDate()).padStart(2, "0");
	const mm  = String(ahora.getMonth() + 1).padStart(2, "0");
	const aaaa = ahora.getFullYear();
	const hh  = String(ahora.getHours()).padStart(2, "0");
	const min = String(ahora.getMinutes()).padStart(2, "0");
	const ss  = String(ahora.getSeconds()).padStart(2, "0");

	const fecha = `${aaaa}-${mm}-${dd} - ${hh}:${min}:${ss}`;
    
    // ------ obtengo datos del sistema ------------------------------------

    const workstation = os.hostname();
    const userLogon   = os.userInfo().username;

    // ------- obtengo el path de ejecución --------------------------------
    const programPath = process.cwd();

    const msg_header = [
        SEP,
        "   INICIO de la Ejecución del Sgf_node_idpas_test.Exe r0102 - (c)Corhoma SRL (2026)",
        SEP,
        "",
        `            Workstation : ${workstation}`,
        `             User Logon : ${userLogon}`,
        `             Date/Time :  ${ fecha}`,
        `           Program Path : ${programPath}`,
       ""
    ].join(os.EOL) ;

    // escribo en el buffer el header 
    flogBuff.push(msg_header);

}   

//--------------------------------------------------------------------------------------------------------------------------
// esos datos  los trae desde la bb

function escribir_buff_after_read_bb(          
        fusr_bb: string ,
        fusr_to_find: string ,
                furl: string,
            flogBuff: string[]
): void {

    const SEP  = "-----------------------------------------------------------------------------------------------";
      
    const proc_msg = [
        SEP,
        `            Acces Account  : ${fusr_bb}`,
        `                  Servidor : ${furl}`,
        `                 User Test : ${fusr_to_find}`,
        
        SEP,
        ].join(os.EOL);

    // escribo en el buffer el header 
    flogBuff.push(proc_msg);
    // console.log(contenido);
}

//--------------------------------------------------------------------------------------------------------------------------
function escribir_proc_buflog(
    config      : LdapConfig,
    grupos      : string[],
    flogBuff: string[]
): void {

    const SEP  = "-----------------------------------------------------------------------------------------------";
 
    // ------- formatear grupos con indentación ------------------------
    const indent       = " ".repeat(20);
    const gruposLineas = grupos
        .map((g, i) => i === 0
            ? `${" ".repeat(5)}Grupos : ${g}`
            : `${indent}${g}`)
        .join(os.EOL);

    // -------- armar el contenido del mensaje --------------------
    const proc_msg = [
        SEP,
        gruposLineas,
        "",
        SEP,
        ` FIN de la Ejecución del Sgf_node_idpas_test.Exe r0101`,
        SEP
    ].join(os.EOL);

    // escribo en el buffer el header 
    flogBuff.push(proc_msg);
    // console.log(contenido);
}

//--------------------------------------------------------------------------------------------------------------------------
function escribir_end_buflog(
    config      : LdapConfig,
    grupos      : string[],
    flogBuff: string[]
): void {

    const SEP  = "-----------------------------------------------------------------------------------------------";
 
    // ------------ armar el contenido -----------------------
    const trail_msg = [
        SEP,
        ` FIN de la Ejecución del Sgf_node_idpas_test.Exe r0102`,
        SEP,
        ""
    ].join(os.EOL);

   // escribo en el buffer el header 
    flogBuff.push(trail_msg);
    // console.log(contenido);
}

function escribir_string_file_log(   mensaje: string, logPath: string ): void {
    // escribe en el archivo 
    fs.appendFileSync(logPath, mensaje, "utf-8");
    
}

// ESCRIBEW MENSAJE EN UN BUFFER
function escribir_buf_log( msg: string, flogBuff: string[]): void {
    // escribe en el buffer 
     flogBuff.push(msg);
}

function grabar_array_to_file_log (flogBuff: string[], fpath: string ): void {
    // graba el buffer a disco 
   fs.writeFileSync(  fpath,  flogBuff.join("\n"), "utf8");
 
}

module.exports = { escribir_header_buflog,					
					escribir_buff_after_read_bb,
					escribir_proc_buflog,
					escribir_end_buflog,
					escribir_string_file_log,
					escribir_buf_log, 					
					grabar_array_to_file_log}
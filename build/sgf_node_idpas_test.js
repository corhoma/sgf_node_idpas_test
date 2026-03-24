/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 756:
/***/ ((module) => {

const { hasOwnProperty } = Object.prototype

const encode = (obj, opt = {}) => {
  if (typeof opt === 'string') {
    opt = { section: opt }
  }
  opt.align = opt.align === true
  opt.newline = opt.newline === true
  opt.sort = opt.sort === true
  opt.whitespace = opt.whitespace === true || opt.align === true
  // The `typeof` check is required because accessing the `process` directly fails on browsers.
  /* istanbul ignore next */
  opt.platform = opt.platform || (typeof process !== 'undefined' && process.platform)
  opt.bracketedArray = opt.bracketedArray !== false

  /* istanbul ignore next */
  const eol = opt.platform === 'win32' ? '\r\n' : '\n'
  const separator = opt.whitespace ? ' = ' : '='
  const children = []

  const keys = opt.sort ? Object.keys(obj).sort() : Object.keys(obj)

  let padToChars = 0
  // If aligning on the separator, then padToChars is determined as follows:
  // 1. Get the keys
  // 2. Exclude keys pointing to objects unless the value is null or an array
  // 3. Add `[]` to array keys
  // 4. Ensure non empty set of keys
  // 5. Reduce the set to the longest `safe` key
  // 6. Get the `safe` length
  if (opt.align) {
    padToChars = safe(
      (
        keys
          .filter(k => obj[k] === null || Array.isArray(obj[k]) || typeof obj[k] !== 'object')
          .map(k => Array.isArray(obj[k]) ? `${k}[]` : k)
      )
        .concat([''])
        .reduce((a, b) => safe(a).length >= safe(b).length ? a : b)
    ).length
  }

  let out = ''
  const arraySuffix = opt.bracketedArray ? '[]' : ''

  for (const k of keys) {
    const val = obj[k]
    if (val && Array.isArray(val)) {
      for (const item of val) {
        out += safe(`${k}${arraySuffix}`).padEnd(padToChars, ' ') + separator + safe(item) + eol
      }
    } else if (val && typeof val === 'object') {
      children.push(k)
    } else {
      out += safe(k).padEnd(padToChars, ' ') + separator + safe(val) + eol
    }
  }

  if (opt.section && out.length) {
    out = '[' + safe(opt.section) + ']' + (opt.newline ? eol + eol : eol) + out
  }

  for (const k of children) {
    const nk = splitSections(k, '.').join('\\.')
    const section = (opt.section ? opt.section + '.' : '') + nk
    const child = encode(obj[k], {
      ...opt,
      section,
    })
    if (out.length && child.length) {
      out += eol
    }

    out += child
  }

  return out
}

function splitSections (str, separator) {
  var lastMatchIndex = 0
  var lastSeparatorIndex = 0
  var nextIndex = 0
  var sections = []

  do {
    nextIndex = str.indexOf(separator, lastMatchIndex)

    if (nextIndex !== -1) {
      lastMatchIndex = nextIndex + separator.length

      if (nextIndex > 0 && str[nextIndex - 1] === '\\') {
        continue
      }

      sections.push(str.slice(lastSeparatorIndex, nextIndex))
      lastSeparatorIndex = nextIndex + separator.length
    }
  } while (nextIndex !== -1)

  sections.push(str.slice(lastSeparatorIndex))

  return sections
}

const decode = (str, opt = {}) => {
  opt.bracketedArray = opt.bracketedArray !== false
  const out = Object.create(null)
  let p = out
  let section = null
  //          section          |key      = value
  const re = /^\[([^\]]*)\]\s*$|^([^=]+)(=(.*))?$/i
  const lines = str.split(/[\r\n]+/g)
  const duplicates = {}

  for (const line of lines) {
    if (!line || line.match(/^\s*[;#]/) || line.match(/^\s*$/)) {
      continue
    }
    const match = line.match(re)
    if (!match) {
      continue
    }
    if (match[1] !== undefined) {
      section = unsafe(match[1])
      if (section === '__proto__') {
        // not allowed
        // keep parsing the section, but don't attach it.
        p = Object.create(null)
        continue
      }
      p = out[section] = out[section] || Object.create(null)
      continue
    }
    const keyRaw = unsafe(match[2])
    let isArray
    if (opt.bracketedArray) {
      isArray = keyRaw.length > 2 && keyRaw.slice(-2) === '[]'
    } else {
      duplicates[keyRaw] = (duplicates?.[keyRaw] || 0) + 1
      isArray = duplicates[keyRaw] > 1
    }
    const key = isArray && keyRaw.endsWith('[]')
      ? keyRaw.slice(0, -2) : keyRaw

    if (key === '__proto__') {
      continue
    }
    const valueRaw = match[3] ? unsafe(match[4]) : true
    const value = valueRaw === 'true' ||
      valueRaw === 'false' ||
      valueRaw === 'null' ? JSON.parse(valueRaw)
      : valueRaw

    // Convert keys with '[]' suffix to an array
    if (isArray) {
      if (!hasOwnProperty.call(p, key)) {
        p[key] = []
      } else if (!Array.isArray(p[key])) {
        p[key] = [p[key]]
      }
    }

    // safeguard against resetting a previously defined
    // array by accidentally forgetting the brackets
    if (Array.isArray(p[key])) {
      p[key].push(value)
    } else {
      p[key] = value
    }
  }

  // {a:{y:1},"a.b":{x:2}} --> {a:{y:1,b:{x:2}}}
  // use a filter to return the keys that have to be deleted.
  const remove = []
  for (const k of Object.keys(out)) {
    if (!hasOwnProperty.call(out, k) ||
      typeof out[k] !== 'object' ||
      Array.isArray(out[k])) {
      continue
    }

    // see if the parent section is also an object.
    // if so, add it to that, and mark this one for deletion
    const parts = splitSections(k, '.')
    p = out
    const l = parts.pop()
    const nl = l.replace(/\\\./g, '.')
    for (const part of parts) {
      if (part === '__proto__') {
        continue
      }
      if (!hasOwnProperty.call(p, part) || typeof p[part] !== 'object') {
        p[part] = Object.create(null)
      }
      p = p[part]
    }
    if (p === out && nl === l) {
      continue
    }

    p[nl] = out[k]
    remove.push(k)
  }
  for (const del of remove) {
    delete out[del]
  }

  return out
}

const isQuoted = val => {
  return (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
}

const safe = val => {
  if (
    typeof val !== 'string' ||
    val.match(/[=\r\n]/) ||
    val.match(/^\[/) ||
    (val.length > 1 && isQuoted(val)) ||
    val !== val.trim()
  ) {
    return JSON.stringify(val)
  }
  return val.split(';').join('\\;').split('#').join('\\#')
}

const unsafe = val => {
  val = (val || '').trim()
  if (isQuoted(val)) {
    // remove the single quotes before calling JSON.parse
    if (val.charAt(0) === "'") {
      val = val.slice(1, -1)
    }
    try {
      val = JSON.parse(val)
    } catch {
      // ignore errors
    }
  } else {
    // walk the val to find the first not-escaped ; character
    let esc = false
    let unesc = ''
    for (let i = 0, l = val.length; i < l; i++) {
      const c = val.charAt(i)
      if (esc) {
        if ('\\;#'.indexOf(c) !== -1) {
          unesc += c
        } else {
          unesc += '\\' + c
        }

        esc = false
      } else if (';#'.indexOf(c) !== -1) {
        break
      } else if (c === '\\') {
        esc = true
      } else {
        unesc += c
      }
    }
    if (esc) {
      unesc += '\\'
    }

    return unesc.trim()
  }
  return val
}

module.exports = {
  parse: decode,
  decode,
  stringify: encode,
  encode,
  safe,
  unsafe,
}


/***/ }),

/***/ 589:
/***/ ((module) => {

"use strict";
module.exports = require("node:assert");

/***/ }),

/***/ 598:
/***/ ((module) => {

"use strict";
module.exports = require("node:crypto");

/***/ }),

/***/ 474:
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 24:
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ 30:
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ 161:
/***/ ((module) => {

"use strict";
module.exports = require("node:os");

/***/ }),

/***/ 760:
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ 692:
/***/ ((module) => {

"use strict";
module.exports = require("node:tls");

/***/ }),

/***/ 975:
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ 927:
/***/ ((module, exports, __nccwpck_require__) => {

"use strict";

/* ----------------------------------------------------------------
    * Busqueda de un usuario en LDAP y/O Active directory
    *
    * @author  Corhoma srl. (c) 2026 - convertido from php
    * @version 1.02.  2026/03/17
    * @since   node 18.xxxx
    *
    * @param
    *            usuario: string        usuario que buscaremos
    *            config: LdapConfig,    estructura json  con la configuracion
    *            flogBuff: string[],    buffer donde prepara el log
    *            flogpath: string       full path log file
    *
    *
    * @return	   objeto Promise
    * 				    resultado: LdapResult = {
                                encontrado : false,          true/false
                                cn         : "",
                                dn         : "",
                                grupos     : []            array d egrupos a los que pertenece
                                 };
    *
    
    
    ---------------------------------------------------------------  */
Object.defineProperty(exports, "__esModule", ({ value: true }));
// ─── DEPENDENCIAS ─────────────────────────────────────────
//import * as path from "node:path";
const path = __nccwpck_require__(760);
//import {  escribir_buf_log } from "./escribir_log.js";
//import {  grabar_array_to_file_log} from "./escribir_log.js";
const { escribir_buf_log, grabar_array_to_file_log } = __nccwpck_require__(296);
// podemos importar varia funciones n un alinea 
//import { Client, type SearchOptions } from "ldapts"; // Añadimos 'type'
const { Client } = __nccwpck_require__(752);
// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────
async function buscar_usuario(usuario, config, flogBuff, flogpath) {
    const resultado = {
        encontrado: false,
        cn: "",
        dn: "",
        grupos: []
    };
    const client = new Client({
        url: config.url
    });
    try {
        console.log("Conectando al LDAP...");
        let bind_msg_resultado = "Bind LDAP exitoso - Autenticado correctamente"; // asumo este 
        let usr_test_msg = ""; //lo usaremos para informar siu existe o no ... 
        //       
        try {
            await client.bind(config.bindDN, config.bindPassword);
            console.log(bind_msg_resultado);
        }
        catch (error) {
            bind_msg_resultado = " Error (202): " + error.message + " Código LDAP: " + error.code + " Nombre error: " + error.name;
            console.log(bind_msg_resultado);
            escribir_buf_log(bind_msg_resultado, flogBuff);
            grabar_array_to_file_log(flogBuff, flogpath);
            let error_bind = 201;
            process.exit(error_bind);
        }
        escribir_buf_log(bind_msg_resultado, flogBuff);
        const filtro = `(cn=${usuario})`;
        const options = {
            scope: "sub",
            filter: filtro,
            attributes: ["dn", "cn", "memberOf"]
        };
        console.log(`Buscando usuario: ${usuario}`);
        const { searchEntries } = await client.search(config.baseDN, options);
        if (searchEntries.length === 0) {
            usr_test_msg = `Usuario ${usuario} no encontrado`;
            console.log(usr_test_msg);
            escribir_buf_log(usr_test_msg, flogBuff);
        }
        else {
            for (const entry of searchEntries) {
                console.log("\nUsuario encontrado");
                console.log("CN:", entry.cn);
                console.log("DN:", entry.dn);
                resultado.encontrado = true;
                resultado.cn = entry.cn?.toString() ?? "";
                resultado.dn = entry.dn?.toString() ?? "";
                const grupos = entry.memberOf
                    ? (Array.isArray(entry.memberOf)
                        ? entry.memberOf
                        : [entry.memberOf])
                    : [];
                if (grupos.length > 0) {
                    let grupos_msg = `\nGrupos (${grupos.length})`;
                    escribir_buf_log(grupos_msg, flogBuff);
                    console.log(grupos_msg);
                    grupos.forEach((g, i) => {
                        resultado.grupos.push(g.toString());
                        const valor = g.toString(); // .toString() funciona tanto en string como en Buffer
                        console.log(`[${i + 1}] ${g}`);
                    });
                }
                else {
                    const no_group_msg = "Sin grupos asignados";
                    console.log(no_group_msg);
                    escribir_buf_log(no_group_msg, flogBuff);
                }
            }
        }
        console.log("\nBúsqueda finalizada");
    }
    catch (err) {
        let msg = "Error creacion cliente (201): " + err.message;
        console.error(msg);
        escribir_buf_log(msg, flogBuff);
    }
    finally {
        await client.unbind();
        console.log("Conexión cerrada");
    }
    return resultado;
}
module.exports = { buscar_usuario };
//# sourceMappingURL=buscar_usuario.js.map

/***/ }),

/***/ 296:
/***/ ((module, exports, __nccwpck_require__) => {

"use strict";

/* ----------------------------------------------------------------
    * funciones utilitarias grabacion de
     *buffers y log sgf_node_idpas_tst
    *
    * @author  Corhoma srl. (c) 2026 - convertido from php
    * @version 1.02.  2026/03/17
    * @since   node 18.xxxx
    *
    *
-----------------------------------------------------------  */
Object.defineProperty(exports, "__esModule", ({ value: true }));
// ---------------- DEPENDENCIAS ---------------------------
//import * as fs   from "node:fs";
const fs = __nccwpck_require__(24);
//import * as path from "node:path";
const path = __nccwpck_require__(760);
//import * as os   from "node:os";
const os = __nccwpck_require__(161);
//--------------------------------------------------------------------------------------------------------------------------
// escribe el header en un buffer de log 
function escribir_header_buflog(flogBuff) {
    const SEP = "-----------------------------------------------------------------------------------------------";
    const ahora = new Date();
    const dd = String(ahora.getDate()).padStart(2, "0");
    const mm = String(ahora.getMonth() + 1).padStart(2, "0");
    const aaaa = ahora.getFullYear();
    const hh = String(ahora.getHours()).padStart(2, "0");
    const min = String(ahora.getMinutes()).padStart(2, "0");
    const ss = String(ahora.getSeconds()).padStart(2, "0");
    const fecha = `${aaaa}-${mm}-${dd} - ${hh}:${min}:${ss}`;
    // ------ obtengo datos del sistema ------------------------------------
    const workstation = os.hostname();
    const userLogon = os.userInfo().username;
    // ------- obtengo el path de ejecución --------------------------------
    const programPath = process.cwd();
    const msg_header = [
        SEP,
        "   INICIO de la Ejecución del Sgf_node_idpas_test.Exe r0102 - (c)Corhoma SRL (2026)",
        SEP,
        "",
        `            Workstation : ${workstation}`,
        `             User Logon : ${userLogon}`,
        `             Date/Time :  ${fecha}`,
        `           Program Path : ${programPath}`,
        ""
    ].join(os.EOL);
    // escribo en el buffer el header 
    flogBuff.push(msg_header);
}
//--------------------------------------------------------------------------------------------------------------------------
// esos datos  los trae desde la bb
function escribir_buff_after_read_bb(fusr_bb, fusr_to_find, furl, flogBuff) {
    const SEP = "-----------------------------------------------------------------------------------------------";
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
function escribir_proc_buflog(config, grupos, flogBuff) {
    const SEP = "-----------------------------------------------------------------------------------------------";
    // ------- formatear grupos con indentación ------------------------
    const indent = " ".repeat(20);
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
function escribir_end_buflog(config, grupos, flogBuff) {
    const SEP = "-----------------------------------------------------------------------------------------------";
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
function escribir_string_file_log(mensaje, logPath) {
    // escribe en el archivo 
    fs.appendFileSync(logPath, mensaje, "utf-8");
}
// ESCRIBEW MENSAJE EN UN BUFFER
function escribir_buf_log(msg, flogBuff) {
    // escribe en el buffer 
    flogBuff.push(msg);
}
function grabar_array_to_file_log(flogBuff, fpath) {
    // graba el buffer a disco 
    fs.writeFileSync(fpath, flogBuff.join("\n"), "utf8");
}
module.exports = { escribir_header_buflog,
    escribir_buff_after_read_bb,
    escribir_proc_buflog,
    escribir_end_buflog,
    escribir_string_file_log,
    escribir_buf_log,
    grabar_array_to_file_log };
//# sourceMappingURL=escribir_log.js.map

/***/ }),

/***/ 312:
/***/ ((module, exports, __nccwpck_require__) => {

"use strict";

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
Object.defineProperty(exports, "__esModule", ({ value: true }));
//import * as fs from 'fs';
const fs = __nccwpck_require__(24);
//import * as path from 'path';
const path = __nccwpck_require__(760);
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
async function read_gen_bb(path_name, filename) {
    const salida = {
        rc: 0, // asumo ok 
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
    let buffer;
    try {
        // Leemos el archivo de forma sincrónica o asincrónica (usamos Sync para simplificar lógica de bytes)
        buffer = fs.readFileSync(fullPath);
    }
    catch (err) {
        salida.rc = 1;
        return salida;
    }
    // 2. Separar Máscara y Data (Equivalente a substr en PHP)
    const mask = buffer.subarray(0, GBBMASKLEN);
    const data = buffer.subarray(GBBMASKLEN, GBBMASKLEN + GBBDATALEN);
    // 3. Algoritmo de desencriptación
    // Tomamos el offset de la máscara (anteúltimo byte)
    let off_a_mask = (mask[GBBMASKLEN - 2] ?? 0) + 1;
    let off_a_dat = 0x01;
    let wbuf = []; // Usaremos un array de números para los bytes resultantes
    for (let i = 0; i < GBBDATALEN; i++) {
        const bm_255 = off_a_mask % 256;
        const bd_255 = off_a_dat % 256;
        // Operaciones XOR siguiendo el algoritmo original
        let p1 = data[i] ?? 0;
        p1 = p1 ^ bm_255;
        let p2 = mask[(off_a_mask - 1) % GBBMASKLEN] ?? 0;
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
        salida.rc = 2; // el tag de usuario no existe
        return salida;
    }
    salida.usr = decodedString.substring(userStart + butag.length, userEnd);
    // salida.usr = "nada" ;               // para probar errores 
    if (salida.usr.length === 0) {
        salida.rc = 3; // no hau usuario
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
        salida.rc = 5; // el password no existe como tal 
        salida.pwd = 'NULL';
    }
    return salida;
}
module.exports = { read_gen_bb };
//# sourceMappingURL=read_gen_bb.js.map

/***/ }),

/***/ 993:
/***/ ((module, exports, __nccwpck_require__) => {

"use strict";

/* ----------------------------------------------------------------
    * lectura del archivo INI para el programa Sgf_node_idpas_test
    *
    * @author  Corhoma srl. (c) 2026 -
    * @version 1.02.  2026/03/17
    * @since   node 18.xxxx
    *
    *
    * @param   no recibe
    *
    * @return	    interface IniConfig {
    *                   LDAP_SERVER: string;
    *                   LDAP_PORT: string;
    *                   LDAPS: string;
    *                   CUBB_PATH: string;
    *                   BASE_DN: string;
    *                   CERT_PATH: string;
    *                   USUARIO: string;
    *                  LOG_FPATH: string
    *                    }
    *
    ---------------------------------------------------------------  */
Object.defineProperty(exports, "__esModule", ({ value: true }));
// ─── DEPENDENCIAS ─────────────────────────────────────────
//import * as path from "node:path";
const path = __nccwpck_require__(760);
//import * as fs   from "node:fs"; // ← agregar esto
const fs = __nccwpck_require__(24);
//import * as ini  from "ini";     // ← agregar esto
const ini = __nccwpck_require__(756);
// --- LEER ARCHIVO INI -------------------------------------
async function read_ini() {
    const salida = {
        LDAP_SERVER: 'NULL',
        LDAP_PORT: 'NULL',
        LDAPS: 'NULL',
        CUBB_PATH: 'NULL',
        BASE_DN: 'NULL',
        CERT_PATH: 'NULL',
        USUARIO: 'NULL',
        LOG_FPATH: 'NULL'
    };
    // esto lee el ini del 
    // funciona con el ini  en config...
    //let basIniPath = "../config";
    //const iniPath = path.join(__dirname, basIniPath, "sgf_node_idpas_conf.ini");
    //const iniPath = path.join(path.dirname(process.execPath), "config", "sgf_node_idpas_conf.ini");
    const iniPath = path.join(process.cwd(), "config", "sgf_node_idpas_conf.ini");
    const iniData = ini.parse(fs.readFileSync(iniPath, "utf-8"));
    // --- MOSTRAR VALORES INI -------------------------------------
    /*
    console.log("MOSTRAR VALORES INI CLIENTE 07"),
    console.log("LDAP_SERVER", iniData.node_idpas_cfg.LDAP_SERVER),
    console.log("LDAP_PORT:", iniData.node_idpas_cfg.LDAP_PORT);
    console.log("LDAPS:", iniData.node_idpas_cfg.LDAPS);
    console.log("CUBB_PATH:", iniData.node_idpas_cfg.CUBB_PATH);
    console.log("BASE_DN:", iniData.node_idpas_cfg.BASE_DN );
    console.log("CERT_PATH:", iniData.node_idpas_cfg.CERT_PATH);
    */
    salida.LDAP_SERVER = iniData.node_idpas_cfg.LDAP_SERVER;
    salida.LDAP_PORT = iniData.node_idpas_cfg.LDAP_PORT;
    salida.LDAPS = iniData.node_idpas_cfg.LDAPS;
    salida.CUBB_PATH = iniData.node_idpas_cfg.CUBB_PATH;
    salida.BASE_DN = iniData.node_idpas_cfg.BASE_DN;
    salida.CERT_PATH = iniData.node_idpas_cfg.CERT_PATH;
    salida.LOG_FPATH = iniData.node_idpas_cfg.LOG_FPATH;
    // accedé a la propiedad solo si el objeto existe”.
    if (iniData.node_idpas_cfg?.USUARIO) {
        // existe Y tiene valor no vacío
        // console.log("USUARIO:", iniData.node_idpas_cfg.USUARIO);
        salida.USUARIO = iniData.node_idpas_cfg.USUARIO;
    }
    return salida;
}
module.exports = { read_ini };
//# sourceMappingURL=read_ini.js.map

/***/ }),

/***/ 752:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";


const assert = __nccwpck_require__(589);
const node_util = __nccwpck_require__(975);
const crypto = __nccwpck_require__(598);
const net = __nccwpck_require__(30);
const tls = __nccwpck_require__(692);
const node_events = __nccwpck_require__(474);

function _interopNamespaceCompat(e) {
  if (e && typeof e === 'object' && 'default' in e) return e;
  const n = Object.create(null);
  if (e) {
    for (const k in e) {
      n[k] = e[k];
    }
  }
  n.default = e;
  return n;
}

const assert__namespace = /*#__PURE__*/_interopNamespaceCompat(assert);
const crypto__namespace = /*#__PURE__*/_interopNamespaceCompat(crypto);
const net__namespace = /*#__PURE__*/_interopNamespaceCompat(net);
const tls__namespace = /*#__PURE__*/_interopNamespaceCompat(tls);

const Ber = {
  EOC: 0,
  Boolean: 1,
  Integer: 2,
  BitString: 3,
  OctetString: 4,
  Null: 5,
  OID: 6,
  ObjectDescriptor: 7,
  External: 8,
  Real: 9,
  Enumeration: 10,
  PDV: 11,
  Utf8String: 12,
  RelativeOID: 13,
  Sequence: 16,
  Set: 17,
  NumericString: 18,
  PrintableString: 19,
  T61String: 20,
  VideotexString: 21,
  IA5String: 22,
  UTCTime: 23,
  GeneralizedTime: 24,
  GraphicString: 25,
  VisibleString: 26,
  GeneralString: 28,
  UniversalString: 29,
  CharacterString: 30,
  BMPString: 31,
  Constructor: 32,
  Context: 128
};

class InvalidAsn1Error extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidAsn1Error";
  }
}

class BerReader {
  size;
  currentLength = 0;
  currentOffset = 0;
  buffer;
  constructor(data) {
    if (!Buffer.isBuffer(data)) {
      throw new TypeError("data must be a Buffer");
    }
    this.buffer = data;
    this.size = data.length;
  }
  get length() {
    return this.currentLength;
  }
  get offset() {
    return this.currentOffset;
  }
  set offset(value) {
    this.currentOffset = value;
  }
  get remain() {
    return this.size - this.currentOffset;
  }
  get remainingBuffer() {
    return this.buffer.subarray(this.currentOffset);
  }
  setBufferSize(size) {
    this.size = size;
  }
  readByte(peek = false) {
    if (this.size - this.currentOffset < 1) {
      return null;
    }
    const byte = this.buffer.readUInt8(this.currentOffset);
    if (!peek) {
      this.currentOffset += 1;
    }
    return byte;
  }
  peek() {
    return this.readByte(true);
  }
  readLength(startOffset) {
    let offset = startOffset ?? this.currentOffset;
    if (offset >= this.size) {
      return null;
    }
    const lengthByte = this.buffer.readUInt8(offset);
    offset += 1;
    if ((lengthByte & 128) === 128) {
      const numLengthBytes = lengthByte & 127;
      if (numLengthBytes === 0) {
        throw new InvalidAsn1Error("Indefinite length not supported");
      }
      if (numLengthBytes > 4) {
        throw new InvalidAsn1Error("Encoding too long");
      }
      if (this.size - offset < numLengthBytes) {
        return null;
      }
      this.currentLength = 0;
      for (let i = 0; i < numLengthBytes; i++) {
        this.currentLength = (this.currentLength << 8) + this.buffer.readUInt8(offset);
        offset += 1;
      }
    } else {
      this.currentLength = lengthByte;
    }
    return offset;
  }
  readSequence(expectedTag) {
    const tag = this.peek();
    if (tag === null) {
      return null;
    }
    if (expectedTag !== void 0 && expectedTag !== tag) {
      throw new InvalidAsn1Error(`Expected 0x${expectedTag.toString(16)}: got 0x${tag.toString(16)}`);
    }
    const newOffset = this.readLength(this.currentOffset + 1);
    if (newOffset === null) {
      return null;
    }
    this.currentOffset = newOffset;
    return tag;
  }
  readInt() {
    return this.readTag(Ber.Integer);
  }
  readBoolean() {
    const value = this.readTag(Ber.Boolean);
    if (value === null) {
      return null;
    }
    return value !== 0;
  }
  readEnumeration() {
    return this.readTag(Ber.Enumeration);
  }
  readString(tag = Ber.OctetString, asBuffer = false) {
    const currentTag = this.peek();
    if (currentTag === null) {
      return null;
    }
    if (currentTag !== tag) {
      throw new InvalidAsn1Error(`Expected 0x${tag.toString(16)}: got 0x${currentTag.toString(16)}`);
    }
    const newOffset = this.readLength(this.currentOffset + 1);
    if (newOffset === null) {
      return null;
    }
    if (this.currentLength > this.size - newOffset) {
      return null;
    }
    this.currentOffset = newOffset;
    if (this.currentLength === 0) {
      return asBuffer ? Buffer.alloc(0) : "";
    }
    const value = this.buffer.subarray(this.currentOffset, this.currentOffset + this.currentLength);
    this.currentOffset += this.currentLength;
    return asBuffer ? value : value.toString("utf8");
  }
  readOID(tag = Ber.OID) {
    const data = this.readString(tag, true);
    if (data === null) {
      return null;
    }
    const values = [];
    let value = 0;
    for (const byte of data) {
      value = (value << 7) + (byte & 127);
      if ((byte & 128) === 0) {
        values.push(value);
        value = 0;
      }
    }
    const firstValue = values[0] ?? 0;
    return [Math.trunc(firstValue / 40), firstValue % 40, ...values.slice(1)].join(".");
  }
  readTag(tag) {
    const currentTag = this.peek();
    if (currentTag === null) {
      return null;
    }
    if (currentTag !== tag) {
      throw new InvalidAsn1Error(`Expected 0x${tag.toString(16)}: got 0x${currentTag.toString(16)}`);
    }
    const newOffset = this.readLength(this.currentOffset + 1);
    if (newOffset === null) {
      return null;
    }
    if (this.currentLength > 4) {
      throw new InvalidAsn1Error(`Integer too long: ${this.currentLength}`);
    }
    if (this.currentLength > this.size - newOffset) {
      return null;
    }
    this.currentOffset = newOffset;
    const firstByte = this.buffer.readUInt8(this.currentOffset);
    let value = 0;
    for (let i = 0; i < this.currentLength; i++) {
      value = value << 8 | this.buffer.readUInt8(this.currentOffset);
      this.currentOffset += 1;
    }
    if ((firstByte & 128) === 128 && this.currentLength < 4) {
      value -= 1 << this.currentLength * 8;
    }
    return value >> 0;
  }
}

class BerWriter {
  data;
  size;
  currentOffset = 0;
  growthFactor;
  sequenceOffsets = [];
  constructor(options = {}) {
    const initialSize = options.size ?? 1024;
    this.growthFactor = options.growthFactor ?? 8;
    this.data = Buffer.alloc(initialSize);
    this.size = initialSize;
  }
  get buffer() {
    if (this.sequenceOffsets.length > 0) {
      throw new InvalidAsn1Error(`${this.sequenceOffsets.length} unended sequence(s)`);
    }
    return this.data.subarray(0, this.currentOffset);
  }
  writeByte(value) {
    this.ensureCapacity(1);
    this.data[this.currentOffset++] = value;
  }
  writeInt(value, tag = Ber.Integer) {
    let intValue = value;
    let byteCount = 4;
    while (((intValue & 4286578688) === 0 || (intValue & 4286578688) === 4286578688 >> 0) && byteCount > 1) {
      byteCount--;
      intValue <<= 8;
    }
    if (byteCount > 4) {
      throw new InvalidAsn1Error("BER integers cannot be > 0xffffffff");
    }
    this.ensureCapacity(2 + byteCount);
    this.data[this.currentOffset++] = tag;
    this.data[this.currentOffset++] = byteCount;
    while (byteCount > 0) {
      byteCount--;
      this.data[this.currentOffset++] = (intValue & 4278190080) >>> 24;
      intValue <<= 8;
    }
  }
  writeNull() {
    this.writeByte(Ber.Null);
    this.writeByte(0);
  }
  writeEnumeration(value, tag = Ber.Enumeration) {
    this.writeInt(value, tag);
  }
  writeBoolean(value, tag = Ber.Boolean) {
    this.ensureCapacity(3);
    this.data[this.currentOffset++] = tag;
    this.data[this.currentOffset++] = 1;
    this.data[this.currentOffset++] = value ? 255 : 0;
  }
  writeString(value, tag = Ber.OctetString) {
    const byteLength = Buffer.byteLength(value);
    this.writeByte(tag);
    this.writeLength(byteLength);
    if (byteLength > 0) {
      this.ensureCapacity(byteLength);
      this.data.write(value, this.currentOffset);
      this.currentOffset += byteLength;
    }
  }
  writeBuffer(value, tag) {
    this.writeByte(tag);
    this.writeLength(value.length);
    this.ensureCapacity(value.length);
    value.copy(this.data, this.currentOffset, 0, value.length);
    this.currentOffset += value.length;
  }
  writeStringArray(values) {
    for (const value of values) {
      this.writeString(value);
    }
  }
  writeOID(value, tag = Ber.OID) {
    if (!/^(\d+\.){3,}\d+$/.test(value)) {
      throw new Error("Argument is not a valid OID string");
    }
    const parts = value.split(".");
    const bytes = [];
    const firstPart = parts[0] ?? "0";
    const secondPart = parts[1] ?? "0";
    bytes.push(Number(firstPart) * 40 + Number(secondPart));
    for (const part of parts.slice(2)) {
      this.encodeOidOctet(bytes, Number(part));
    }
    this.ensureCapacity(2 + bytes.length);
    this.writeByte(tag);
    this.writeLength(bytes.length);
    for (const byte of bytes) {
      this.writeByte(byte);
    }
  }
  writeLength(length) {
    this.ensureCapacity(4);
    if (length <= 127) {
      this.data[this.currentOffset++] = length;
    } else if (length <= 255) {
      this.data[this.currentOffset++] = 129;
      this.data[this.currentOffset++] = length;
    } else if (length <= 65535) {
      this.data[this.currentOffset++] = 130;
      this.data[this.currentOffset++] = length >> 8;
      this.data[this.currentOffset++] = length;
    } else if (length <= 16777215) {
      this.data[this.currentOffset++] = 131;
      this.data[this.currentOffset++] = length >> 16;
      this.data[this.currentOffset++] = length >> 8;
      this.data[this.currentOffset++] = length;
    } else {
      throw new InvalidAsn1Error("Length too long (> 4 bytes)");
    }
  }
  startSequence(tag = Ber.Sequence | Ber.Constructor) {
    this.writeByte(tag);
    this.sequenceOffsets.push(this.currentOffset);
    this.ensureCapacity(3);
    this.currentOffset += 3;
  }
  endSequence() {
    const sequenceStart = this.sequenceOffsets.pop();
    if (sequenceStart === void 0) {
      throw new InvalidAsn1Error("No sequence to end");
    }
    const contentStart = sequenceStart + 3;
    const contentLength = this.currentOffset - contentStart;
    if (contentLength <= 127) {
      this.shiftContent(contentStart, contentLength, -2);
      this.data[sequenceStart] = contentLength;
    } else if (contentLength <= 255) {
      this.shiftContent(contentStart, contentLength, -1);
      this.data[sequenceStart] = 129;
      this.data[sequenceStart + 1] = contentLength;
    } else if (contentLength <= 65535) {
      this.data[sequenceStart] = 130;
      this.data[sequenceStart + 1] = contentLength >> 8;
      this.data[sequenceStart + 2] = contentLength;
    } else if (contentLength <= 16777215) {
      this.shiftContent(contentStart, contentLength, 1);
      this.data[sequenceStart] = 131;
      this.data[sequenceStart + 1] = contentLength >> 16;
      this.data[sequenceStart + 2] = contentLength >> 8;
      this.data[sequenceStart + 3] = contentLength;
    } else {
      throw new InvalidAsn1Error("Sequence too long");
    }
  }
  encodeOidOctet(bytes, octet) {
    if (octet < 128) {
      bytes.push(octet);
    } else if (octet < 16384) {
      bytes.push(octet >>> 7 | 128);
      bytes.push(octet & 127);
    } else if (octet < 2097152) {
      bytes.push(octet >>> 14 | 128);
      bytes.push((octet >>> 7 | 128) & 255);
      bytes.push(octet & 127);
    } else if (octet < 268435456) {
      bytes.push(octet >>> 21 | 128);
      bytes.push((octet >>> 14 | 128) & 255);
      bytes.push((octet >>> 7 | 128) & 255);
      bytes.push(octet & 127);
    } else {
      bytes.push((octet >>> 28 | 128) & 255);
      bytes.push((octet >>> 21 | 128) & 255);
      bytes.push((octet >>> 14 | 128) & 255);
      bytes.push((octet >>> 7 | 128) & 255);
      bytes.push(octet & 127);
    }
  }
  shiftContent(start, length, shift) {
    this.data.copy(this.data, start + shift, start, start + length);
    this.currentOffset += shift;
  }
  ensureCapacity(needed) {
    if (this.size - this.currentOffset < needed) {
      let newSize = this.size * this.growthFactor;
      if (newSize - this.currentOffset < needed) {
        newSize += needed;
      }
      const newBuffer = Buffer.alloc(newSize);
      this.data.copy(newBuffer, 0, 0, this.currentOffset);
      this.data = newBuffer;
      this.size = newSize;
    }
  }
}

class Control {
  type;
  critical;
  constructor(type, options = {}) {
    this.type = type;
    this.critical = options.critical === true;
  }
  write(writer) {
    writer.startSequence();
    writer.writeString(this.type);
    writer.writeBoolean(this.critical);
    this.writeControl(writer);
    writer.endSequence();
  }
  parse(reader) {
    this.parseControl(reader);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  writeControl(_) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parseControl(_) {
  }
}

class EntryChangeNotificationControl extends Control {
  static type = "2.16.840.1.113730.3.4.7";
  value;
  constructor(options = {}) {
    super(EntryChangeNotificationControl.type, options);
    this.value = options.value;
  }
  parseControl(reader) {
    if (reader.readSequence()) {
      const changeType = reader.readInt() ?? 0;
      let previousDN;
      if (changeType === 8) {
        previousDN = reader.readString();
      }
      const changeNumber = reader.readInt() ?? 0;
      this.value = {
        changeType,
        previousDN,
        changeNumber
      };
    }
  }
  writeControl(writer) {
    if (!this.value) {
      return;
    }
    const controlWriter = new BerWriter();
    controlWriter.startSequence();
    controlWriter.writeInt(this.value.changeType);
    if (this.value.previousDN) {
      controlWriter.writeString(this.value.previousDN);
    }
    controlWriter.writeInt(this.value.changeNumber);
    controlWriter.endSequence();
    writer.writeBuffer(controlWriter.buffer, 4);
  }
}

class PagedResultsControl extends Control {
  static type = "1.2.840.113556.1.4.319";
  value;
  constructor(options = {}) {
    super(PagedResultsControl.type, options);
    this.value = options.value;
  }
  parseControl(reader) {
    if (reader.readSequence()) {
      const size = reader.readInt() ?? 0;
      const cookie = reader.readString(Ber.OctetString, true) ?? Buffer.alloc(0);
      this.value = {
        size,
        cookie
      };
    }
  }
  writeControl(writer) {
    if (!this.value) {
      return;
    }
    const controlWriter = new BerWriter();
    controlWriter.startSequence();
    controlWriter.writeInt(this.value.size);
    if (this.value.cookie?.length) {
      controlWriter.writeBuffer(this.value.cookie, Ber.OctetString);
    } else {
      controlWriter.writeString("");
    }
    controlWriter.endSequence();
    writer.writeBuffer(controlWriter.buffer, 4);
  }
}

class PersistentSearchControl extends Control {
  static type = "2.16.840.1.113730.3.4.3";
  value;
  constructor(options = {}) {
    super(PersistentSearchControl.type, options);
    this.value = options.value;
  }
  parseControl(reader) {
    if (reader.readSequence()) {
      const changeTypes = reader.readInt() ?? 0;
      const changesOnly = reader.readBoolean() ?? false;
      const returnECs = reader.readBoolean() ?? false;
      this.value = {
        changeTypes,
        changesOnly,
        returnECs
      };
    }
  }
  writeControl(writer) {
    if (!this.value) {
      return;
    }
    const controlWriter = new BerWriter();
    controlWriter.startSequence();
    controlWriter.writeInt(this.value.changeTypes);
    controlWriter.writeBoolean(this.value.changesOnly);
    controlWriter.writeBoolean(this.value.returnECs);
    controlWriter.endSequence();
    writer.writeBuffer(controlWriter.buffer, 4);
  }
}

class ServerSideSortingRequestControl extends Control {
  static type = "1.2.840.113556.1.4.473";
  values;
  constructor(options = {}) {
    super(ServerSideSortingRequestControl.type, options);
    if (Array.isArray(options.value)) {
      this.values = options.value;
    } else if (typeof options.value === "object") {
      this.values = [options.value];
    } else {
      this.values = [];
    }
  }
  parseControl(reader) {
    if (reader.readSequence(48)) {
      while (reader.readSequence(48)) {
        const attributeType = reader.readString() ?? "";
        let orderingRule = "";
        let reverseOrder = false;
        if (reader.peek() === 128) {
          orderingRule = reader.readString(128) ?? "";
        }
        if (reader.peek() === 129) {
          reverseOrder = reader.readTag(129) !== 0;
        }
        this.values.push({
          attributeType,
          orderingRule,
          reverseOrder
        });
      }
    }
  }
  writeControl(writer) {
    if (!this.values.length) {
      return;
    }
    const controlWriter = new BerWriter();
    controlWriter.startSequence(48);
    for (const value of this.values) {
      controlWriter.startSequence(48);
      controlWriter.writeString(value.attributeType, Ber.OctetString);
      if (value.orderingRule) {
        controlWriter.writeString(value.orderingRule, 128);
      }
      if (typeof value.reverseOrder !== "undefined") {
        controlWriter.writeBoolean(value.reverseOrder, 129);
      }
      controlWriter.endSequence();
    }
    controlWriter.endSequence();
    writer.writeBuffer(controlWriter.buffer, 4);
  }
}

class RDN {
  attrs = {};
  constructor(attrs) {
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        this.set(key, value);
      }
    }
  }
  /**
   * Set an RDN pair.
   * @param {string} name
   * @param {string} value
   * @returns {object} RDN class
   */
  set(name, value) {
    this.attrs[name] = value;
    return this;
  }
  /**
   * Get an RDN value at the specified name.
   * @param {string} name
   * @returns {string | undefined} value
   */
  get(name) {
    return this.attrs[name];
  }
  /**
   * Checks, if this instance of RDN is equal to the other RDN.
   * @param {object} other
   * @returns true if equal; otherwise false
   */
  equals(other) {
    const ourKeys = Object.keys(this.attrs);
    const otherKeys = Object.keys(other.attrs);
    if (ourKeys.length !== otherKeys.length) {
      return false;
    }
    ourKeys.sort();
    otherKeys.sort();
    for (const [i, key] of ourKeys.entries()) {
      if (key == null || key !== otherKeys[i]) {
        return false;
      }
      const ourValue = this.attrs[key];
      const otherValue = other.attrs[key];
      if (ourValue == null && otherValue == null) {
        continue;
      }
      if (ourValue == null || otherValue == null || ourValue !== otherValue) {
        return false;
      }
    }
    return true;
  }
  /**
   * Parse the RDN, escape values & return a string representation.
   * @returns {string} Escaped string representation of RDN.
   */
  toString() {
    let str = "";
    for (const [key, value] of Object.entries(this.attrs)) {
      if (str) {
        str += "+";
      }
      str += `${key}=${this._escape(value)}`;
    }
    return str;
  }
  /**
   * Escape values & return a string representation.
   *
   * RFC defines, that these characters should be escaped:
   *
   * Comma                          ,
   * Backslash character            \
   * Pound sign (hash sign)         #
   * Plus sign                      +
   * Less than symbol               <
   * Greater than symbol            >
   * Semicolon                      ;
   * Double quote (quotation mark)  "
   * Equal sign                     =
   * Leading or trailing spaces
   * @param {string} value - RDN value to be escaped
   * @returns {string} Escaped string representation of RDN
   */
  _escape(value = "") {
    let str = "";
    let current = 0;
    let quoted = false;
    const len = value.length;
    const escaped = /["\\]/;
    const special = /[#+,;<=>]/;
    if (len > 0) {
      quoted = value.startsWith(" ") || value[len - 1] === " ";
    }
    while (current < len) {
      const character = value[current] ?? "";
      if (escaped.test(character) || !quoted && special.test(character)) {
        str += "\\";
      }
      if (character) {
        str += character;
      }
      current += 1;
    }
    if (quoted) {
      str = `"${str}"`;
    }
    return str;
  }
}

class DN {
  rdns = [];
  constructor(rdns) {
    if (rdns) {
      if (Array.isArray(rdns)) {
        this.rdns = rdns;
      } else {
        this.addRDNs(rdns);
      }
    }
  }
  /**
   * Add an RDN component to the DN, consisting of key & value pair.
   * @param {string} key
   * @param {string} value
   * @returns {object} DN
   */
  addPairRDN(key, value) {
    this.rdns.push(new RDN({ [key]: value }));
    return this;
  }
  /**
   * Add a single RDN component to the DN.
   *
   * Note, that this RDN can be compound (single RDN can have multiple key & value pairs).
   * @param {object} rdn
   * @returns {object} DN
   */
  addRDN(rdn) {
    if (rdn instanceof RDN) {
      this.rdns.push(rdn);
    } else {
      this.rdns.push(new RDN(rdn));
    }
    return this;
  }
  /**
   * Add multiple RDN components to the DN.
   *
   * This method allows different interfaces to add RDNs into the DN.
   * It can:
   * - join other DN into this DN
   * - join list of RDNs or RDNAttributes into this DN
   * - create RDNs from object map, where every key & value will create a new RDN
   * @param {object|object[]} rdns
   * @returns {object} DN
   */
  addRDNs(rdns) {
    if (rdns instanceof DN) {
      this.rdns.push(...rdns.rdns);
    } else if (Array.isArray(rdns)) {
      for (const rdn of rdns) {
        this.addRDN(rdn);
      }
    } else {
      for (const [name, value] of Object.entries(rdns)) {
        if (Array.isArray(value)) {
          for (const rdnValue of value) {
            this.rdns.push(
              new RDN({
                [name]: rdnValue
              })
            );
          }
        } else {
          this.rdns.push(
            new RDN({
              [name]: value
            })
          );
        }
      }
    }
    return this;
  }
  getRDNs() {
    return this.rdns;
  }
  get(index) {
    return this.rdns[index];
  }
  set(rdn, index) {
    if (rdn instanceof RDN) {
      this.rdns[index] = rdn;
    } else {
      this.rdns[index] = new RDN(rdn);
    }
    return this;
  }
  isEmpty() {
    return !this.rdns.length;
  }
  /**
   * Checks, if this instance of DN is equal to the other DN.
   * @param {object} other
   * @returns true if equal; otherwise false
   */
  equals(other) {
    if (this.rdns.length !== other.rdns.length) {
      return false;
    }
    for (let i = 0; i < this.rdns.length; i += 1) {
      const rdn = this.rdns[i];
      const otherRdn = other.rdns[i];
      if (rdn == null && otherRdn == null) {
        continue;
      }
      if (rdn == null || otherRdn == null || !rdn.equals(otherRdn)) {
        return false;
      }
    }
    return true;
  }
  clone() {
    return new DN([...this.rdns]);
  }
  reverse() {
    this.rdns.reverse();
    return this;
  }
  pop() {
    return this.rdns.pop();
  }
  shift() {
    return this.rdns.shift();
  }
  /**
   * Parse the DN, escape values & return a string representation.
   * @returns String representation of DN
   */
  toString() {
    let str = "";
    for (const rdn of this.rdns) {
      if (str.length) {
        str += ",";
      }
      str += rdn.toString();
    }
    return str;
  }
}

class MessageParserError extends Error {
  messageDetails;
  constructor(message) {
    super(message);
    this.name = "MessageParserError";
    Object.setPrototypeOf(this, MessageParserError.prototype);
  }
}

class ResultCodeError extends Error {
  code;
  constructor(code, message) {
    super(`${message} Code: 0x${code.toString(16)}`);
    this.name = "ResultCodeError";
    this.code = code;
    Object.setPrototypeOf(this, ResultCodeError.prototype);
  }
}

class AdminLimitExceededError extends ResultCodeError {
  constructor(message) {
    super(11, message ?? "An LDAP server limit set by an administrative authority has been exceeded.");
    this.name = "AdminLimitExceededError";
    Object.setPrototypeOf(this, AdminLimitExceededError.prototype);
  }
}

class AffectsMultipleDSAsError extends ResultCodeError {
  constructor(message) {
    super(71, message ?? "The modify DN operation moves the entry from one LDAP server to another and thus requires more than one LDAP server.");
    this.name = "AffectsMultipleDSAsError";
    Object.setPrototypeOf(this, AffectsMultipleDSAsError.prototype);
  }
}

class AliasDerefProblemError extends ResultCodeError {
  constructor(message) {
    super(36, message ?? "Either the client does not have access rights to read the aliased object's name or dereferencing is not allowed.");
    this.name = "AliasDerefProblemError";
    Object.setPrototypeOf(this, AliasDerefProblemError.prototype);
  }
}

class AliasProblemError extends ResultCodeError {
  constructor(message) {
    super(33, message ?? "An error occurred when an alias was dereferenced.");
    this.name = "AliasProblemError";
    Object.setPrototypeOf(this, AliasProblemError.prototype);
  }
}

class AlreadyExistsError extends ResultCodeError {
  constructor(message) {
    super(68, message ?? "The add operation attempted to add an entry that already exists, or that the modify operation attempted to rename an entry to the name of an entry that already exists.");
    this.name = "AlreadyExistsError";
    Object.setPrototypeOf(this, AlreadyExistsError.prototype);
  }
}

class AuthMethodNotSupportedError extends ResultCodeError {
  constructor(message) {
    super(7, message ?? "The Directory Server does not support the requested Authentication Method.");
    this.name = "AuthMethodNotSupportedError";
    Object.setPrototypeOf(this, AuthMethodNotSupportedError.prototype);
  }
}

class BusyError extends ResultCodeError {
  constructor(message) {
    super(51, message ?? "The LDAP server is too busy to process the client request at this time.");
    this.name = "BusyError";
    Object.setPrototypeOf(this, BusyError.prototype);
  }
}

class ConfidentialityRequiredError extends ResultCodeError {
  constructor(message) {
    super(
      13,
      message ?? "The session is not protected by a protocol such as Transport Layer Security (TLS), which provides session confidentiality and the request will not be handled without confidentiality enabled."
    );
    this.name = "ConfidentialityRequiredError";
    Object.setPrototypeOf(this, ConfidentialityRequiredError.prototype);
  }
}

class ConstraintViolationError extends ResultCodeError {
  constructor(message) {
    super(
      19,
      message ?? "The attribute value specified in a Add Request, Modify Request or ModifyDNRequest operation violates constraints placed on the attribute. The constraint can be one of size or content (string only, no binary)."
    );
    this.name = "ConstraintViolationError";
    Object.setPrototypeOf(this, ConstraintViolationError.prototype);
  }
}

class InappropriateAuthError extends ResultCodeError {
  constructor(message) {
    super(48, message ?? "The client is attempting to use an authentication method incorrectly.");
    this.name = "InappropriateAuthError";
    Object.setPrototypeOf(this, InappropriateAuthError.prototype);
  }
}

class InappropriateMatchingError extends ResultCodeError {
  constructor(message) {
    super(18, message ?? "The matching rule specified in the search filter does not match a rule defined for the attribute's syntax.");
    this.name = "InappropriateMatchingError";
    Object.setPrototypeOf(this, InappropriateMatchingError.prototype);
  }
}

class InsufficientAccessError extends ResultCodeError {
  constructor(message) {
    super(50, message ?? "The caller does not have sufficient rights to perform the requested operation.");
    this.name = "InsufficientAccessError";
    Object.setPrototypeOf(this, InsufficientAccessError.prototype);
  }
}

class InvalidCredentialsError extends ResultCodeError {
  constructor(message) {
    super(49, message ?? "Invalid credentials during a bind operation.");
    this.name = "InvalidCredentialsError";
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

class InvalidDNSyntaxError extends ResultCodeError {
  constructor(message) {
    super(34, message ?? "The syntax of the DN is incorrect.");
    this.name = "InvalidDNSyntaxError";
    Object.setPrototypeOf(this, InvalidDNSyntaxError.prototype);
  }
}

class InvalidSyntaxError extends ResultCodeError {
  constructor(message) {
    super(21, message ?? "The attribute value specified in an Add Request, Compare Request, or Modify Request operation is an unrecognized or invalid syntax for the attribute.");
    this.name = "InvalidSyntaxError";
    Object.setPrototypeOf(this, InvalidSyntaxError.prototype);
  }
}

class IsLeafError extends ResultCodeError {
  constructor(message) {
    super(35, message ?? "The specified operation cannot be performed on a leaf entry.");
    this.name = "IsLeafError";
    Object.setPrototypeOf(this, IsLeafError.prototype);
  }
}

class LoopDetectError extends ResultCodeError {
  constructor(message) {
    super(54, message ?? "The client discovered an alias or LDAP Referral loop, and is thus unable to complete this request.");
    this.name = "LoopDetectError";
    Object.setPrototypeOf(this, LoopDetectError.prototype);
  }
}

class MoreResultsToReturnError extends ResultCodeError {
  constructor(message) {
    super(95, message);
    this.name = "MoreResultsToReturnError";
    Object.setPrototypeOf(this, MoreResultsToReturnError.prototype);
  }
}

class NamingViolationError extends ResultCodeError {
  constructor(message) {
    super(64, message ?? "The Add Request or Modify DN Request operation violates the schema's structure rules.");
    this.name = "NamingViolationError";
    Object.setPrototypeOf(this, NamingViolationError.prototype);
  }
}

class NoObjectClassModsError extends ResultCodeError {
  constructor(message) {
    super(69, message ?? "The modify operation attempted to modify the structure rules of an object class.");
    this.name = "NoObjectClassModsError";
    Object.setPrototypeOf(this, NoObjectClassModsError.prototype);
  }
}

class NoSuchAttributeError extends ResultCodeError {
  constructor(message) {
    super(16, message ?? "The attribute specified in the Modify Request or Compare Request operation does not exist in the entry.");
    this.name = "NoSuchAttributeError";
    Object.setPrototypeOf(this, NoSuchAttributeError.prototype);
  }
}

class NoSuchObjectError extends ResultCodeError {
  constructor(message) {
    super(32, message ?? "The target object cannot be found.");
    this.name = "NoSuchObjectError";
    Object.setPrototypeOf(this, NoSuchObjectError.prototype);
  }
}

class NotAllowedOnNonLeafError extends ResultCodeError {
  constructor(message) {
    super(66, message ?? "The requested operation is permitted only on leaf entries.");
    this.name = "NotAllowedOnNonLeafError";
    Object.setPrototypeOf(this, NotAllowedOnNonLeafError.prototype);
  }
}

class NotAllowedOnRDNError extends ResultCodeError {
  constructor(message) {
    super(67, message ?? "The modify operation attempted to remove an attribute value that forms the entry's relative distinguished name.");
    this.name = "NotAllowedOnRDNError";
    Object.setPrototypeOf(this, NotAllowedOnRDNError.prototype);
  }
}

class NoResultError extends ResultCodeError {
  constructor(message) {
    super(248, message ?? "No result message for the request.");
    this.name = "NoResultError";
    Object.setPrototypeOf(this, NoResultError.prototype);
  }
}

class ObjectClassViolationError extends ResultCodeError {
  constructor(message) {
    super(65, message ?? "The Add Request, Modify Request, or modify DN operation violates the object class rules for the entry.");
    this.name = "ObjectClassViolationError";
    Object.setPrototypeOf(this, ObjectClassViolationError.prototype);
  }
}

class OperationsError extends ResultCodeError {
  constructor(message) {
    super(1, message ?? "Request was out of sequence with another operation in progress.");
    this.name = "OperationsError";
    Object.setPrototypeOf(this, OperationsError.prototype);
  }
}

class ProtocolError extends ResultCodeError {
  constructor(message) {
    super(2, message ?? "Client sent data to the server that did not comprise a valid LDAP request.");
    this.name = "ProtocolError";
    Object.setPrototypeOf(this, ProtocolError.prototype);
  }
}

class ResultsTooLargeError extends ResultCodeError {
  constructor(message) {
    super(70, message ?? "Results are too large.");
    this.name = "ResultsTooLargeError";
    Object.setPrototypeOf(this, ResultsTooLargeError.prototype);
  }
}

class SaslBindInProgressError extends ResultCodeError {
  response;
  constructor(response) {
    super(14, response.errorMessage || "The server is ready for the next step in the SASL authentication process. The client must send the server the same SASL Mechanism to continue the process.");
    this.response = response;
    this.name = "SaslBindInProgressError";
    Object.setPrototypeOf(this, SaslBindInProgressError.prototype);
  }
}

class SizeLimitExceededError extends ResultCodeError {
  constructor(message) {
    super(4, message ?? "There were more entries matching the criteria contained in a SearchRequest operation than were allowed to be returned by the size limit configuration.");
    this.name = "SizeLimitExceededError";
    Object.setPrototypeOf(this, SizeLimitExceededError.prototype);
  }
}

class StrongAuthRequiredError extends ResultCodeError {
  constructor(message) {
    super(8, message ?? "Client requested an operation that requires strong authentication.");
    this.name = "StrongAuthRequiredError";
    Object.setPrototypeOf(this, StrongAuthRequiredError.prototype);
  }
}

class TimeLimitExceededError extends ResultCodeError {
  constructor(message) {
    super(
      3,
      message ?? "Processing on the associated request Timeout limit specified by either the client request or the server administration limits has been exceeded and has been terminated because it took too long to complete."
    );
    this.name = "TimeLimitExceededError";
    Object.setPrototypeOf(this, TimeLimitExceededError.prototype);
  }
}

class TLSNotSupportedError extends ResultCodeError {
  constructor(message) {
    super(112, message ?? "TLS is not supported on the server.");
    this.name = "TLSNotSupportedError";
    Object.setPrototypeOf(this, TLSNotSupportedError.prototype);
  }
}

class TypeOrValueExistsError extends ResultCodeError {
  constructor(message) {
    super(20, message ?? "The attribute value specified in a Add Request or Modify Request operation already exists as a value for that attribute.");
    this.name = "TypeOrValueExistsError";
    Object.setPrototypeOf(this, TypeOrValueExistsError.prototype);
  }
}

class UnavailableCriticalExtensionError extends ResultCodeError {
  constructor(message) {
    super(
      12,
      message ?? "One or more critical extensions were not available by the LDAP server. Either the server does not support the control or the control is not appropriate for the operation type."
    );
    this.name = "UnavailableCriticalExtensionError";
    Object.setPrototypeOf(this, UnavailableCriticalExtensionError.prototype);
  }
}

class UnavailableError extends ResultCodeError {
  constructor(message) {
    super(52, message ?? "The LDAP server cannot process the client's bind request.");
    this.name = "UnavailableError";
    Object.setPrototypeOf(this, UnavailableError.prototype);
  }
}

class UndefinedTypeError extends ResultCodeError {
  constructor(message) {
    super(17, message ?? "The attribute specified in the modify or add operation does not exist in the LDAP server's schema.");
    this.name = "UndefinedTypeError";
    Object.setPrototypeOf(this, UndefinedTypeError.prototype);
  }
}

class UnknownStatusCodeError extends ResultCodeError {
  constructor(code, message) {
    super(code, message ?? "Unknown error.");
    this.name = "UnknownStatusCodeError";
    Object.setPrototypeOf(this, UnknownStatusCodeError.prototype);
  }
}

class UnwillingToPerformError extends ResultCodeError {
  constructor(message) {
    super(53, message ?? "The LDAP server cannot process the request because of server-defined restrictions.");
    this.name = "UnwillingToPerformError";
    Object.setPrototypeOf(this, UnwillingToPerformError.prototype);
  }
}

class Filter {
  write(writer) {
    writer.startSequence(this.type);
    this.writeFilter(writer);
    writer.endSequence();
  }
  parse(reader) {
    this.parseFilter(reader);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  matches(_ = {}, __) {
    return true;
  }
  /**
   * RFC 2254 Escaping of filter strings
   * Raw                     Escaped
   * (o=Parens (R Us))       (o=Parens \28R Us\29)
   * (cn=star*)              (cn=star\2A)
   * (filename=C:\MyFile)    (filename=C:\5cMyFile)
   * @param {string|Buffer} input
   * @returns Escaped string
   */
  escape(input) {
    let escapedResult = "";
    if (Buffer.isBuffer(input)) {
      for (const inputChar of input) {
        if (inputChar < 16) {
          escapedResult += `\\0${inputChar.toString(16)}`;
        } else {
          escapedResult += `\\${inputChar.toString(16)}`;
        }
      }
    } else {
      for (const inputChar of input) {
        switch (inputChar) {
          case "*":
            escapedResult += "\\2a";
            break;
          case "(":
            escapedResult += "\\28";
            break;
          case ")":
            escapedResult += "\\29";
            break;
          case "\\":
            escapedResult += "\\5c";
            break;
          case "\0":
            escapedResult += "\\00";
            break;
          default:
            escapedResult += inputChar;
            break;
        }
      }
    }
    return escapedResult;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parseFilter(_) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  writeFilter(_) {
  }
  getObjectValue(objectToCheck, key, strictAttributeCase) {
    let objectKey;
    if (typeof objectToCheck[key] !== "undefined") {
      objectKey = key;
    } else if (!strictAttributeCase && key.toLowerCase() === "objectclass") {
      for (const objectToCheckKey of Object.keys(objectToCheck)) {
        if (objectToCheckKey.toLowerCase() === key.toLowerCase()) {
          objectKey = objectToCheckKey;
          break;
        }
      }
    }
    if (objectKey) {
      return objectToCheck[objectKey];
    }
    return void 0;
  }
}

const SearchFilter = {
  and: 160,
  or: 161,
  not: 162,
  equalityMatch: 163,
  substrings: 164,
  greaterOrEqual: 165,
  lessOrEqual: 166,
  present: 135,
  approxMatch: 168,
  extensibleMatch: 169
};

class AndFilter extends Filter {
  type = SearchFilter.and;
  filters;
  constructor(options) {
    super();
    this.filters = options.filters;
  }
  writeFilter(writer) {
    for (const filter of this.filters) {
      filter.write(writer);
    }
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    if (!this.filters.length) {
      return true;
    }
    for (const filter of this.filters) {
      if (!filter.matches(objectToCheck, strictAttributeCase)) {
        return false;
      }
    }
    return true;
  }
  toString() {
    let result = "(&";
    for (const filter of this.filters) {
      result += filter.toString();
    }
    result += ")";
    return result;
  }
}

class ApproximateFilter extends Filter {
  type = SearchFilter.approxMatch;
  attribute;
  value;
  constructor(options = {}) {
    super();
    this.attribute = options.attribute ?? "";
    this.value = options.value ?? "";
  }
  parseFilter(reader) {
    this.attribute = (reader.readString() ?? "").toLowerCase();
    this.value = reader.readString() ?? "";
  }
  writeFilter(writer) {
    writer.writeString(this.attribute);
    writer.writeString(this.value);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  matches(_ = {}, __) {
    throw new Error("Approximate match implementation unknown");
  }
  toString() {
    return `(${this.escape(this.attribute)}~=${this.escape(this.value)})`;
  }
}

class EqualityFilter extends Filter {
  type = SearchFilter.equalityMatch;
  attribute;
  value;
  constructor(options = {}) {
    super();
    this.attribute = options.attribute ?? "";
    this.value = options.value ?? "";
  }
  parseFilter(reader) {
    this.attribute = (reader.readString() ?? "").toLowerCase();
    this.value = reader.readString() ?? "";
    if (this.attribute === "objectclass") {
      this.value = this.value.toLowerCase();
    }
  }
  writeFilter(writer) {
    writer.writeString(this.attribute);
    if (Buffer.isBuffer(this.value)) {
      writer.writeBuffer(this.value, Ber.OctetString);
    } else {
      writer.writeString(this.value);
    }
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
    if (typeof objectToCheckValue !== "undefined") {
      if (Buffer.isBuffer(this.value) && Buffer.isBuffer(objectToCheckValue)) {
        return this.value === objectToCheckValue;
      }
      const stringValue = Buffer.isBuffer(this.value) ? this.value.toString("utf8") : this.value;
      if (strictAttributeCase) {
        return stringValue === objectToCheckValue;
      }
      return stringValue.toLowerCase() === objectToCheckValue.toLowerCase();
    }
    return false;
  }
  toString() {
    return `(${this.escape(this.attribute)}=${this.escape(this.value)})`;
  }
}

class ExtensibleFilter extends Filter {
  type = SearchFilter.extensibleMatch;
  value;
  rule;
  matchType;
  dnAttributes;
  constructor(options = {}) {
    super();
    this.matchType = options.matchType ?? "";
    this.rule = options.rule ?? "";
    this.dnAttributes = options.dnAttributes === true;
    this.value = options.value ?? "";
  }
  parseFilter(reader) {
    const end = reader.offset + reader.length;
    while (reader.offset < end) {
      const tag = reader.peek();
      switch (tag) {
        case 129:
          this.rule = reader.readString(tag) ?? "";
          break;
        case 130:
          this.matchType = reader.readString(tag) ?? "";
          break;
        case 131:
          this.value = reader.readString(tag) ?? "";
          break;
        case 132:
          this.dnAttributes = reader.readBoolean() ?? false;
          break;
        default: {
          let type = "<null>";
          if (tag) {
            type = `0x${tag.toString(16)}`;
          }
          throw new Error(`Invalid ext_match filter type: ${type}`);
        }
      }
    }
  }
  writeFilter(writer) {
    if (this.rule) {
      writer.writeString(this.rule, 129);
    }
    if (this.matchType) {
      writer.writeString(this.matchType, 130);
    }
    writer.writeString(this.value, 131);
    if (this.dnAttributes) {
      writer.writeBoolean(this.dnAttributes, 132);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  matches(_ = {}, __) {
    throw new Error("Approximate match implementation unknown");
  }
  toString() {
    let result = `(${this.escape(this.matchType)}:`;
    if (this.dnAttributes) {
      result += "dn:";
    }
    if (this.rule) {
      result += `${this.escape(this.rule)}:`;
    }
    result += `=${this.escape(this.value)})`;
    return result;
  }
}

class GreaterThanEqualsFilter extends Filter {
  type = SearchFilter.greaterOrEqual;
  attribute;
  value;
  constructor(options = {}) {
    super();
    this.attribute = options.attribute ?? "";
    this.value = options.value ?? "";
  }
  parseFilter(reader) {
    this.attribute = reader.readString()?.toLowerCase() ?? "";
    this.value = reader.readString() ?? "";
  }
  writeFilter(writer) {
    writer.writeString(this.attribute);
    writer.writeString(this.value);
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
    if (typeof objectToCheckValue !== "undefined") {
      if (strictAttributeCase) {
        return objectToCheckValue >= this.value;
      }
      return objectToCheckValue.toLowerCase() >= this.value.toLowerCase();
    }
    return false;
  }
  toString() {
    return `(${this.escape(this.attribute)}>=${this.escape(this.value)})`;
  }
}

class LessThanEqualsFilter extends Filter {
  type = SearchFilter.lessOrEqual;
  attribute;
  value;
  constructor(options = {}) {
    super();
    this.attribute = options.attribute ?? "";
    this.value = options.value ?? "";
  }
  parseFilter(reader) {
    this.attribute = reader.readString()?.toLowerCase() ?? "";
    this.value = reader.readString() ?? "";
  }
  writeFilter(writer) {
    writer.writeString(this.attribute);
    writer.writeString(this.value);
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
    if (typeof objectToCheckValue !== "undefined") {
      if (strictAttributeCase) {
        return objectToCheckValue <= this.value;
      }
      return objectToCheckValue.toLowerCase() <= this.value.toLowerCase();
    }
    return false;
  }
  toString() {
    return `(${this.escape(this.attribute)}<=${this.escape(this.value)})`;
  }
}

class NotFilter extends Filter {
  type = SearchFilter.not;
  filter;
  constructor(options) {
    super();
    this.filter = options.filter;
  }
  writeFilter(writer) {
    this.filter.write(writer);
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    return !this.filter.matches(objectToCheck, strictAttributeCase);
  }
  toString() {
    return `(!${this.filter.toString()})`;
  }
}

class OrFilter extends Filter {
  type = SearchFilter.or;
  filters;
  constructor(options) {
    super();
    this.filters = options.filters;
  }
  writeFilter(writer) {
    for (const filter of this.filters) {
      filter.write(writer);
    }
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    if (!this.filters.length) {
      return true;
    }
    for (const filter of this.filters) {
      if (filter.matches(objectToCheck, strictAttributeCase)) {
        return true;
      }
    }
    return false;
  }
  toString() {
    let result = "(|";
    for (const filter of this.filters) {
      result += filter.toString();
    }
    result += ")";
    return result;
  }
}

class PresenceFilter extends Filter {
  type = SearchFilter.present;
  attribute;
  constructor(options = {}) {
    super();
    this.attribute = options.attribute ?? "";
  }
  parseFilter(reader) {
    this.attribute = reader.buffer.subarray(0, reader.length).toString("utf8").toLowerCase();
    reader.offset += reader.length;
  }
  writeFilter(writer) {
    for (let i = 0; i < this.attribute.length; i += 1) {
      writer.writeByte(this.attribute.charCodeAt(i));
    }
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
    return typeof objectToCheckValue !== "undefined";
  }
  toString() {
    return `(${this.escape(this.attribute)}=*)`;
  }
}

class SubstringFilter extends Filter {
  type = SearchFilter.substrings;
  attribute;
  initial;
  any;
  final;
  constructor(options = {}) {
    super();
    this.attribute = options.attribute ?? "";
    this.initial = options.initial ?? "";
    this.any = options.any ?? [];
    this.final = options.final ?? "";
  }
  parseFilter(reader) {
    this.attribute = reader.readString()?.toLowerCase() ?? "";
    reader.readSequence();
    const end = reader.offset + reader.length;
    while (reader.offset < end) {
      const tag = reader.peek();
      switch (tag) {
        case 128:
          this.initial = reader.readString(tag) ?? "";
          if (this.attribute === "objectclass") {
            this.initial = this.initial.toLowerCase();
          }
          break;
        case 129: {
          let anyValue = reader.readString(tag) ?? "";
          if (this.attribute === "objectclass") {
            anyValue = anyValue.toLowerCase();
          }
          this.any.push(anyValue);
          break;
        }
        case 130:
          this.final = reader.readString(tag) ?? "";
          if (this.attribute === "objectclass") {
            this.final = this.final.toLowerCase();
          }
          break;
        default: {
          let type = "<null>";
          if (tag) {
            type = `0x${tag.toString(16)}`;
          }
          throw new Error(`Invalid substring filter type: ${type}`);
        }
      }
    }
  }
  writeFilter(writer) {
    writer.writeString(this.attribute);
    writer.startSequence();
    if (this.initial) {
      writer.writeString(this.initial, 128);
    }
    for (const anyItem of this.any) {
      writer.writeString(anyItem, 129);
    }
    if (this.final) {
      writer.writeString(this.final, 130);
    }
    writer.endSequence();
  }
  matches(objectToCheck = {}, strictAttributeCase) {
    const objectToCheckValue = this.getObjectValue(objectToCheck, this.attribute, strictAttributeCase);
    if (typeof objectToCheckValue !== "undefined") {
      let regexp = "";
      if (this.initial) {
        regexp += `^${SubstringFilter._escapeRegExp(this.initial)}.*`;
      }
      for (const anyItem of this.any) {
        regexp += `${SubstringFilter._escapeRegExp(anyItem)}.*`;
      }
      if (this.final) {
        regexp += `${SubstringFilter._escapeRegExp(this.final)}$`;
      }
      const matcher = new RegExp(regexp, strictAttributeCase ? "gmu" : "igmu");
      return matcher.test(objectToCheckValue);
    }
    return false;
  }
  toString() {
    let result = `(${this.escape(this.attribute)}=${this.escape(this.initial)}*`;
    for (const anyItem of this.any) {
      result += `${this.escape(anyItem)}*`;
    }
    result += `${this.escape(this.final)})`;
    return result;
  }
  static _escapeRegExp(str) {
    return str.replace(/[$()*+./?[\\\]^{|}-]/g, "\\$&");
  }
}

const ProtocolOperation = {
  // Misc
  LDAP_VERSION_3: 3,
  LBER_SET: 49,
  LDAP_CONTROLS: 160,
  // Requests
  LDAP_REQ_BIND: 96,
  LDAP_REQ_BIND_SASL: 163,
  LDAP_REQ_UNBIND: 66,
  LDAP_REQ_SEARCH: 99,
  LDAP_REQ_MODIFY: 102,
  LDAP_REQ_ADD: 104,
  LDAP_REQ_DELETE: 74,
  LDAP_REQ_MODRDN: 108,
  LDAP_REQ_COMPARE: 110,
  LDAP_REQ_ABANDON: 80,
  LDAP_REQ_EXTENSION: 119,
  // Responses
  LDAP_RES_BIND: 97,
  LDAP_RES_SEARCH_ENTRY: 100,
  LDAP_RES_SEARCH_REF: 115,
  LDAP_RES_SEARCH: 101,
  LDAP_RES_MODIFY: 103,
  LDAP_RES_ADD: 105,
  LDAP_RES_DELETE: 107,
  LDAP_RES_MODRDN: 109,
  LDAP_RES_COMPARE: 111,
  LDAP_RES_EXTENSION: 120
};

class ControlParser {
  static parse(reader, requestControls) {
    if (reader.readSequence() === null) {
      return null;
    }
    let type = "";
    let critical = false;
    let value = Buffer.alloc(0);
    if (reader.length) {
      const end = reader.offset + reader.length;
      type = reader.readString() ?? "";
      if (reader.offset < end) {
        if (reader.peek() === Ber.Boolean) {
          critical = reader.readBoolean() ?? false;
        }
      }
      if (reader.offset < end) {
        value = reader.readString(Ber.OctetString, true) ?? Buffer.alloc(0);
      }
    }
    let control;
    switch (type) {
      case EntryChangeNotificationControl.type:
        control = new EntryChangeNotificationControl({
          critical
        });
        break;
      case PagedResultsControl.type:
        control = new PagedResultsControl({
          critical
        });
        break;
      case PersistentSearchControl.type:
        control = new PersistentSearchControl({
          critical
        });
        break;
      case ServerSideSortingRequestControl.type:
        control = new ServerSideSortingRequestControl({
          critical
        });
        break;
      default:
        control = requestControls.find((requestControl) => requestControl.type === type);
        break;
    }
    if (!control) {
      return null;
    }
    const controlReader = new BerReader(value);
    control.parse(controlReader);
    return control;
  }
}

class Message {
  version = ProtocolOperation.LDAP_VERSION_3;
  messageId = 0;
  controls;
  constructor(options) {
    this.messageId = options.messageId;
    this.controls = options.controls;
  }
  write() {
    const writer = new BerWriter();
    writer.startSequence();
    writer.writeInt(this.messageId);
    writer.startSequence(this.protocolOperation);
    this.writeMessage(writer);
    writer.endSequence();
    if (this.controls?.length) {
      writer.startSequence(ProtocolOperation.LDAP_CONTROLS);
      for (const control of this.controls) {
        control.write(writer);
      }
      writer.endSequence();
    }
    writer.endSequence();
    return writer.buffer;
  }
  parse(reader, requestControls) {
    this.controls = [];
    this.parseMessage(reader);
    if (reader.peek() === ProtocolOperation.LDAP_CONTROLS) {
      reader.readSequence();
      const end = reader.offset + reader.length;
      while (reader.offset < end) {
        const control = ControlParser.parse(reader, requestControls);
        if (control) {
          this.controls.push(control);
        }
      }
    }
  }
  toString() {
    return JSON.stringify(
      {
        messageId: this.messageId,
        messageType: this.constructor.name
      },
      null,
      2
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parseMessage(_) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  writeMessage(_) {
  }
}

class AbandonRequest extends Message {
  protocolOperation;
  abandonId;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_ABANDON;
    this.abandonId = options.abandonId ?? 0;
  }
  /* eslint-disable no-bitwise */
  writeMessage(writer) {
    let i = this.abandonId;
    let intSize = 4;
    const mask = 4286578688;
    while (((i & mask) === 0 || (i & mask) === mask) && intSize > 1) {
      intSize -= 1;
      i <<= 8;
    }
    assert__namespace.ok(intSize <= 4);
    while (intSize-- > 0) {
      writer.writeByte((i & 4278190080) >> 24);
      i <<= 8;
    }
  }
  parseMessage(reader) {
    const { length } = reader;
    if (length) {
      let offset = 1;
      let value;
      const fb = reader.buffer[offset] ?? 0;
      value = fb & 127;
      for (let i = 1; i < length; i += 1) {
        value <<= 8;
        offset += 1;
        const bufferValue = reader.buffer[offset] ?? 0;
        value |= bufferValue & 255;
      }
      if ((fb & 128) === 128) {
        value = -value;
      }
      reader.offset += length;
      this.abandonId = value;
    } else {
      this.abandonId = 0;
    }
  }
  /* eslint-enable no-bitwise */
}

const utfDecoder = new node_util.TextDecoder("utf8", { fatal: true });
class Attribute {
  buffers = [];
  type;
  values;
  constructor(options = {}) {
    this.type = options.type ?? "";
    this.values = options.values ?? [];
  }
  get parsedBuffers() {
    return this.buffers;
  }
  write(writer) {
    writer.startSequence();
    const { type } = this;
    writer.writeString(type);
    writer.startSequence(ProtocolOperation.LBER_SET);
    if (this.values.length) {
      for (const value of this.values) {
        if (Buffer.isBuffer(value)) {
          writer.writeBuffer(value, Ber.OctetString);
        } else {
          writer.writeString(value);
        }
      }
    } else {
      writer.writeStringArray([]);
    }
    writer.endSequence();
    writer.endSequence();
  }
  parse(reader) {
    reader.readSequence();
    this.type = reader.readString() ?? "";
    const isBinaryType = this._isBinaryType();
    if (reader.peek() === ProtocolOperation.LBER_SET) {
      if (reader.readSequence(ProtocolOperation.LBER_SET)) {
        const end = reader.offset + reader.length;
        while (reader.offset < end) {
          const buffer = reader.readString(Ber.OctetString, true) ?? Buffer.alloc(0);
          this.buffers.push(buffer);
          if (isBinaryType) {
            this.values.push(buffer);
          } else {
            try {
              const decoded = utfDecoder.decode(buffer);
              this.values.push(decoded);
            } catch {
              this.values.push(buffer);
            }
          }
        }
      }
    }
  }
  _isBinaryType() {
    return /;binary$/i.test(this.type || "");
  }
}

class AddRequest extends Message {
  protocolOperation;
  dn;
  attributes;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_ADD;
    this.dn = options.dn;
    this.attributes = options.attributes ?? [];
  }
  writeMessage(writer) {
    writer.writeString(this.dn);
    writer.startSequence();
    for (const attribute of this.attributes) {
      attribute.write(writer);
    }
    writer.endSequence();
  }
  parseMessage(reader) {
    this.dn = reader.readString() ?? "";
    reader.readSequence();
    const end = reader.offset + reader.length;
    while (reader.offset < end) {
      const attribute = new Attribute();
      attribute.parse(reader);
      this.attributes.push(attribute);
    }
  }
}

class MessageResponse extends Message {
  status;
  matchedDN;
  errorMessage;
  constructor(options) {
    super(options);
    this.status = options.status ?? 0;
    this.matchedDN = options.matchedDN ?? "";
    this.errorMessage = options.errorMessage ?? "";
  }
  parseMessage(reader) {
    this.status = reader.readEnumeration() ?? 0;
    this.matchedDN = reader.readString() ?? "";
    this.errorMessage = reader.readString() ?? "";
  }
}

class AddResponse extends MessageResponse {
  protocolOperation;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_ADD;
  }
}

const SASL_MECHANISMS = ["EXTERNAL", "PLAIN", "DIGEST-MD5", "SCRAM-SHA-1"];
class BindRequest extends Message {
  protocolOperation;
  dn;
  password;
  mechanism;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_BIND;
    this.dn = options.dn ?? "";
    this.password = options.password ?? "";
    this.mechanism = options.mechanism;
  }
  writeMessage(writer) {
    writer.writeInt(this.version);
    writer.writeString(this.dn);
    if (this.mechanism) {
      writer.startSequence(ProtocolOperation.LDAP_REQ_BIND_SASL);
      writer.writeString(this.mechanism);
      writer.writeString(this.password);
      writer.endSequence();
    } else {
      writer.writeString(this.password, Ber.Context);
    }
  }
  parseMessage(reader) {
    this.version = reader.readInt() ?? ProtocolOperation.LDAP_VERSION_3;
    this.dn = reader.readString() ?? "";
    const contextCheck = reader.peek();
    if (contextCheck !== Ber.Context) {
      let type = "<null>";
      if (contextCheck) {
        type = `0x${contextCheck.toString(16)}`;
      }
      throw new Error(`Authentication type not supported: ${type}`);
    }
    this.password = reader.readString(Ber.Context) ?? "";
  }
}

class BindResponse extends MessageResponse {
  protocolOperation;
  data = [];
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_BIND;
  }
  parseMessage(reader) {
    super.parseMessage(reader);
    while (reader.remain > 0) {
      const type = reader.peek();
      if (type === ProtocolOperation.LDAP_CONTROLS) {
        break;
      }
      this.data.push(reader.readString(typeof type === "number" ? type : void 0) ?? "");
    }
  }
}

class CompareRequest extends Message {
  protocolOperation;
  dn;
  attribute;
  value;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_COMPARE;
    this.attribute = options.attribute ?? "";
    this.value = options.value ?? "";
    this.dn = options.dn ?? "";
  }
  writeMessage(writer) {
    writer.writeString(this.dn);
    writer.startSequence();
    writer.writeString(this.attribute);
    writer.writeString(this.value);
    writer.endSequence();
  }
  parseMessage(reader) {
    this.dn = reader.readString() ?? "";
    reader.readSequence();
    this.attribute = (reader.readString() ?? "").toLowerCase();
    this.value = reader.readString() ?? "";
  }
}

var CompareResult = /* @__PURE__ */ ((CompareResult2) => {
  CompareResult2[CompareResult2["compareTrue"] = 6] = "compareTrue";
  CompareResult2[CompareResult2["compareFalse"] = 5] = "compareFalse";
  CompareResult2[CompareResult2["noSuchAttribute"] = 22] = "noSuchAttribute";
  CompareResult2[CompareResult2["noSuchObject"] = 50] = "noSuchObject";
  return CompareResult2;
})(CompareResult || {});
class CompareResponse extends MessageResponse {
  protocolOperation;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_COMPARE;
  }
}

class DeleteRequest extends Message {
  protocolOperation;
  dn;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_DELETE;
    this.dn = options.dn ?? "";
  }
  writeMessage(writer) {
    const buffer = Buffer.from(this.dn);
    for (const byte of buffer) {
      writer.writeByte(byte);
    }
  }
  parseMessage(reader) {
    const { length } = reader;
    this.dn = reader.buffer.subarray(0, length).toString("utf8");
    reader.offset += reader.length;
  }
}

class DeleteResponse extends MessageResponse {
  protocolOperation;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_DELETE;
  }
}

class ExtendedRequest extends Message {
  protocolOperation;
  oid;
  value;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_EXTENSION;
    this.oid = options.oid ?? "";
    this.value = options.value ?? "";
  }
  writeMessage(writer) {
    writer.writeString(this.oid, 128);
    if (Buffer.isBuffer(this.value)) {
      writer.writeBuffer(this.value, 129);
    } else if (this.value) {
      writer.writeString(this.value, 129);
    }
  }
  parseMessage(reader) {
    this.oid = reader.readString(128) ?? "";
    if (reader.peek() === 129) {
      try {
        this.value = reader.readString(129) ?? "";
      } catch {
        this.value = reader.readString(129, true) ?? Buffer.alloc(0);
      }
    }
  }
}

const ExtendedResponseProtocolOperations = {
  oid: 138,
  value: 139
};
class ExtendedResponse extends MessageResponse {
  protocolOperation;
  oid;
  value;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_EXTENSION;
    this.oid = options.oid;
    this.value = options.value;
  }
  parseMessage(reader) {
    super.parseMessage(reader);
    if (reader.peek() === ExtendedResponseProtocolOperations.oid) {
      this.oid = reader.readString(ExtendedResponseProtocolOperations.oid) ?? "";
    }
    if (reader.peek() === ExtendedResponseProtocolOperations.value) {
      this.value = reader.readString(ExtendedResponseProtocolOperations.value) ?? void 0;
    }
  }
}

class ModifyDNRequest extends Message {
  protocolOperation;
  deleteOldRdn;
  dn;
  newRdn;
  newSuperior;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_MODRDN;
    this.deleteOldRdn = options.deleteOldRdn !== false;
    this.dn = options.dn ?? "";
    this.newRdn = options.newRdn ?? "";
    this.newSuperior = options.newSuperior ?? "";
  }
  writeMessage(writer) {
    writer.writeString(this.dn);
    writer.writeString(this.newRdn);
    writer.writeBoolean(this.deleteOldRdn);
    if (this.newSuperior) {
      writer.writeString(this.newSuperior, 128);
    }
  }
  parseMessage(reader) {
    this.dn = reader.readString() ?? "";
    this.newRdn = reader.readString() ?? "";
    this.deleteOldRdn = reader.readBoolean() ?? false;
    if (reader.peek() === 128) {
      this.newSuperior = reader.readString(128) ?? "";
    }
  }
}

class ModifyDNResponse extends MessageResponse {
  protocolOperation;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_MODRDN;
  }
}

class Change {
  operation;
  modification;
  constructor(options = {
    modification: new Attribute()
  }) {
    this.operation = options.operation ?? "add";
    this.modification = options.modification;
  }
  write(writer) {
    writer.startSequence();
    switch (this.operation) {
      case "add":
        writer.writeEnumeration(0);
        break;
      case "delete":
        writer.writeEnumeration(1);
        break;
      case "replace":
        writer.writeEnumeration(2);
        break;
      default:
        throw new Error(`Unknown change operation: ${this.operation}`);
    }
    this.modification.write(writer);
    writer.endSequence();
  }
  parse(reader) {
    reader.readSequence();
    const operation = reader.readEnumeration();
    switch (operation) {
      case 0:
        this.operation = "add";
        break;
      case 1:
        this.operation = "delete";
        break;
      case 2:
        this.operation = "replace";
        break;
      case null:
        throw new Error(`Unknown change operation - <null> operation value`);
      default:
        throw new Error(`Unknown change operation: 0x${operation.toString(16)}`);
    }
    this.modification = new Attribute();
    this.modification.parse(reader);
  }
}

class ModifyRequest extends Message {
  protocolOperation;
  dn;
  changes;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_MODIFY;
    this.dn = options.dn ?? "";
    this.changes = options.changes ?? [];
  }
  writeMessage(writer) {
    writer.writeString(this.dn);
    writer.startSequence();
    for (const change of this.changes) {
      change.write(writer);
    }
    writer.endSequence();
  }
  parseMessage(reader) {
    this.dn = reader.readString() ?? "";
    reader.readSequence();
    const end = reader.offset + reader.length;
    while (reader.offset < end) {
      const change = new Change();
      change.parse(reader);
      this.changes.push(change);
    }
  }
}

class ModifyResponse extends MessageResponse {
  protocolOperation;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_MODIFY;
  }
}

class SearchEntry extends MessageResponse {
  protocolOperation;
  name;
  attributes;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_SEARCH_ENTRY;
    this.name = options.name ?? "";
    this.attributes = options.attributes ?? [];
  }
  parseMessage(reader) {
    this.name = reader.readString() ?? "";
    reader.readSequence();
    const end = reader.offset + reader.length;
    while (reader.offset < end) {
      const attribute = new Attribute();
      attribute.parse(reader);
      this.attributes.push(attribute);
    }
  }
  toObject(requestAttributes, explicitBufferAttributes) {
    const result = {
      dn: this.name
    };
    const resultLCAttributes = /* @__PURE__ */ new Set();
    for (const attribute of this.attributes) {
      resultLCAttributes.add(attribute.type.toLocaleLowerCase());
      let { values } = attribute;
      if (explicitBufferAttributes.includes(attribute.type) || values.some((value) => Buffer.isBuffer(value))) {
        values = attribute.parsedBuffers;
      }
      if (values.length) {
        if (values.length === 1) {
          result[attribute.type] = values[0] ?? [];
        } else {
          result[attribute.type] = values;
        }
      } else {
        result[attribute.type] = [];
      }
    }
    for (const attribute of requestAttributes) {
      if (typeof result[attribute] === "undefined" && !resultLCAttributes.has(attribute.toLocaleLowerCase())) {
        result[attribute] = [];
      }
    }
    return result;
  }
}

class SearchReference extends MessageResponse {
  protocolOperation;
  uris;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_SEARCH_REF;
    this.uris = options.uris ?? [];
  }
  parseMessage(reader) {
    const end = reader.offset + reader.length;
    while (reader.offset < end) {
      const url = reader.readString() ?? "";
      this.uris.push(url);
    }
  }
}

class FilterParser {
  static parseString(filterString) {
    if (!filterString) {
      throw new Error("Filter cannot be empty");
    }
    if (!filterString.startsWith("(")) {
      filterString = `(${filterString})`;
    }
    const parseResult = FilterParser._parseString(filterString, 0, filterString);
    const end = filterString.length - 1;
    if (parseResult.end < end) {
      throw new Error(`Unbalanced parens in filter string: ${filterString}`);
    }
    return parseResult.filter;
  }
  /*
   * A filter looks like this coming in:
   *      Filter ::= CHOICE {
   *              and             [0]     SET OF Filter,
   *              or              [1]     SET OF Filter,
   *              not             [2]     Filter,
   *              equalityMatch   [3]     AttributeValueAssertion,
   *              substrings      [4]     SubstringFilter,
   *              greaterOrEqual  [5]     AttributeValueAssertion,
   *              lessOrEqual     [6]     AttributeValueAssertion,
   *              present         [7]     AttributeType,
   *              approxMatch     [8]     AttributeValueAssertion,
   *              extensibleMatch [9]     MatchingRuleAssertion --v3 only
   *      }
   *
   *      SubstringFilter ::= SEQUENCE {
   *              type               AttributeType,
   *              SEQUENCE OF CHOICE {
   *                      initial          [0] IA5String,
   *                      any              [1] IA5String,
   *                      final            [2] IA5String
   *              }
   *      }
   *
   * The extensibleMatch was added in LDAPv3:
   *
   *      MatchingRuleAssertion ::= SEQUENCE {
   *              matchingRule    [1] MatchingRuleID OPTIONAL,
   *              type            [2] AttributeDescription OPTIONAL,
   *              matchValue      [3] AssertionValue,
   *              dnAttributes    [4] BOOLEAN DEFAULT FALSE
   *      }
   */
  static parse(reader) {
    const type = reader.readSequence();
    let filter;
    switch (type) {
      case SearchFilter.and: {
        const andFilters = FilterParser._parseSet(reader);
        filter = new AndFilter({
          filters: andFilters
        });
        break;
      }
      case SearchFilter.approxMatch:
        filter = new ApproximateFilter();
        filter.parse(reader);
        break;
      case SearchFilter.equalityMatch:
        filter = new EqualityFilter();
        filter.parse(reader);
        break;
      case SearchFilter.extensibleMatch:
        filter = new ExtensibleFilter();
        filter.parse(reader);
        break;
      case SearchFilter.greaterOrEqual:
        filter = new GreaterThanEqualsFilter();
        filter.parse(reader);
        break;
      case SearchFilter.lessOrEqual:
        filter = new LessThanEqualsFilter();
        filter.parse(reader);
        break;
      case SearchFilter.not: {
        const innerFilter = FilterParser.parse(reader);
        filter = new NotFilter({
          filter: innerFilter
        });
        break;
      }
      case SearchFilter.or: {
        const orFilters = FilterParser._parseSet(reader);
        filter = new OrFilter({
          filters: orFilters
        });
        break;
      }
      case SearchFilter.present:
        filter = new PresenceFilter();
        filter.parse(reader);
        break;
      case SearchFilter.substrings:
        filter = new SubstringFilter();
        filter.parse(reader);
        break;
      default:
        throw new Error(`Invalid search filter type: 0x${type ?? "<null>"}`);
    }
    return filter;
  }
  static _parseString(filterString, start, fullString) {
    let cursor = start;
    const { length } = filterString;
    let filter;
    if (filterString[cursor] !== "(") {
      throw new Error(`Missing paren: ${filterString}. Full string: ${fullString}`);
    }
    cursor += 1;
    switch (filterString[cursor]) {
      case "&": {
        cursor += 1;
        const children = [];
        do {
          const childResult = FilterParser._parseString(filterString, cursor, fullString);
          children.push(childResult.filter);
          cursor = childResult.end + 1;
        } while (cursor < length && filterString[cursor] !== ")");
        filter = new AndFilter({
          filters: children
        });
        break;
      }
      case "|": {
        cursor += 1;
        const children = [];
        do {
          const childResult = FilterParser._parseString(filterString, cursor, fullString);
          children.push(childResult.filter);
          cursor = childResult.end + 1;
        } while (cursor < length && filterString[cursor] !== ")");
        filter = new OrFilter({
          filters: children
        });
        break;
      }
      case "!": {
        const childResult = FilterParser._parseString(filterString, cursor + 1, fullString);
        filter = new NotFilter({
          filter: childResult.filter
        });
        cursor = childResult.end + 1;
        break;
      }
      default: {
        const end = filterString.indexOf(")", cursor);
        if (end === -1) {
          throw new Error(`Unbalanced parens: ${filterString}. Full string: ${fullString}`);
        }
        filter = FilterParser._parseExpressionFilterFromString(filterString.substring(cursor, end));
        cursor = end;
      }
    }
    return {
      end: cursor,
      filter
    };
  }
  static _parseExpressionFilterFromString(filterString) {
    let attribute;
    let remainingExpression;
    if (filterString.startsWith(":")) {
      attribute = "";
      remainingExpression = filterString;
    } else {
      const matches = /^[\w-]+/.exec(filterString);
      if (matches?.length) {
        [attribute] = matches;
        remainingExpression = filterString.slice(attribute.length);
      } else {
        throw new Error(`Invalid attribute name: ${filterString}`);
      }
    }
    if (remainingExpression === "=*") {
      return new PresenceFilter({
        attribute
      });
    }
    if (remainingExpression.startsWith("=")) {
      remainingExpression = remainingExpression.slice(1);
      if (remainingExpression.includes("*")) {
        const escapedExpression = FilterParser._unescapeSubstring(remainingExpression);
        return new SubstringFilter({
          attribute,
          initial: escapedExpression.initial,
          any: escapedExpression.any,
          final: escapedExpression.final
        });
      }
      return new EqualityFilter({
        attribute,
        value: FilterParser._unescapeHexValues(remainingExpression)
      });
    }
    if (remainingExpression.startsWith(">") && remainingExpression[1] === "=") {
      return new GreaterThanEqualsFilter({
        attribute,
        value: FilterParser._unescapeHexValues(remainingExpression.slice(2))
      });
    }
    if (remainingExpression.startsWith("<") && remainingExpression[1] === "=") {
      return new LessThanEqualsFilter({
        attribute,
        value: FilterParser._unescapeHexValues(remainingExpression.slice(2))
      });
    }
    if (remainingExpression.startsWith("~") && remainingExpression[1] === "=") {
      return new ApproximateFilter({
        attribute,
        value: FilterParser._unescapeHexValues(remainingExpression.slice(2))
      });
    }
    if (remainingExpression.startsWith(":")) {
      return FilterParser._parseExtensibleFilterFromString(attribute, remainingExpression);
    }
    throw new Error(`Invalid expression: ${filterString}`);
  }
  static _parseExtensibleFilterFromString(attribute, filterString) {
    let dnAttributes = false;
    let rule;
    const fields = filterString.split(":");
    if (fields.length <= 1) {
      throw new Error(`Invalid extensible filter: ${filterString}`);
    }
    fields.shift();
    if (fields[0]?.toLowerCase() === "dn") {
      dnAttributes = true;
      fields.shift();
    }
    if (fields.length && !fields[0]?.startsWith("=")) {
      rule = fields.shift();
    }
    if (fields.length && !fields[0]?.startsWith("=")) {
      throw new Error(`Missing := in extensible filter: ${filterString}`);
    }
    const remainingExpression = fields.join(":").slice(1);
    const options = {
      matchType: attribute,
      dnAttributes,
      rule,
      value: FilterParser._unescapeHexValues(remainingExpression)
    };
    return new ExtensibleFilter(options);
  }
  static _unescapeHexValues(input) {
    let index = 0;
    const end = input.length;
    let result = "";
    while (index < end) {
      const char = input[index];
      switch (char) {
        case "(":
          throw new Error(`Illegal unescaped character: ${char} in value: ${input}`);
        case "\\": {
          const value = input.slice(index + 1, index + 3);
          if (/^[\dA-Fa-f]{2}$/.exec(value) === null) {
            throw new Error(`Invalid escaped hex character: ${value} in value: ${input}`);
          }
          result += String.fromCharCode(Number.parseInt(value, 16));
          index += 3;
          break;
        }
        default:
          if (char) {
            result += char;
          }
          index += 1;
          break;
      }
    }
    return result;
  }
  static _unescapeSubstring(input) {
    const fields = input.split("*");
    if (fields.length < 2) {
      throw new Error(`Wildcard missing: ${input}`);
    }
    return {
      initial: FilterParser._unescapeHexValues(fields.shift() ?? ""),
      final: FilterParser._unescapeHexValues(fields.pop() ?? ""),
      any: fields.map((field) => FilterParser._unescapeHexValues(field))
    };
  }
  static _parseSet(reader) {
    const filters = [];
    const end = reader.offset + reader.length;
    while (reader.offset < end) {
      filters.push(FilterParser.parse(reader));
    }
    return filters;
  }
}

class SearchRequest extends Message {
  protocolOperation;
  baseDN;
  scope;
  derefAliases;
  sizeLimit;
  timeLimit;
  returnAttributeValues;
  filter;
  attributes;
  explicitBufferAttributes;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_SEARCH;
    this.baseDN = options.baseDN ?? "";
    this.scope = options.scope ?? "sub";
    this.derefAliases = options.derefAliases ?? "never";
    this.sizeLimit = options.sizeLimit ?? 0;
    this.timeLimit = options.timeLimit ?? 10;
    this.returnAttributeValues = options.returnAttributeValues !== false;
    this.filter = options.filter;
    this.attributes = options.attributes ?? [];
    this.explicitBufferAttributes = options.explicitBufferAttributes ?? [];
  }
  writeMessage(writer) {
    writer.writeString(this.baseDN);
    switch (this.scope) {
      case "base":
        writer.writeEnumeration(0);
        break;
      case "one":
        writer.writeEnumeration(1);
        break;
      case "sub":
        writer.writeEnumeration(2);
        break;
      case "children":
      case "subordinates":
        writer.writeEnumeration(3);
        break;
      default:
        throw new Error(`Invalid search scope: ${this.scope}`);
    }
    switch (this.derefAliases) {
      case "never":
        writer.writeEnumeration(0);
        break;
      case "search":
        writer.writeEnumeration(1);
        break;
      case "find":
        writer.writeEnumeration(2);
        break;
      case "always":
        writer.writeEnumeration(3);
        break;
      default:
        throw new Error(`Invalid deref alias: ${this.derefAliases}`);
    }
    writer.writeInt(this.sizeLimit);
    writer.writeInt(this.timeLimit);
    writer.writeBoolean(!this.returnAttributeValues);
    this.filter.write(writer);
    writer.startSequence();
    for (const attribute of this.attributes) {
      writer.writeString(attribute);
    }
    writer.endSequence();
  }
  parseMessage(reader) {
    this.baseDN = reader.readString() ?? "";
    const scope = reader.readEnumeration();
    switch (scope) {
      case 0:
        this.scope = "base";
        break;
      case 1:
        this.scope = "one";
        break;
      case 2:
        this.scope = "sub";
        break;
      case 3:
        this.scope = "children";
        break;
      default:
        throw new Error(`Invalid search scope: ${scope ?? "<null>"}`);
    }
    const derefAliases = reader.readEnumeration();
    switch (scope) {
      case 0:
        this.derefAliases = "never";
        break;
      case 1:
        this.derefAliases = "search";
        break;
      case 2:
        this.derefAliases = "find";
        break;
      case 3:
        this.derefAliases = "always";
        break;
      default:
        throw new Error(`Invalid deref alias: ${derefAliases ?? "<null>"}`);
    }
    this.sizeLimit = reader.readInt() ?? 0;
    this.timeLimit = reader.readInt() ?? 0;
    this.returnAttributeValues = !(reader.readBoolean() ?? false);
    this.filter = FilterParser.parse(reader);
    if (reader.peek() === 48) {
      reader.readSequence();
      const end = reader.offset + reader.length;
      while (reader.offset < end) {
        this.attributes.push((reader.readString() ?? "").toLowerCase());
      }
    }
  }
}

class SearchResponse extends MessageResponse {
  protocolOperation;
  searchEntries;
  searchReferences;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_RES_SEARCH;
    this.searchEntries = options.searchEntries ?? [];
    this.searchReferences = options.searchReferences ?? [];
  }
}

class UnbindRequest extends Message {
  protocolOperation;
  constructor(options) {
    super(options);
    this.protocolOperation = ProtocolOperation.LDAP_REQ_UNBIND;
  }
}

class MessageParser extends node_events.EventEmitter {
  buffer;
  read(data, messageDetailsByMessageId) {
    let nextMessage;
    if (this.buffer) {
      this.buffer = Buffer.concat([this.buffer, data]);
    } else {
      this.buffer = data;
    }
    const reader = new BerReader(this.buffer);
    let foundSequence = null;
    try {
      foundSequence = reader.readSequence();
    } catch (ex) {
      this.emit("error", ex);
    }
    if (!foundSequence || reader.remain < reader.length) {
      return;
    }
    if (reader.remain > reader.length) {
      nextMessage = this.buffer.subarray(reader.offset + reader.length);
      reader.setBufferSize(reader.offset + reader.length);
    }
    delete this.buffer;
    let messageId;
    let protocolOperation;
    try {
      messageId = reader.readInt();
      if (messageId == null) {
        throw new Error(`Unable to read message id`);
      }
      protocolOperation = reader.readSequence();
      if (protocolOperation == null) {
        throw new Error(`Unable to read protocol operation sequence for message: ${messageId}`);
      }
      const messageDetails = messageDetailsByMessageId.get(`${messageId}`);
      const message = this._getMessageFromProtocolOperation(messageId, protocolOperation, reader, messageDetails?.message);
      this.emit("message", message);
    } catch (ex) {
      if (messageId) {
        const errorWithMessageDetails = ex;
        errorWithMessageDetails.messageDetails = {
          messageId
        };
        if (protocolOperation) {
          errorWithMessageDetails.messageDetails.protocolOperation = protocolOperation;
        }
        this.emit("error", errorWithMessageDetails);
        return;
      }
      this.emit("error", ex);
      return;
    }
    if (nextMessage) {
      this.read(nextMessage, messageDetailsByMessageId);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  _getMessageFromProtocolOperation(messageId, protocolOperation, reader, messageDetails) {
    let message;
    switch (protocolOperation) {
      case ProtocolOperation.LDAP_RES_BIND:
        message = new BindResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_ADD:
        message = new AddResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_COMPARE:
        message = new CompareResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_DELETE:
        message = new DeleteResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_EXTENSION:
        message = new ExtendedResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_MODRDN:
        message = new ModifyDNResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_MODIFY:
        message = new ModifyResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_SEARCH:
        message = new SearchResponse({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_SEARCH_ENTRY:
        message = new SearchEntry({
          messageId
        });
        break;
      case ProtocolOperation.LDAP_RES_SEARCH_REF:
        message = new SearchReference({
          messageId
        });
        break;
      default: {
        const error = new MessageParserError(`Protocol Operation not supported: 0x${protocolOperation.toString(16)}`);
        error.messageDetails = {
          messageId,
          protocolOperation
        };
        throw error;
      }
    }
    message.parse(reader, messageDetails?.controls ?? []);
    return message;
  }
}

const MessageResponseStatus = {
  Success: 0,
  SizeLimitExceeded: 4
};

class StatusCodeParser {
  static parse(result) {
    if (!result) {
      return new NoResultError();
    }
    switch (result.status) {
      case 1:
        return new OperationsError(result.errorMessage);
      case 2:
        return new ProtocolError(result.errorMessage);
      case 3:
        return new TimeLimitExceededError(result.errorMessage);
      case 4:
        return new SizeLimitExceededError(result.errorMessage);
      case 7:
        return new AuthMethodNotSupportedError(result.errorMessage);
      case 8:
        return new StrongAuthRequiredError(result.errorMessage);
      case 11:
        return new AdminLimitExceededError(result.errorMessage);
      case 12:
        return new UnavailableCriticalExtensionError(result.errorMessage);
      case 13:
        return new ConfidentialityRequiredError(result.errorMessage);
      case 14:
        return new SaslBindInProgressError(result);
      case 16:
        return new NoSuchAttributeError(result.errorMessage);
      case 17:
        return new UndefinedTypeError(result.errorMessage);
      case 18:
        return new InappropriateMatchingError(result.errorMessage);
      case 19:
        return new ConstraintViolationError(result.errorMessage);
      case 20:
        return new TypeOrValueExistsError(result.errorMessage);
      case 21:
        return new InvalidSyntaxError(result.errorMessage);
      case 32:
        return new NoSuchObjectError(result.errorMessage);
      case 33:
        return new AliasProblemError(result.errorMessage);
      case 34:
        return new InvalidDNSyntaxError(result.errorMessage);
      case 35:
        return new IsLeafError(result.errorMessage);
      case 36:
        return new AliasDerefProblemError(result.errorMessage);
      case 48:
        return new InappropriateAuthError(result.errorMessage);
      case 49:
        return new InvalidCredentialsError(result.errorMessage);
      case 50:
        return new InsufficientAccessError(result.errorMessage);
      case 51:
        return new BusyError(result.errorMessage);
      case 52:
        return new UnavailableError(result.errorMessage);
      case 53:
        return new UnwillingToPerformError(result.errorMessage);
      case 54:
        return new LoopDetectError(result.errorMessage);
      case 64:
        return new NamingViolationError(result.errorMessage);
      case 65:
        return new ObjectClassViolationError(result.errorMessage);
      case 66:
        return new NotAllowedOnNonLeafError(result.errorMessage);
      case 67:
        return new NotAllowedOnRDNError(result.errorMessage);
      case 68:
        return new AlreadyExistsError(result.errorMessage);
      case 69:
        return new NoObjectClassModsError(result.errorMessage);
      case 70:
        return new ResultsTooLargeError(result.errorMessage);
      case 71:
        return new AffectsMultipleDSAsError(result.errorMessage);
      case 95:
        return new MoreResultsToReturnError(result.errorMessage);
      case 112:
        return new TLSNotSupportedError(result.errorMessage);
      case 248:
        return new NoResultError(result.errorMessage);
      default:
        return new UnknownStatusCodeError(result.status, result.errorMessage);
    }
  }
}

const MAX_MESSAGE_ID = 2 ** 31 - 1;
const logDebug = node_util.debuglog("ldapts");
Symbol.asyncDispose ??= Symbol("Symbol.asyncDispose");
class Client {
  clientOptions;
  messageId = 1;
  host;
  port;
  secure;
  connected = false;
  socket;
  connectTimer;
  messageParser = new MessageParser();
  messageDetailsByMessageId = /* @__PURE__ */ new Map();
  constructor(options) {
    this.clientOptions = options;
    this.clientOptions.timeout ??= 0;
    this.clientOptions.connectTimeout ??= 0;
    this.clientOptions.strictDN = this.clientOptions.strictDN !== false;
    let parsedUrl;
    try {
      parsedUrl = new URL(options.url);
    } catch {
      throw new Error(`${options.url} is an invalid LDAP URL (protocol)`);
    }
    const scheme = parsedUrl.protocol.replace(/:$/, "");
    if (scheme !== "ldap" && scheme !== "ldaps") {
      throw new Error(`${options.url} is an invalid LDAP URL (protocol)`);
    }
    const isSecureProtocol = scheme === "ldaps";
    const hasTlsOptions = !!this.clientOptions.tlsOptions && Object.values(this.clientOptions.tlsOptions).some((value) => value !== void 0);
    this.secure = isSecureProtocol || hasTlsOptions;
    let host = parsedUrl.hostname;
    if (host.startsWith("[") && host.endsWith("]")) {
      host = host.slice(1, -1);
    }
    this.host = host || "localhost";
    if (parsedUrl.port) {
      this.port = Number(parsedUrl.port);
    } else if (isSecureProtocol) {
      this.port = 636;
    } else {
      this.port = 389;
    }
    this.messageParser.on("error", (err) => {
      if (err.messageDetails?.messageId) {
        const messageDetails = this.messageDetailsByMessageId.get(err.messageDetails.messageId.toString());
        if (messageDetails) {
          this.messageDetailsByMessageId.delete(err.messageDetails.messageId.toString());
          messageDetails.reject(err);
          return;
        }
      }
      if (err.stack) {
        logDebug(err.stack);
      }
    });
    this.messageParser.on("message", this._handleSendResponse.bind(this));
  }
  get isConnected() {
    return !!this.socket && this.connected;
  }
  async startTLS(options = {}, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    await this.exop("1.3.6.1.4.1.1466.20037", void 0, controls);
    const originalSocket = this.socket;
    if (originalSocket) {
      originalSocket.removeListener("data", this.socketDataHandler);
      options.socket = originalSocket;
    }
    this.socket = await new Promise((resolve, reject) => {
      const secureSocket = tls__namespace.connect(options);
      secureSocket.once("secureConnect", () => {
        secureSocket.removeAllListeners("error");
        secureSocket.on("data", this.socketDataHandler);
        secureSocket.on("error", () => {
          if (originalSocket) {
            originalSocket.destroy();
          }
        });
        resolve(secureSocket);
      });
      secureSocket.once("error", (err) => {
        secureSocket.removeAllListeners();
        reject(err);
      });
    });
    if (originalSocket) {
      this.socket.id = originalSocket.id;
    }
  }
  /**
   * Performs a simple or sasl authentication against the server.
   * @param {string|DN|SaslMechanism} dnOrSaslMechanism
   * @param {string} [password]
   * @param {Control|Control[]} [controls]
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  async bind(dnOrSaslMechanism, password, controls) {
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    if (typeof dnOrSaslMechanism === "string" && SASL_MECHANISMS.includes(dnOrSaslMechanism)) {
      await this.bindSASL(dnOrSaslMechanism, password, controls);
      return;
    }
    const req = new BindRequest({
      messageId: this._nextMessageId(),
      dn: typeof dnOrSaslMechanism === "string" ? dnOrSaslMechanism : dnOrSaslMechanism.toString(),
      password,
      controls
    });
    await this._sendBind(req);
  }
  /**
   * Performs a sasl authentication against the server.
   * @param {string|SaslMechanism} mechanism
   * @param {string} [password]
   * @param {Control|Control[]} [controls]
   */
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  async bindSASL(mechanism, password, controls) {
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    const req = new BindRequest({
      messageId: this._nextMessageId(),
      mechanism,
      password,
      controls
    });
    await this._sendBind(req);
  }
  /**
   * Used to create a new entry in the directory
   * @param {string|DN} dn - The DN of the entry to add
   * @param {Attribute[]|object} attributes - Array of attributes or object where keys are the name of each attribute
   * @param {Control|Control[]} [controls]
   */
  async add(dn, attributes, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    let attributesToAdd;
    if (Array.isArray(attributes)) {
      attributesToAdd = attributes;
    } else {
      attributesToAdd = [];
      for (const [key, value] of Object.entries(attributes)) {
        let values;
        if (Array.isArray(value)) {
          values = value;
        } else if (value == null) {
          values = [];
        } else {
          values = [value];
        }
        attributesToAdd.push(
          new Attribute({
            type: key,
            values
          })
        );
      }
    }
    const req = new AddRequest({
      messageId: this._nextMessageId(),
      dn: typeof dn === "string" ? dn : dn.toString(),
      attributes: attributesToAdd,
      controls
    });
    const result = await this._send(req);
    if (result?.status !== MessageResponseStatus.Success) {
      throw StatusCodeParser.parse(result);
    }
  }
  /**
   * Compares an attribute/value pair with an entry on the LDAP server.
   * @param {string|DN} dn - The DN of the entry to compare attributes with
   * @param {string} attribute
   * @param {string} value
   * @param {Control|Control[]} [controls]
   * @returns true if attribute and value match; otherwise false
   */
  async compare(dn, attribute, value, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    const req = new CompareRequest({
      messageId: this._nextMessageId(),
      dn: typeof dn === "string" ? dn : dn.toString(),
      attribute,
      value,
      controls
    });
    const response = await this._send(req);
    switch (response?.status) {
      case CompareResult.compareTrue:
        return true;
      case CompareResult.compareFalse:
        return false;
      default:
        throw StatusCodeParser.parse(response);
    }
  }
  /**
   * Deletes an entry from the LDAP server.
   * @param {string|DN} dn - The DN of the entry to delete
   * @param {Control|Control[]} [controls]
   */
  async del(dn, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    const req = new DeleteRequest({
      messageId: this._nextMessageId(),
      dn: typeof dn === "string" ? dn : dn.toString(),
      controls
    });
    const result = await this._send(req);
    if (result?.status !== MessageResponseStatus.Success) {
      throw StatusCodeParser.parse(result);
    }
  }
  /**
   * Performs an extended operation on the LDAP server.
   * @param {string} oid - The object identifier (OID) of the extended operation to perform
   * @param {string|Buffer} [value]
   * @param {Control|Control[]} [controls]
   * @returns exop result
   */
  async exop(oid, value, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    const req = new ExtendedRequest({
      messageId: this._nextMessageId(),
      oid,
      value,
      controls
    });
    const result = await this._send(req);
    if (result?.status !== MessageResponseStatus.Success) {
      throw StatusCodeParser.parse(result);
    }
    return {
      oid: result.oid,
      value: result.value
    };
  }
  /**
   * Performs an LDAP modify against the server.
   * @param {string|DN} dn - The DN of the entry to modify
   * @param {Change|Change[]} changes
   * @param {Control|Control[]} [controls]
   */
  async modify(dn, changes, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (!Array.isArray(changes)) {
      changes = [changes];
    }
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    const req = new ModifyRequest({
      messageId: this._nextMessageId(),
      dn: typeof dn === "string" ? dn : dn.toString(),
      changes,
      controls
    });
    const result = await this._send(req);
    if (result?.status !== MessageResponseStatus.Success) {
      throw StatusCodeParser.parse(result);
    }
  }
  /**
   * Performs an LDAP modifyDN against the server.
   * @param {string|DN} dn - The DN of the entry to modify
   * @param {string|DN} newDN - The new DN to move this entry to
   * @param {Control|Control[]} [controls]
   */
  async modifyDN(dn, newDN, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (controls && !Array.isArray(controls)) {
      controls = [controls];
    }
    let newSuperior;
    if (typeof newDN === "string" && /[^\\],/.test(newDN)) {
      const parseIndex = newDN.search(/[^\\],/);
      newSuperior = newDN.slice(parseIndex + 2);
      newDN = newDN.slice(0, parseIndex + 1);
    }
    const req = new ModifyDNRequest({
      messageId: this._nextMessageId(),
      dn: typeof dn === "string" ? dn : dn.toString(),
      deleteOldRdn: true,
      newRdn: typeof newDN === "string" ? newDN : newDN.toString(),
      newSuperior,
      controls
    });
    const result = await this._send(req);
    if (result?.status !== MessageResponseStatus.Success) {
      throw StatusCodeParser.parse(result);
    }
  }
  /**
   * Performs an LDAP search against the server.
   * @param {string|DN} baseDN - This specifies the base of the subtree in which the search is to be constrained.
   * @param {SearchOptions} [options]
   * @param {string|Filter} [options.filter] - The filter of the search request. It must conform to the LDAP filter syntax specified in RFC4515. Defaults to (objectclass=*)
   * @param {string} [options.scope] - Specifies how broad the search context is:
   * - base - Indicates that only the entry specified as the search base should be considered. None of its subordinates will be considered.
   * - one - Indicates that only the immediate children of the entry specified as the search base should be considered. The base entry itself should not be considered, nor any descendants of the immediate children of the base entry.
   * - sub - Indicates that the entry specified as the search base, and all of its subordinates to any depth, should be considered.
   * - children or subordinates - Indicates that the entry specified by the search base should not be considered, but all of its subordinates to any depth should be considered.
   * @param {string} [options.derefAliases] - Specifies how the server must treat references to other entries:
   * - never - Never dereferences entries, returns alias objects instead. The alias contains the reference to the real entry.
   * - always - Always returns the referenced entries, not the alias object.
   * - search - While searching subordinates of the base object, dereferences any alias within the search scope. Dereferenced objects become the bases of further search scopes where the Search operation is also applied by the server. The server should eliminate duplicate entries that arise due to alias dereferencing while searching.
   * - find - Dereferences aliases in locating the base object of the search, but not when searching subordinates of the base object.
   * @param {boolean} [options.returnAttributeValues] - If true, attribute values should be included in the entries that are returned; otherwise entries that match the search criteria should be returned containing only the attribute descriptions for the attributes contained in that entry but should not include the values for those attributes.
   * @param {number} [options.sizeLimit] - This specifies the maximum number of entries that should be returned from the search. A value of zero indicates no limit. Note that the server may also impose a size limit for the search operation, and in that case the smaller of the client-requested and server-imposed size limits will be enforced.
   * @param {number} [options.timeLimit] - This specifies the maximum length of time, in seconds, that the server should spend processing the search. A value of zero indicates no limit. Note that the server may also impose a time limit for the search operation, and in that case the smaller of the client-requested and server-imposed time limits will be enforced.
   * @param {boolean|SearchPageOptions} [options.paged] - Used to allow paging and specify the page size
   * @param {string[]} [options.attributes] - A set of attributes to request for inclusion in entries that match the search criteria and are returned to the client. If a specific set of attribute descriptions are listed, then only those attributes should be included in matching entries. The special value “*” indicates that all user attributes should be included in matching entries. The special value “+” indicates that all operational attributes should be included in matching entries. The special value “1.1” indicates that no attributes should be included in matching entries. Some servers may also support the ability to use the “@” symbol followed by an object class name (e.g., “@inetOrgPerson”) to request all attributes associated with that object class. If the set of attributes to request is empty, then the server should behave as if the value “*” was specified to request that all user attributes be included in entries that are returned.
   * @param {string[]} [options.explicitBufferAttributes] - List of attributes to explicitly return as buffers
   * @param {Control|Control[]} [controls]
   * @returns {Promise<SearchResult>}
   */
  async search(baseDN, options = {}, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (controls) {
      if (Array.isArray(controls)) {
        controls = controls.slice(0);
      } else {
        controls = [controls];
      }
      for (const control of controls) {
        if (control instanceof PagedResultsControl) {
          throw new Error("Should not specify PagedResultsControl");
        }
      }
    } else {
      controls = [];
    }
    let pageSize = 100;
    if (typeof options.paged === "object" && options.paged.pageSize) {
      pageSize = options.paged.pageSize;
    } else if (options.sizeLimit && options.sizeLimit > 1) {
      pageSize = options.sizeLimit - 1;
    }
    let pagedResultsControl;
    const shouldPage = !!options.paged;
    if (shouldPage) {
      pagedResultsControl = new PagedResultsControl({
        value: {
          size: pageSize
        }
      });
      controls.push(pagedResultsControl);
    }
    let filter;
    if (options.filter) {
      if (typeof options.filter === "string") {
        filter = FilterParser.parseString(options.filter);
      } else {
        filter = options.filter;
      }
    } else {
      filter = new PresenceFilter({ attribute: "objectclass" });
    }
    const searchRequest = new SearchRequest({
      messageId: -1,
      // NOTE: This will be set from _sendRequest()
      baseDN: typeof baseDN === "string" ? baseDN : baseDN.toString(),
      scope: options.scope,
      filter,
      attributes: options.attributes,
      explicitBufferAttributes: options.explicitBufferAttributes,
      returnAttributeValues: options.returnAttributeValues,
      sizeLimit: options.sizeLimit,
      timeLimit: options.timeLimit,
      controls
    });
    const searchResult = {
      searchEntries: [],
      searchReferences: []
    };
    await this._sendSearch(searchRequest, searchResult, shouldPage, pageSize, pagedResultsControl);
    return searchResult;
  }
  async *searchPaginated(baseDN, options = {}, controls) {
    if (!this.isConnected) {
      await this._connect();
    }
    if (controls) {
      if (Array.isArray(controls)) {
        controls = controls.slice(0);
      } else {
        controls = [controls];
      }
      for (const control of controls) {
        if (control instanceof PagedResultsControl) {
          throw new Error("Should not specify PagedResultsControl");
        }
      }
    } else {
      controls = [];
    }
    let pageSize = 100;
    if (typeof options.paged === "object" && options.paged.pageSize) {
      pageSize = options.paged.pageSize;
    } else if (options.sizeLimit && options.sizeLimit > 1) {
      pageSize = options.sizeLimit - 1;
    }
    let pagedResultsControl;
    pagedResultsControl = new PagedResultsControl({
      value: {
        size: pageSize
      }
    });
    controls.push(pagedResultsControl);
    let filter;
    if (options.filter) {
      if (typeof options.filter === "string") {
        filter = FilterParser.parseString(options.filter);
      } else {
        filter = options.filter;
      }
    } else {
      filter = new PresenceFilter({ attribute: "objectclass" });
    }
    const searchRequest = new SearchRequest({
      messageId: -1,
      // NOTE: This will be set from _sendRequest()
      baseDN: typeof baseDN === "string" ? baseDN : baseDN.toString(),
      scope: options.scope,
      filter,
      attributes: options.attributes,
      explicitBufferAttributes: options.explicitBufferAttributes,
      returnAttributeValues: options.returnAttributeValues,
      sizeLimit: options.sizeLimit,
      timeLimit: options.timeLimit,
      controls
    });
    do {
      const searchResult = {
        searchEntries: [],
        searchReferences: []
      };
      pagedResultsControl = await this._sendSearch(searchRequest, searchResult, true, pageSize, pagedResultsControl, false);
      yield searchResult;
    } while (pagedResultsControl);
  }
  /**
   * Unbinds this client from the LDAP server.
   * @returns {void|Promise} void if not connected; otherwise returns a promise to the request to disconnect
   */
  async unbind() {
    try {
      if (!this.connected || !this.socket) {
        return;
      }
      const req = new UnbindRequest({
        messageId: this._nextMessageId()
      });
      await this._send(req);
    } finally {
      this._destroySocket(this.socket);
    }
  }
  [Symbol.asyncDispose]() {
    return this.unbind();
  }
  async _sendBind(req) {
    if (!this.isConnected) {
      await this._connect();
    }
    const result = await this._send(req);
    if (result?.status !== MessageResponseStatus.Success) {
      throw StatusCodeParser.parse(result);
    }
  }
  async _sendSearch(searchRequest, searchResult, paged, pageSize, pagedResultsControl, fetchAll = true) {
    searchRequest.messageId = this._nextMessageId();
    const result = await this._send(searchRequest);
    if (result?.status !== MessageResponseStatus.Success && !(result?.status === MessageResponseStatus.SizeLimitExceeded && searchRequest.sizeLimit)) {
      throw StatusCodeParser.parse(result);
    }
    for (const searchEntry of result.searchEntries) {
      searchResult.searchEntries.push(searchEntry.toObject(searchRequest.attributes, searchRequest.explicitBufferAttributes));
    }
    for (const searchReference of result.searchReferences) {
      searchResult.searchReferences.push(...searchReference.uris);
    }
    if (paged && (result.searchEntries.length || result.searchReferences.length) && pagedResultsControl) {
      let pagedResultsFromResponse;
      for (const control of result.controls ?? []) {
        if (control instanceof PagedResultsControl) {
          pagedResultsFromResponse = control;
          break;
        }
      }
      if (pagedResultsFromResponse?.value?.cookie?.length) {
        pagedResultsControl.value = pagedResultsControl.value ?? {
          size: pageSize
        };
        pagedResultsControl.value.cookie = pagedResultsFromResponse.value.cookie;
        if (fetchAll) {
          await this._sendSearch(searchRequest, searchResult, paged, pageSize, pagedResultsControl, true);
        } else {
          return pagedResultsControl;
        }
      }
    }
    return void 0;
  }
  socketDataHandler = (data) => {
    if (this.messageParser) {
      this.messageParser.read(data, this.messageDetailsByMessageId);
    }
  };
  _nextMessageId() {
    this.messageId += 1;
    if (this.messageId >= MAX_MESSAGE_ID) {
      this.messageId = 1;
    }
    return this.messageId;
  }
  /**
   * Open the socket connection
   * @returns {Promise<void>|void}
   * @private
   */
  _connect() {
    if (this.isConnected) {
      return;
    }
    return new Promise((resolve, reject) => {
      if (this.secure) {
        this.socket = tls__namespace.connect(this.port, this.host, this.clientOptions.tlsOptions);
        this.socket.id = crypto__namespace.randomUUID();
        this.socket.once("secureConnect", () => {
          this._onConnect(resolve);
        });
      } else {
        this.socket = net__namespace.connect(this.port, this.host);
        this.socket.id = crypto__namespace.randomUUID();
        this.socket.once("connect", () => {
          this._onConnect(resolve);
        });
      }
      this.socket.once("error", (err) => {
        this._destroySocket(this.socket);
        reject(err);
      });
      if (this.clientOptions.connectTimeout) {
        this.connectTimer = setTimeout(() => {
          this._destroySocket(this.socket);
          reject(new Error("Connection timeout"));
        }, this.clientOptions.connectTimeout);
      }
    });
  }
  _onConnect(next) {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = void 0;
    }
    if (this.socket) {
      this.socket.removeAllListeners("error");
      this.socket.removeAllListeners("connect");
      this.socket.removeAllListeners("secureConnect");
    }
    this.connected = true;
    const socketError = (err) => {
      for (const [key, messageDetails] of this.messageDetailsByMessageId.entries()) {
        if (messageDetails.message instanceof UnbindRequest) {
          messageDetails.resolve();
        } else {
          messageDetails.reject(
            new Error(
              `Socket error. Message type: ${messageDetails.message.constructor.name} (0x${messageDetails.message.protocolOperation.toString(16)})
${err.message || (err.stack ?? "Unknown socket error")}`
            )
          );
        }
        this.messageDetailsByMessageId.delete(key);
      }
      if (this.socket) {
        this.socket.destroy();
      }
    };
    function socketEnd() {
      if (this) {
        this.end();
      }
    }
    function socketTimeout() {
      if (this) {
        this.end();
      }
    }
    const clientInstance = this;
    function socketClose() {
      if (this) {
        this.removeListener("error", socketError);
        this.removeListener("close", socketClose);
        this.removeListener("data", clientInstance.socketDataHandler);
        this.removeListener("end", socketEnd);
        this.removeListener("timeout", socketTimeout);
      }
      if (this === clientInstance.socket) {
        clientInstance.connected = false;
        delete clientInstance.socket;
        if (clientInstance.connectTimer) {
          clearTimeout(clientInstance.connectTimer);
          clientInstance.connectTimer = void 0;
        }
      }
      for (const [key, messageDetails] of clientInstance.messageDetailsByMessageId.entries()) {
        if (messageDetails.socket.id === this.id) {
          if (messageDetails.message instanceof UnbindRequest) {
            messageDetails.resolve();
          } else {
            messageDetails.reject(
              new Error(
                `Connection closed before message response was received. Message type: ${messageDetails.message.constructor.name} (0x${messageDetails.message.protocolOperation.toString(16)})`
              )
            );
          }
          clientInstance.messageDetailsByMessageId.delete(key);
        }
      }
    }
    if (this.socket) {
      this.socket.on("error", socketError);
      this.socket.on("close", socketClose);
      this.socket.on("data", this.socketDataHandler);
      this.socket.on("end", socketEnd);
      this.socket.on("timeout", socketTimeout);
    }
    next();
  }
  _destroySocket(socket) {
    if (socket) {
      if (this.connectTimer) {
        clearTimeout(this.connectTimer);
        this.connectTimer = void 0;
      }
      socket.removeAllListeners("error");
      socket.on("error", () => {
      });
      socket.end();
      socket.destroy();
      if (socket === this.socket) {
        this.connected = false;
        this.socket = void 0;
      }
    }
  }
  /**
   * Sends request message to the ldap server over the connected socket. Each message request is given a
   * unique id (messageId), used to identify the associated response when it is sent back over the socket.
   * @returns {Promise<Message>}
   * @private
   * @param {object} message
   */
  _send(message) {
    if (!this.connected || !this.socket) {
      throw new Error("Socket connection not established");
    }
    const messageContentBuffer = message.write();
    const messageTimeoutId = this.clientOptions.timeout ? setTimeout(() => {
      const messageDetails = this.messageDetailsByMessageId.get(message.messageId.toString());
      if (messageDetails) {
        this._destroySocket(messageDetails.socket);
        messageReject(new Error(`${message.constructor.name}: Operation timed out`));
      }
    }, this.clientOptions.timeout) : null;
    let messageResolve = () => {
    };
    let messageReject = () => {
    };
    const sendPromise = new Promise((resolve, reject) => {
      messageResolve = resolve;
      messageReject = reject;
    }).finally(() => {
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }
    });
    this.messageDetailsByMessageId.set(message.messageId.toString(), {
      message,
      // @ts-expect-error - Both parameter types extend MessageResponse but typescript sees them as different types
      resolve: messageResolve,
      reject: messageReject,
      timeoutTimer: messageTimeoutId,
      socket: this.socket
    });
    if (message.password) {
      logDebug(
        `Sending message: ${JSON.stringify({
          // eslint-disable-next-line @typescript-eslint/no-misused-spread
          ...message,
          password: "__redacted__"
        })}`
      );
    } else {
      logDebug(`Sending message: ${JSON.stringify(message)}`);
    }
    this.socket.write(messageContentBuffer, () => {
      if (message instanceof AbandonRequest) {
        logDebug(`Abandoned message: ${message.messageId}`);
        this.messageDetailsByMessageId.delete(message.messageId.toString());
        messageResolve();
      } else if (message instanceof UnbindRequest) {
        logDebug("Unbind success. Ending socket");
        if (this.socket) {
          this._destroySocket(this.socket);
        }
      } else {
        logDebug("Message sent successfully.");
      }
    });
    return sendPromise;
  }
  _handleSendResponse(message) {
    const messageDetails = this.messageDetailsByMessageId.get(message.messageId.toString());
    if (messageDetails) {
      if (message instanceof SearchEntry) {
        messageDetails.searchEntries = messageDetails.searchEntries ?? [];
        messageDetails.searchEntries.push(message);
      } else if (message instanceof SearchReference) {
        messageDetails.searchReferences = messageDetails.searchReferences ?? [];
        messageDetails.searchReferences.push(message);
      } else if (message instanceof SearchResponse) {
        if (messageDetails.searchEntries) {
          message.searchEntries.push(...messageDetails.searchEntries);
        }
        if (messageDetails.searchReferences) {
          message.searchReferences.push(...messageDetails.searchReferences);
        }
        this.messageDetailsByMessageId.delete(message.messageId.toString());
        messageDetails.resolve(message);
      } else {
        this.messageDetailsByMessageId.delete(message.messageId.toString());
        messageDetails.resolve(message);
      }
    } else {
      logDebug(`Unable to find details related to message response: ${JSON.stringify(message)}`);
    }
  }
}

function encodePostalAddress(address, separator = "\n") {
  return address.split(separator).map((line) => line.replaceAll("\\", "\\5C").replaceAll("$", "\\24")).join("$");
}
function decodePostalAddress(encoded, separator = "\n") {
  return encoded.split("$").map((line) => line.replace(/\\(5c|24)/gi, (_, code) => code === "24" ? "$" : "\\")).join(separator);
}

exports.AbandonRequest = AbandonRequest;
exports.AddRequest = AddRequest;
exports.AddResponse = AddResponse;
exports.AdminLimitExceededError = AdminLimitExceededError;
exports.AffectsMultipleDSAsError = AffectsMultipleDSAsError;
exports.AliasDerefProblemError = AliasDerefProblemError;
exports.AliasProblemError = AliasProblemError;
exports.AlreadyExistsError = AlreadyExistsError;
exports.AndFilter = AndFilter;
exports.ApproximateFilter = ApproximateFilter;
exports.Attribute = Attribute;
exports.AuthMethodNotSupportedError = AuthMethodNotSupportedError;
exports.Ber = Ber;
exports.BerReader = BerReader;
exports.BerWriter = BerWriter;
exports.BindRequest = BindRequest;
exports.BindResponse = BindResponse;
exports.BusyError = BusyError;
exports.Change = Change;
exports.Client = Client;
exports.CompareRequest = CompareRequest;
exports.CompareResponse = CompareResponse;
exports.CompareResult = CompareResult;
exports.ConfidentialityRequiredError = ConfidentialityRequiredError;
exports.ConstraintViolationError = ConstraintViolationError;
exports.Control = Control;
exports.ControlParser = ControlParser;
exports.DN = DN;
exports.DeleteRequest = DeleteRequest;
exports.DeleteResponse = DeleteResponse;
exports.EntryChangeNotificationControl = EntryChangeNotificationControl;
exports.EqualityFilter = EqualityFilter;
exports.ExtendedRequest = ExtendedRequest;
exports.ExtendedResponse = ExtendedResponse;
exports.ExtendedResponseProtocolOperations = ExtendedResponseProtocolOperations;
exports.ExtensibleFilter = ExtensibleFilter;
exports.Filter = Filter;
exports.FilterParser = FilterParser;
exports.GreaterThanEqualsFilter = GreaterThanEqualsFilter;
exports.InappropriateAuthError = InappropriateAuthError;
exports.InappropriateMatchingError = InappropriateMatchingError;
exports.InsufficientAccessError = InsufficientAccessError;
exports.InvalidAsn1Error = InvalidAsn1Error;
exports.InvalidCredentialsError = InvalidCredentialsError;
exports.InvalidDNSyntaxError = InvalidDNSyntaxError;
exports.InvalidSyntaxError = InvalidSyntaxError;
exports.IsLeafError = IsLeafError;
exports.LessThanEqualsFilter = LessThanEqualsFilter;
exports.LoopDetectError = LoopDetectError;
exports.MessageParser = MessageParser;
exports.MessageParserError = MessageParserError;
exports.MessageResponseStatus = MessageResponseStatus;
exports.ModifyDNRequest = ModifyDNRequest;
exports.ModifyDNResponse = ModifyDNResponse;
exports.ModifyRequest = ModifyRequest;
exports.ModifyResponse = ModifyResponse;
exports.MoreResultsToReturnError = MoreResultsToReturnError;
exports.NamingViolationError = NamingViolationError;
exports.NoObjectClassModsError = NoObjectClassModsError;
exports.NoResultError = NoResultError;
exports.NoSuchAttributeError = NoSuchAttributeError;
exports.NoSuchObjectError = NoSuchObjectError;
exports.NotAllowedOnNonLeafError = NotAllowedOnNonLeafError;
exports.NotAllowedOnRDNError = NotAllowedOnRDNError;
exports.NotFilter = NotFilter;
exports.ObjectClassViolationError = ObjectClassViolationError;
exports.OperationsError = OperationsError;
exports.OrFilter = OrFilter;
exports.PagedResultsControl = PagedResultsControl;
exports.PersistentSearchControl = PersistentSearchControl;
exports.PresenceFilter = PresenceFilter;
exports.ProtocolError = ProtocolError;
exports.ProtocolOperation = ProtocolOperation;
exports.ResultCodeError = ResultCodeError;
exports.ResultsTooLargeError = ResultsTooLargeError;
exports.SASL_MECHANISMS = SASL_MECHANISMS;
exports.SaslBindInProgressError = SaslBindInProgressError;
exports.SearchEntry = SearchEntry;
exports.SearchFilter = SearchFilter;
exports.SearchReference = SearchReference;
exports.SearchRequest = SearchRequest;
exports.SearchResponse = SearchResponse;
exports.ServerSideSortingRequestControl = ServerSideSortingRequestControl;
exports.SizeLimitExceededError = SizeLimitExceededError;
exports.StatusCodeParser = StatusCodeParser;
exports.StrongAuthRequiredError = StrongAuthRequiredError;
exports.SubstringFilter = SubstringFilter;
exports.TLSNotSupportedError = TLSNotSupportedError;
exports.TimeLimitExceededError = TimeLimitExceededError;
exports.TypeOrValueExistsError = TypeOrValueExistsError;
exports.UnavailableCriticalExtensionError = UnavailableCriticalExtensionError;
exports.UnavailableError = UnavailableError;
exports.UnbindRequest = UnbindRequest;
exports.UndefinedTypeError = UndefinedTypeError;
exports.UnknownStatusCodeError = UnknownStatusCodeError;
exports.UnwillingToPerformError = UnwillingToPerformError;
exports.decodePostalAddress = decodePostalAddress;
exports.encodePostalAddress = encodePostalAddress;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;

// --------------------------------------------------------------------------------- 
// Corhoma - Informática e Ingeniería
// Programa de test sgf_node_idpas_tst - test integracion con Signafile / AD    
// v1.02 - 20260317
// ---------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", ({ value: true }));
//import * as path from "node:path";
const path = __nccwpck_require__(760);
//import * as fs   from "node:fs"; 
const fs = __nccwpck_require__(24);
//import * as ini  from "ini";     // ← agregar esto
const ini = __nccwpck_require__(756);
//import { read_gen_bb } from "./read_gen_bb.js";
const { read_gen_bb } = __nccwpck_require__(312);
//import { read_ini,  } from "./read_ini.js";
const { read_ini } = __nccwpck_require__(993);
//import { buscar_usuario } from "./buscar_usuario.js";
const { buscar_usuario } = __nccwpck_require__(927);
//import { Client, type SearchOptions } from "ldapts"; // Añadimos 'type'
const { Client } = __nccwpck_require__(752);
//import { escribir_string_file_log , escribir_end_buflog, escribir_header_buflog, escribir_proc_buflog, }  from "./escribir_log.js";
//import {  escribir_buf_log, escribir_buff_after_read_bb} from "./escribir_log.js";
//import {  grabar_array_to_file_log} from "./escribir_log.js";
const { escribir_string_file_log, escribir_end_buflog, escribir_header_buflog, escribir_proc_buflog, escribir_buf_log, escribir_buff_after_read_bb, grabar_array_to_file_log } = __nccwpck_require__(296);
// ─── FUNCIÓN DE LOG ───────────────────────────────────────
/*
buflog("Inicio");
buflog("Paso 1");
buflog("Paso 2");

console.log(bufferSalidaLog.join("\n"));
*/
function timestampArchivo() {
    //Cambiamos a esta version porque el ISO muestra la hora UTC
    const d = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return (d.getFullYear().toString() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds()));
}
// ---------------------------------------------------------------------
// MAIN FUNCION PRINCIPAL
// ---------------------------------------------------------------------
async function main() {
    // defino la variabla para el codigo de salida
    let SalCode = 0;
    // alli es donde se agragaran los mensajes 
    const bufferSalidaLog = [];
    // genero la cabecera archivo de log
    escribir_header_buflog(bufferSalidaLog);
    // variable para guardar los mensajes de error de los catch 
    var msg_log = "";
    // variable para guardar la IniConfig
    let datos_ini = {};
    // ------------------------------
    // genero la priemera parte del log de Error   
    let diayhora = timestampArchivo();
    var logPath = diayhora + "_Sgf_node_idpas_test_Error.log";
    try {
        // -----------------------
        // leo el archivo de configuracion    
        // -----------------------
        datos_ini = await read_ini();
        let filelog = diayhora + "_" + datos_ini.LOG_FPATH;
        logPath = path.join(process.cwd(), filelog);
        // 1 ─ borrar log anterior si existe ────────────────────────
        if (fs.existsSync(logPath)) {
            fs.unlinkSync(logPath);
        }
        /*
        // --- MOSTRAR VALORES INI ---------------------------------
        console.log("// -----------------------");
        console.log("MOSTRAR VALORES INI SGF_NODE_IDPAS_TEST"),
        console.log("LDAP_SERVER", datos_ini.LDAP_SERVER),
        console.log("LDAP_PORT:", datos_ini.LDAP_PORT);
        console.log("LDAPS:", datos_ini.LDAPS);
        console.log("CUBB_PATH:", datos_ini.CUBB_PATH);
        console.log("BASE_DN:", datos_ini.BASE_DN );
        console.log("CERT_PATH:", datos_ini.CERT_PATH);
        console.log("USUARIO:", datos_ini.USUARIO);
        console.log("LOG_PATH:", datos_ini.LOG_FPATH);
        */
    }
    catch (error) {
        msg_log = "\n No pudo leer el archivo de configuracion: " + error;
        SalCode = 307;
        // ─── escribe en el archivo ───────────────────────────
        escribir_string_file_log(msg_log, logPath);
        process.exit(SalCode);
    }
    // ----------------------------------------------
    // recupera usuario y password de la caja negra
    // ----------------------------------------------
    // defino el buffer para acumular la salida a imprimir
    const BBpath = datos_ini.CUBB_PATH;
    const file = "sgf_node_idpas_tst.HKF";
    let usrbind = "";
    let usrbindpwd = "";
    // armo el string  para conectarme al servidor lDAP y 
    let ldap_protocol = "ldap://";
    if (datos_ini.LDAPS === "S" || datos_ini.LDAPS === "s") {
        ldap_protocol = "ldaps://";
    }
    // defino la variablde del ldap server address que ya lei  del ini
    // y usare en el log cuando lea OK la caja negra 
    let url = "";
    try {
        //console.log("// -----------------------");
        //console.log("BB path:", BBpath);
        //console.log("BB file:", file);
        // uso la funcion read_gen_bb del modulo read_gen_bb        
        const resultado = await read_gen_bb(BBpath, file);
        //console.log("  ");
        //console.log("RESULTADO CAJA NEGRA  ");
        //console.log("RC:", resultado.rc);
        //console.log("USR:", resultado.usr);
        //console.log("PWD:", "************");
        usrbind = resultado.usr;
        usrbindpwd = resultado.pwd;
        SalCode = 300;
        if (resultado.rc != 0) {
            SalCode = SalCode + resultado.rc;
            let msg_log = "\n Error leyendo caja negra:" + SalCode;
            escribir_buf_log(msg_log, bufferSalidaLog);
            grabar_array_to_file_log(bufferSalidaLog, logPath);
            process.exit(SalCode);
        }
        else {
            // lei BB e INI OK 
            // -----------------------
            // LDAP protocolo 
            // -----------------------
            /*
            let ldap_protocol: string = "ldap://";
        
            if ( datos_ini.LDAPS === "S" || datos_ini.LDAPS === "s" )  {
                ldap_protocol = "ldaps://";
            }
             */
            // ej: ldap://172.16.100.29:60389
            url = ldap_protocol + datos_ini.LDAP_SERVER + ":" + datos_ini.LDAP_PORT;
            //  console.log("LDAP URL:", url);
            // -----------------------
            // LDAP construyo DN de bind
            // -----------------------
            // ej: CN=sgfusrbind,CN=CRHADLDS,DC=SIGNAFILE
            const fq_usr_bind = "CN=" + usrbind + "," + datos_ini.BASE_DN;
            //console.log("// -----------------------");
            //console.log("LDAP bindDN:", fq_usr_bind);
            escribir_buff_after_read_bb(usrbind, datos_ini.USUARIO, url, bufferSalidaLog);
        }
    }
    catch (error) {
        SalCode = 308;
        msg_log = "Error " + SalCode + " leyendo caja negra: " + error;
        console.error(msg_log);
        // ─── escribe en el buffer
        escribir_buf_log(msg_log, bufferSalidaLog);
        grabar_array_to_file_log(bufferSalidaLog, logPath);
        process.exit(SalCode);
    }
    // -----------------------
    // LDAP protocolo 
    // -----------------------
    if (datos_ini.LDAPS === "S" || datos_ini.LDAPS === "s") {
        ldap_protocol = "ldaps://"; // se asumia sin segiridad aqui s eseteal con seguridad
    }
    //  console.log("LDAP URL:", url);
    // -----------------------
    // LDAP construyo DN de bind
    // -----------------------
    // ej: CN=sgfusrbind,CN=CRHADLDS,DC=SIGNAFILE
    const fq_usr_bind = "CN=" + usrbind + "," + datos_ini.BASE_DN;
    //console.log("// -----------------------");
    //console.log("LDAP bindDN:", fq_usr_bind);
    // -----------------------
    // LDAP configuracion 
    // -----------------------
    // ─── armar config con datos del .ini y caja negra ─────
    const config = {
        url: url,
        baseDN: datos_ini.BASE_DN,
        bindDN: fq_usr_bind,
        bindPassword: usrbindpwd
    };
    // console.log("LDAP CONFIG:", config);
    let usuario = "";
    if (datos_ini?.USUARIO) {
        usuario = datos_ini.USUARIO;
    }
    else {
        usuario = 'USRADMIN';
    }
    console.log("\n"); // linea en blanco 
    // -------------------------------------------
    // LLAMAR A LA FUNCION LDAP
    // -------------------------------------------
    const res = await buscar_usuario(usuario, config, bufferSalidaLog, logPath);
    escribir_proc_buflog(config, res.grupos, bufferSalidaLog);
    // termino la ejecucion  graba el buffer
    grabar_array_to_file_log(bufferSalidaLog, logPath);
    // 2 — escribir header  ────────────────────────
    // escribir_log_header(logPath);
    // 3 — resto del código  ────────────────────────
    //escribir_log(
    //    config,             // para config.url
    //    usrbind,            // para bb.usr
    //    usuario,// usuario testeado
    //    res.grupos,         // array de grupos
    //    logPath             // path del .log
    //);
}
// ejecutar programa
main();
//# sourceMappingURL=sgf_node_idpas_test.js.map
})();

module.exports = __webpack_exports__;
/******/ })()
;
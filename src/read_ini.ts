/*   ----------------------------------------------------------------
	* lectura del archivo INI para el programa Sgf_node_idpas_test
	*         
	* @author  Corhoma srl. (c) 2026 - 
	* @version 1.05.  2026/03/17
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

// ─── DEPENDENCIAS ─────────────────────────────────────────

//import * as path from "node:path";

const path = require("node:path");

//import * as fs   from "node:fs"; // ← agregar esto
const fs = require("node:fs");

//import * as ini  from "ini";     // ← agregar esto
const ini = require("ini");

import type { IniConfig } from "./types";

// --- LEER ARCHIVO INI -------------------------------------


async function read_ini(): Promise<IniConfig> {

  const salida: IniConfig = {
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
.*/

	salida.LDAP_SERVER = iniData.node_idpas_cfg.LDAP_SERVER;
	salida.LDAP_PORT = iniData.node_idpas_cfg.LDAP_PORT;
	salida.LDAPS  = iniData.node_idpas_cfg.LDAPS;
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

module.exports = { read_ini  }

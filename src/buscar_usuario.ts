/* --------------------------------------------------------------
	* Busqueda de un usuario en LDAP y/O Active directory 
	*         
	* @author  Corhoma srl. (c) 2026 - convertido from php
	* @version 1.05.  2026/03/26
    * 
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



// ─── DEPENDENCIAS ─────────────────────────────────────────
//import * as path from "node:path";
const path = require("node:path");

//import {  escribir_buf_log } from "./escribir_log.js";
//import {  grabar_array_to_file_log} from "./escribir_log.js";
const { escribir_buf_log, grabar_array_to_file_log } = require("./escribir_log");

// podemos importar varia funciones n un alinea 
//import { Client, type SearchOptions } from "ldapts"; // Añadimos 'type'
const { Client } = require("ldapts");

// para mantener el tipado en el .ts
import type { SearchOptions } from "ldapts";

import type { LdapConfig, LdapResult, IniConfig } from "./types";

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────

async function buscar_usuario(usuario: string, config: LdapConfig, flogBuff: string[], flogpath: string  ): Promise<LdapResult> {
		
	const resultado: LdapResult = {
        encontrado : false,
        cn         : "",
        dn         : "",
        grupos     : []
    };
	
    
    const client = new Client({
        url: config.url
    })

    try {

        console.log("Conectando al LDAP...")

        let bind_msg_resultado = "Bind LDAP exitoso - Autenticado correctamente" ; // asumo este 
        let usr_test_msg = "" ;  //lo usaremos para informar siu existe o no ... 
        //       
        try {

           await client.bind(config.bindDN, config.bindPassword);

           console.log( bind_msg_resultado );


        } catch ( error: any) {

            bind_msg_resultado = " Error (202): "+error.message+" Código LDAP: "+error.code+ " Nombre error: "+ error.name ;

            console.log (bind_msg_resultado);

            escribir_buf_log ( bind_msg_resultado ,flogBuff) ;

            grabar_array_to_file_log (flogBuff, flogpath ) ;

            let error_bind = 201 ;
            
            process.exit( error_bind );
        
        }    

        escribir_buf_log ( bind_msg_resultado, flogBuff ) ;
        
        const filtro: string = `(cn=${usuario})`

        const options: SearchOptions = {
            scope: "sub",
            filter: filtro,
            attributes: ["dn", "cn", "memberOf"]
        }

        console.log(`Buscando usuario: ${usuario}`)

        const { searchEntries } = await client.search(config.baseDN, options)

        if (searchEntries.length === 0) {

            usr_test_msg= `Usuario ${usuario} no encontrado` ;

            console.log(usr_test_msg );

            escribir_buf_log ( usr_test_msg,flogBuff );

        } else {

            for (const entry of searchEntries) {

                console.log("\nUsuario encontrado")

                console.log("CN:", entry.cn)
                console.log("DN:", entry.dn)

				resultado.encontrado = true;
                resultado.cn         = entry.cn?.toString() ?? "";
                resultado.dn         = entry.dn?.toString() ?? "";
				
                const grupos =
                    entry.memberOf
                        ? (Array.isArray(entry.memberOf)
                            ? entry.memberOf
                            : [entry.memberOf])
                        : []

                if (grupos.length > 0) {					

                    let grupos_msg = `\nGrupos (${grupos.length})`;
                    escribir_buf_log (grupos_msg, flogBuff );
                    
                    console.log(grupos_msg)  ;                   
                   
                    grupos.forEach((g: string | Buffer, i: number) => {
                        resultado.grupos.push(g.toString());
						
                        const valor = g.toString(); // .toString() funciona tanto en string como en Buffer
					    console.log(`[${i + 1}] ${g}`)
                    })

                } else {

                    const no_group_msg =  "Sin grupos asignados";
                    console.log(no_group_msg) ;
                     
                    escribir_buf_log ( no_group_msg,flogBuff );

                }

            }

        }

        console.log("\nBúsqueda finalizada")

    } catch (err: any) {

        let msg = "Error creacion cliente (201): " + err.message ;

        console.error(msg);

        escribir_buf_log ( msg ,flogBuff );

    } finally {

        await client.unbind()
        console.log("Conexión cerrada")

    }
	return resultado;

}



async function validar_usuario(usrval: string, usrvalpas: string, cconfig: LdapConfig , flogBuff: string[] , flogpath: string , iniconf: IniConfig  ): Promise <number> {

 let vu_ret = 0;

    const client1 = new Client({
        url: cconfig.url
    });

    const fq_usuario = "CN=" + usrval + "," + iniconf.BASE_DN;

    // console.log("FQ a validar: " + fq_usuario);

    try {
        await client1.bind(fq_usuario, usrvalpas);

        // ✔ si llega acá → OK
        vu_ret = 0;

    } catch (error: any) {

        const bind_msg_resultado =
            "Error (203): " + error.message +
            " Código LDAP: " + error.code +
            " Nombre error: " + error.name;

        console.log(bind_msg_resultado);

        escribir_buf_log(bind_msg_resultado, flogBuff);
        grabar_array_to_file_log(flogBuff, flogpath);

        vu_ret = 203;

        // ❌ NO usar process.exit acá

    } finally {
        try {
            await client1.unbind();
        } catch (e) {
            // evitar que falle si ya estaba cerrado
        }
        console.log("Conexión cerrada");
    }

    return vu_ret;
}

module.exports = { validar_usuario,  buscar_usuario  }




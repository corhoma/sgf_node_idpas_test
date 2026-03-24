// --------------------------------------------------------------------------------- 
// Corhoma - Informática e Ingeniería
// Programa de test sgf_node_idpas_tst - test integracion con Signafile / AD    
// v1.03 - 20260324
// ---------------------------------------------------------------------------------

//import * as path from "node:path";
const path = require("node:path");

//import * as fs   from "node:fs"; 
const fs = require("node:fs");

//import * as ini  from "ini";     // ← agregar esto
const ini = require("ini");

//import { read_gen_bb } from "./read_gen_bb.js";
const { read_gen_bb } = require("./read_gen_bb");

//import { read_ini,  } from "./read_ini.js";
const { read_ini } = require("./read_ini");

const readline = require('readline/promises');

//import { buscar_usuario } from "./buscar_usuario.js";
const { buscar_usuario , validar_usuario } = require("./buscar_usuario");

//import { Client, type SearchOptions } from "ldapts"; // Añadimos 'type'
const { Client } = require("ldapts");

//import { escribir_string_file_log , escribir_end_buflog, escribir_header_buflog, escribir_proc_buflog, }  from "./escribir_log.js";
//import {  escribir_buf_log, escribir_buff_after_read_bb} from "./escribir_log.js";
//import {  grabar_array_to_file_log} from "./escribir_log.js";
const { escribir_string_file_log , escribir_end_buflog, escribir_header_buflog, escribir_proc_buflog, 
		escribir_buf_log, escribir_buff_after_read_bb,
		grabar_array_to_file_log} = require("./escribir_log");

// para mantener el tipado en el .ts
import type { SearchOptions } from "ldapts";

//import type
import type { IniConfig, BBResult, LdapConfig, LdapResult } from "./types.js";


// ─── FUNCIÓN DE LOG ───────────────────────────────────────

/*
buflog("Inicio");
buflog("Paso 1");
buflog("Paso 2");

console.log(bufferSalidaLog.join("\n"));
*/


function timestampArchivo(): string {
    	
	//Cambiamos a esta version porque el ISO muestra la hora UTC

	const d = new Date();

    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
        d.getFullYear().toString() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds())
    );

}

// ---------------------------------------------------------------------
// MAIN FUNCION PRINCIPAL
// ---------------------------------------------------------------------
async function main(): Promise<void> {
    
    // defino la variabla para el codigo de salida
    let SalCode = 0 ;
    
    // alli es donde se agragaran los mensajes 
    const bufferSalidaLog: string[] = [];
	
    // genero la cabecera archivo de log
    escribir_header_buflog( bufferSalidaLog) ;
    
    // variable para guardar los mensajes de error de los catch 
    var msg_log = "" ;

    // variable para guardar la IniConfig
    let datos_ini = {} as IniConfig; 

    // ------------------------------
    // genero la priemera parte del log de Error   
 
    let diayhora = timestampArchivo() ;
		
    var logPath = diayhora +"_Sgf_node_idpas_test_Error.log";

    try {
    
    // -----------------------
    // leo el archivo de configuracion    
	// -----------------------
     datos_ini = await read_ini();
       
    let filelog = diayhora +"_"+ datos_ini.LOG_FPATH ;

    logPath = path.join(process.cwd(), filelog );

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
    catch(error){

       msg_log = "\n No pudo leer el archivo de configuracion: "+ error ;
       
       SalCode = 307 ;

       // ─── escribe en el archivo ───────────────────────────
       escribir_string_file_log(msg_log, logPath);

       process.exit( SalCode )

    }

    // ----------------------------------------------
    // SOLICITO USUARIO Y PASSWORD PARA VALIDAR 
    // ----------------------------------------------

   
   // const readline = require('readline');

let usuario_a_validar: string = "";
let pass_usuario: string = "";

    const readline = require('readline/promises');
    const { stdin: input, stdout: output } = require('process');

    const rl = readline.createInterface({ input, output });

    usuario_a_validar = await rl.question('\n Ingrese el usuario a validar: ');
    //console.log('Ingresaste:', usuario);

    pass_usuario = await rl.question('\n Ingrese la clave del usuario a validar: ');
    //console.log('Ingresaste:', pass);

    rl.close();


    //  console.log("LDAP URL:", url);
    
    // armo el string  para conectarme al servidor lDAP y 
    let ldap_protocol: string = "ldap://";

    if ( datos_ini.LDAPS === "S" || datos_ini.LDAPS === "s" )  {
        ldap_protocol = "ldaps://";
    }

     // defino la variablde del ldap server address que ya lei  del ini
    // y usare en el log cuando lea OK la caja negra 
    let url: string = "" ;   
    
    // ej: ldap://172.16.100.29:60389
    url = ldap_protocol + datos_ini.LDAP_SERVER + ":" +	datos_ini.LDAP_PORT;

    //  console.log("LDAP URL:", url);

    // ARMO EL FQN DEL USUARIO A VALIDAR 
    let fq_usuario_a_validar: string = "CN=" + usuario_a_validar + "," + datos_ini.BASE_DN;
	
    // ----------------------------------------------
    // valido el usuario 
    // ----------------------------------------------

     const usr_val_config: LdapConfig = {
        url: url,
        baseDN: datos_ini.BASE_DN,
        bindDN: fq_usuario_a_validar,
        bindPassword: pass_usuario 
    };

    const resultado_validar = await validar_usuario( usuario_a_validar , pass_usuario, usr_val_config , bufferSalidaLog , logPath , datos_ini  ) ;

    //console.log ( "resultado validar:" + resultado_validar );



    if ( resultado_validar != 0 ){

        SalCode = 204  ;

        let msg_log = "\n Error validaddo el usuario " ;
          
        escribir_buf_log ( msg_log, bufferSalidaLog ) ;

        grabar_array_to_file_log (bufferSalidaLog, logPath ) ;

        console.log ( msg_log );

    }else{

        let msg_log = "\n Usuario validado correctamente" ;
          
        escribir_buf_log ( msg_log, bufferSalidaLog ) ;

        grabar_array_to_file_log (bufferSalidaLog, logPath ) ;

        console.log ( msg_log );
    }



    // ----------------------------------------------
    // recupera usuario y password de la caja negra
    // ----------------------------------------------


    // defino el buffer para acumular la salida a imprimir
    
    const BBpath: string = datos_ini.CUBB_PATH;
    const file: string = "sgf_node_idpas_tst.HKF";

    let usrbind: string = "";
    let usrbindpwd: string = "";

   
    try {
        
        //console.log("// -----------------------");
		//console.log("BB path:", BBpath);
		//console.log("BB file:", file);
        // uso la funcion read_gen_bb del modulo read_gen_bb        
		
        const resultado: BBResult = await read_gen_bb(BBpath, file);
		
		//console.log("  ");
		//console.log("RESULTADO CAJA NEGRA  ");
        //console.log("RC:", resultado.rc);
		//console.log("USR:", resultado.usr);
		//console.log("PWD:", "************");
        
        usrbind = resultado.usr;
        usrbindpwd = resultado.pwd;
        
        SalCode = 300 ;
        if ( resultado.rc != 0 ){

            SalCode = SalCode + resultado.rc ;

            let msg_log = "\n Error leyendo caja negra:"+ SalCode ;
          
            escribir_buf_log ( msg_log, bufferSalidaLog ) ;

            grabar_array_to_file_log (bufferSalidaLog, logPath ) ;

            process.exit(SalCode);
        } else {
 
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
    url = ldap_protocol + datos_ini.LDAP_SERVER + ":" +	datos_ini.LDAP_PORT;

    //  console.log("LDAP URL:", url);
		
    // -----------------------
    // LDAP construyo DN de bind
    // -----------------------

    // ej: CN=sgfusrbind,CN=CRHADLDS,DC=SIGNAFILE
    const fq_usr_bind: string = "CN=" + usrbind + "," + datos_ini.BASE_DN;
	
	//console.log("// -----------------------");
	//console.log("LDAP bindDN:", fq_usr_bind);
	
        escribir_buff_after_read_bb(usrbind, datos_ini.USUARIO, url ,bufferSalidaLog) ; 
        }       

    } catch (error) {
       
       SalCode = 308 ; 
        
       msg_log = "Error "+ SalCode +" leyendo caja negra: "+ error ;
       console.error(msg_log);
         
       // ─── escribe en el buffer
       escribir_buf_log ( msg_log,bufferSalidaLog ) ;

       grabar_array_to_file_log (bufferSalidaLog, logPath ) ;

       process.exit( SalCode ) ;

    }

	
	// -----------------------
    // LDAP protocolo 
    // -----------------------



    if ( datos_ini.LDAPS === "S" || datos_ini.LDAPS === "s" )  {
        ldap_protocol = "ldaps://";   // se asumia sin segiridad aqui s eseteal con seguridad
    }

    //  console.log("LDAP URL:", url);
	
    // -----------------------
    // LDAP construyo DN de bind
    // -----------------------

    // ej: CN=sgfusrbind,CN=CRHADLDS,DC=SIGNAFILE
    const fq_usr_bind: string = "CN=" + usrbind + "," + datos_ini.BASE_DN;
	
	//console.log("// -----------------------");
	//console.log("LDAP bindDN:", fq_usr_bind);
	
    // -----------------------
    // LDAP configuracion 
    // -----------------------

    // ─── armar config con datos del .ini y caja negra ─────
    const config: LdapConfig = {
        url: url,
        baseDN: datos_ini.BASE_DN,
        bindDN: fq_usr_bind,
        bindPassword: usrbindpwd
    };

    // console.log("LDAP CONFIG:", config);
	
	let usuario: string = "";
	if ( datos_ini?.USUARIO)  {
        usuario = datos_ini.USUARIO;
    } else  {
		usuario = 'USRADMIN';
	}
	
    console.log("\n");   // linea en blanco 


    // -------------------------------------------
    // LLAMAR A LA FUNCION LDAP
    // -------------------------------------------
	
    const res: LdapResult = await buscar_usuario(usuario, config , bufferSalidaLog, logPath )  ;
   
    escribir_proc_buflog ( config, res.grupos ,bufferSalidaLog) ;

    // termino la ejecucion  graba el buffer
	grabar_array_to_file_log( bufferSalidaLog , logPath ) ;
	
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

const { Client } = require("ldapts");

// para mantener el tipado en el .ts
import type { SearchOptions } from "ldapts";


async function main() {


//let bindusr = 'sgfusrbind@crhm-cloud-labo.dev';
//let bindusr = 'CN=sgfusrbind,OU=USUARIOS,DC=crhm-cloud-labo,DC=dev';
//let  bindPassword ='sgfusrpass01..' ;
//let usuario = 'USRADMIN';

let bindusr = 'USRCONSULTA@crhm-cloud-labo.dev';
//let bindusr = 'CN=sgfusrbind,OU=USUARIOS,DC=crhm-cloud-labo,DC=dev';  
let  bindPassword ='FIRM01..' ;
let usuario = 'USRCONSULTA';


const client = new Client({
        url: 'ldap://172.16.100.53:389'
    })

    console.log("Conectando al LDAP...")

        let bind_msg_resultado = "Bind LDAP exitoso - Autenticado correctamente" ; // asumo este 
        //       
        try {

           await client.bind( bindusr, bindPassword);

           console.log( bind_msg_resultado );


        } catch ( error: any) {

            bind_msg_resultado = " Error (202): "+error.message+" Código LDAP: "+error.code+ " Nombre error: "+ error.name ;

            console.log (bind_msg_resultado);

        }    




  // 🔑 generar DN correcto
    const base_dn = "crhm-cloud-labo.dev";

    
     const baseDN = base_dn
    .split(".")
    .map(p => `DC=${p}`)
    .join(",");
       

    // let  baseDN= "OU=Usuarios,DC=crhm-cloud-labo,DC=dev" ;    
   // let  baseDN= "DC=crhm-cloud-labo,DC=dev" ;        


    console.log ( baseDN ) ;   


      const options: SearchOptions = {
        scope: 'sub',
        filter: `(&(objectClass=user)(sAMAccountName=${usuario}))`,
        attributes: ["dn", "cn", "memberOf"]
    };


  console.log(`Buscando usuario: ${usuario}`) ;

  const { searchEntries } = await client.search(  baseDN , options) ;

   if (searchEntries.length === 0) {

            let  usr_test_msg= `Usuario ${usuario} no encontrado` ;

            console.log(usr_test_msg );

        } else {

            for (const entry of searchEntries) {

                console.log("\nUsuario encontrado") ;

                console.log("CN:", entry.cn) ;
                console.log("DN:", entry.dn) ;

				
				
                const grupos =
                    entry.memberOf
                        ? (Array.isArray(entry.memberOf)
                            ? entry.memberOf
                            : [entry.memberOf])
                        : []

                if (grupos.length > 0) {					

                    let grupos_msg = `\nGrupos (${grupos.length})`;
                    
                    console.log(grupos_msg)  ;                   
                   
                    grupos.forEach ((g: string | Buffer, i: number) => {
                        
                        const valor = g.toString(); // .toString() funciona tanto en string como en Buffer
					    console.log(`[${i + 1}] ${g}`) ;
                    })

                } else {

                    const no_group_msg =  "Sin grupos asignados";
                    console.log(no_group_msg) ;

                }

            }

        }
        
        await client.unbind();
    }

    main() ;

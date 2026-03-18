// --------------------------------------------------------------------------------- 
// Corhoma - Informática e Ingeniería
// Test función read_gen_bb / AD    
// v1.01- 20260309 
// ---------------------------------------------------------------------------------


import { read_gen_bb, BBResult } from "./read_gen_bb";

import * as path from "path";


async function main(): Promise<void> {

    const camino = "D:/dev_node/blackbox/data/";
    const file = "BBTEST.HKF";

    console.log (__dirname);

    
    const pruPath = path.join( __dirname, "..", "data" );    // asi cumple con la lectura del archivo en el punto del arbol
                                                            //  que cumnple con la estructura     project 
                                                            //                                             data
                                                            //                                             dist
                                                            //                                             src
                                                            //                                             node_modules
    console.log ( `El pruPath  es  ${pruPath}` ) ;

    

    const fpn = camino + file ;
    
    console.log ( `El path  de la BB es  ${fpn}` ) ;

    try {

        const resultado: BBResult = await read_gen_bb(camino, file);


        
        console.log("RC:", resultado.rc);
        console.log("Usuario:", resultado.usr);
        console.log("Password:", resultado.pwd);

    } catch (error: unknown) {

        if (error instanceof Error) {
            console.error("Error:", error.message);
        } else {
            console.error("Error desconocido:", error);
        }

    }

}

main();

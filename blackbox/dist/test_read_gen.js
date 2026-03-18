"use strict";
// --------------------------------------------------------------------------------- 
// Corhoma - Informática e Ingeniería
// Test función read_gen_bb / AD    
// v1.01- 20260307 
// ---------------------------------------------------------------------------------
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const read_gen_bb_1 = require("./read_gen_bb");
const path = __importStar(require("path"));
async function main() {
    const camino = "D:/dev_node/blackbox/data/";
    const file = "BBTEST.HKF";
    console.log(__dirname);
    const pruPath = path.join(__dirname, "..", "data"); // asi cumple con la lectura del archivo en el punto del arbol
    //  que cumnple con la estructura     project 
    //                                             data
    //                                             dist
    //                                             src
    //                                             node_modules
    console.log(`El pruPath  es  ${pruPath}`);
    const fpn = camino + file;
    console.log(`El path  de la BB es  ${fpn}`);
    try {
        const resultado = await (0, read_gen_bb_1.read_gen_bb)(camino, file);
        console.log("RC:", resultado.rc);
        console.log("Usuario:", resultado.usr);
        console.log("Password:", resultado.pwd);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        }
        else {
            console.error("Error desconocido:", error);
        }
    }
}
main();

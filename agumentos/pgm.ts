


// si ejecuto 
// node app.js hola mundo
//Obtendrás algo así:
//lo argumemto reales empiezan en process.argv[2]


// Leer variables de entorno
// const user = process.env.USER;
//console.log(user);

//Salir con código de error
//process.exit(1);




// console.log(process.argv);


const path = require("node:path");




console.log(process.argv[0]);  // imprime node
console.log(process.argv[1]);  // imprime prgm.js
console.log(process.argv[2]);  // imprime hola
console.log(process.argv[3]);  // imprime mundo

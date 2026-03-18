/* ----------------------------------------------------------------
	* archivo types.ts solo para interfaces:
	*         
	* @author  Corhoma srl. (c) 2026 - 
	* @version 1.02.  2026/03/16
	* @since   node 20.xxxx
    * 
    * 
	* 
	---------------------------------------------------------------  */


/**
 * Interface para el retorno del Ini
 */
export interface IniConfig {
    LDAP_SERVER: string;
    LDAP_PORT: string;
    LDAPS: string;
	CUBB_PATH: string;
	BASE_DN: string;
    CERT_PATH: string;
	USUARIO: string;
    LOG_FPATH: string
}

/**
 * Interface para el retorno de la Caja Negra
 */
export interface BBResult {
    rc: number;
    usr: string;
    pwd: string
}

/**
 * Interface para el envìo de datos a buscar_usuario
 */
export interface LdapConfig {
    url         : string;
    baseDN      : string;
    bindDN      : string;
    bindPassword: string
}

/**
 * Interface para el retorno del buscar_usuario
 */
export interface LdapResult {
    encontrado   : boolean;
    cn           : string;
    dn           : string;
    grupos       : string[]
}


/**
 * Browser API.
 *
 * this file is entry of webpack.
 *
 * includes all the function of web script.
 */

export * from "./src/index";
// @ts-ignore webpack define
const VERSION = process.env.VERSION;
export { VERSION };
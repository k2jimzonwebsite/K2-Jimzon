// Prepared single-function entrypoint for the Storefront BFF activation.
// At cutover, deploy only this entrypoint and rewrite /api/storefront/* to it
// with the remaining path supplied as the bounded `route` query value.
export { default } from '../server/storefront-bff/router.js'

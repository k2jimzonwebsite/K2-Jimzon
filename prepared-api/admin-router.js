// Prepared single-function entrypoint for MAP-019/MAP-020 activation.
// At cutover, deploy only this entrypoint and rewrite /api/admin/* to it with
// the remaining path supplied as the `route` query value.
export { default } from '../server/admin-bff/router.js'

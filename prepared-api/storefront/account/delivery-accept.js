import { handleExpressAcceptance } from '../../../server/storefront-bff/express-delivery.js'
export default (req, res) => handleExpressAcceptance(req, res, { account: true })

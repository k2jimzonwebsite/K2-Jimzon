import { handleFulfillmentCommand } from '../../../server/admin-bff/fulfillment.js'
export default (req, res) => handleFulfillmentCommand(req, res, 'packing_scan')

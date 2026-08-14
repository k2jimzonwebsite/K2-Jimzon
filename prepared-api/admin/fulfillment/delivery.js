import { handleFulfillmentCommand } from '../../../server/admin-bff/fulfillment.js'
export default (req, res) => handleFulfillmentCommand(req, res, 'delivery_details')

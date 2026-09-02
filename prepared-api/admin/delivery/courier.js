import { handleDeliveryCommand } from '../../../server/admin-bff/delivery.js'
export default (req, res) => handleDeliveryCommand(req, res, 'delivery_courier_upsert')

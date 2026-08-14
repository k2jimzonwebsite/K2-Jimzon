import { handleConsignmentCommand } from '../../../server/admin-bff/consignments.js'
export default (req, res) => handleConsignmentCommand(req, res, 'consignment_advance')

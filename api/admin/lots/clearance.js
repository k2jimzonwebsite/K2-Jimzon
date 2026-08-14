import { handleLotCommand } from '../../../server/admin-bff/lots.js'
export default (req, res) => handleLotCommand(req, res, 'lot_clearance')

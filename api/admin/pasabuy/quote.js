import { handlePasabuyCommand } from '../../../server/admin-bff/pasabuy.js'
export default (req, res) => handlePasabuyCommand(req, res, 'pasabuy_quote')

import { handleProductIntakeCommand } from '../../../server/admin-bff/product-intake.js'
export default (req, res) => handleProductIntakeCommand(req, res, 'intake_draft')

import { handleProductEvidenceUpload } from '../../../server/admin-bff/product-intake.js'

export const config = { api: { bodyParser: false } }
export default handleProductEvidenceUpload

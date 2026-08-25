import { handleProductMediaUpload } from '../../server/admin-bff/product-media.js'

export const config = { api: { bodyParser: false } }
export default handleProductMediaUpload

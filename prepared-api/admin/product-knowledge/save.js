import { handleProductKnowledgeCommand } from '../../../server/admin-bff/product-knowledge.js'

export default (req, res) => handleProductKnowledgeCommand(req, res, 'product_knowledge_save')

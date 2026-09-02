import { handleInboxCommand } from '../../../server/admin-bff/inbox.js'

export default (req, res) => handleInboxCommand(req, res, 'inbox_send_reply')

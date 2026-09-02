import { handleReservationCommand } from '../../../server/admin-bff/reservations.js'
export default (req, res) => handleReservationCommand(req, res, 'reservation_release_expired')

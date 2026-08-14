import { handleCouponCommand } from '../../../server/admin-bff/coupons.js'
export default (req, res) => handleCouponCommand(req, res, 'coupon_archive')

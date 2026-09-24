import { CustomerAccountContext } from './customerAccountContextValue'
import { useCustomerAccount } from '../hooks/useCustomerAccount'

export default function CustomerAccountProvider({ children }) {
  const account = useCustomerAccount()
  return <CustomerAccountContext.Provider value={account}>{children}</CustomerAccountContext.Provider>
}

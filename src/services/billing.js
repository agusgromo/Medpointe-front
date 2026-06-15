import { GET } from './fetch'

export function getBillingClaims(query) {
  return GET('/billing/claims', query)
}

export function getBillingClaim(claimId) {
  return GET(`/billing/claims/${claimId}`)
}

import { initContract } from '@ts-rest/core'
import { userContract } from './user.contract'

const c = initContract()

export const contract = c.router({
  user: c.router(userContract, {
    pathPrefix: '/users'
  }),

  // admin: c.router(adminContract, {
  //   pathPrefix: '/admin'
  // })
})
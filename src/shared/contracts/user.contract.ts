import { initContract } from '@ts-rest/core'
import { userSchema } from '../schema/user.schema'

const c = initContract()

export const userContract = {
  getUsers: {
    method: 'GET',
    path: '/',
    responses: {
      200: UserSchema.array()
    }
  },

  getUser: {
    method: 'GET',
    path: '/:id',
    responses: {
      200: UserSchema
    }
  },

  createUser: {
    method: 'POST',
    path: '/',
    body: UserSchema,
    responses: {
      201: UserSchema
    }
  }
}
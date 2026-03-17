import { ExceptionSchema } from '../exception/exception.schema'

export function withExceptionResponse(responses: any) {
  return {
    ...responses,
    401: ExceptionSchema,
    403: ExceptionSchema,
    500: ExceptionSchema,
  }
}
import {
  Controller,
  Post,
  Get,
  Body,
  Param
} from '@nestjs/common'

import { UsersService } from './users.service'

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() body: unknown) {

    // validate request bằng contract
    const data = userContract.createUser.body.parse(body)

    const user = await this.usersService.create(data)

    // validate response
    return userContract.createUser.responses[201].parse(user)
  }

  @Get()
  async getUsers() {

    const users = await this.usersService.findAll()

    return userContract.getUsers.responses[200].parse(users)
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {

    const user = await this.usersService.findOne(id)

    return userContract.getUserById.responses[200].parse(user)
  }
}
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prima.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {

  constructor(private prisma: PrismaService) {}

  async create(data: any) {

    const passwordHash = await bcrypt.hash(data.password, 10)

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role ?? 'USER'
      }
    })
  }

  async findAll() {
    return this.prisma.user.findMany()
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id }
    })
  }

  async update(id: string, data: any) {

    return this.prisma.user.update({
      where: { id },
      data
    })
  }

  async delete(id: string) {

    return this.prisma.user.delete({
      where: { id }
    })
  }

}
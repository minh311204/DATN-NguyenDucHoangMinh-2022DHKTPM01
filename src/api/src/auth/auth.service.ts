import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prima.service'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async CreateUser()
}
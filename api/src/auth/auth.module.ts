import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FortyTwoAuthController, CheatAuthController, TwoFAAuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { UserModule } from 'src/user/user.module';
import { UserRepository } from 'src/user/user.repository';
import { FortyTwoAuthStrategy } from './auth.strategy';
import { PassportModule } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './jwt/jwt.constants';
import { JwtStrategy } from './jwt/jwt.strategy';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ property: 'user' }),
    forwardRef(() => UserModule),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30s' }
    }),
    HttpModule
  ],
  providers: [AuthService, FortyTwoAuthStrategy, JwtStrategy],
  controllers: [FortyTwoAuthController, CheatAuthController, TwoFAAuthController],
})
export class AuthModule {}

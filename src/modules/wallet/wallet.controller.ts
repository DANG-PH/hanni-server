import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  async getBalance(@CurrentUser() user: AuthUser) {
    return { balance: await this.wallet.getBalance(user.id) };
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: AuthUser) {
    return this.wallet.getRecentTransactions(user.id);
  }

  @Post('buy/streak-freeze')
  buyStreakFreeze(@CurrentUser() user: AuthUser) {
    return this.wallet.buyStreakFreeze(user.id);
  }
}

import { Injectable } from '@nestjs/common';
import { FsrsScheduler } from './fsrs.scheduler';
import { Sm2Scheduler } from './sm2.scheduler';
import type { Scheduler } from './scheduler.types';

/** Chọn thuật toán theo cài đặt của từng user (UserSettings.srsScheduler). */
@Injectable()
export class SchedulerRegistry {
  constructor(
    private readonly sm2: Sm2Scheduler,
    private readonly fsrs: FsrsScheduler,
  ) {}

  get(name: string): Scheduler {
    return name === 'fsrs' ? this.fsrs : this.sm2;
  }
}

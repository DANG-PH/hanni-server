import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Liên hệ hợp tác từ trang /hop-tac (trung tâm, giáo viên, gia sư…) — admin đọc qua API. */
@Entity('PartnerLead')
@Index('PartnerLead_createdAt_idx', ['createdAt'])
export class PartnerLead {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PartnerLead_pkey',
  })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  /** center | teacher | tutor | other */
  @Column({ type: 'text' })
  kind!: string;

  @Column({ type: 'text' })
  contact!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  createdAt!: Date;
}

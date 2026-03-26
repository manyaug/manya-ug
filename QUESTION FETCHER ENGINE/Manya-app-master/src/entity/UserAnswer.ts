import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm"
import { Question } from "./Question"

@Entity()
export class UserAnswer {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    userId!: string

    @ManyToOne(() => Question)
    @JoinColumn({ name: 'questionId', referencedColumnName: 'Q_ID' })
    question!: Question

    @Column()
    isCorrect!: boolean

    @Column({ nullable: true })
    timeSpent?: number

    @Column({ nullable: true })
    hintUsed?: boolean

    @Column({ nullable: true })
    answerChanged?: boolean

    @Column({ nullable: true })
    selectedAnswer?: string

    @Column()
    answeredAt!: Date
}
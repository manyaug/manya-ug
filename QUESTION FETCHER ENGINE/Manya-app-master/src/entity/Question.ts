import { Entity, Column, PrimaryColumn } from "typeorm"

@Entity({ name: 'qq-r-ss' })
export class Question {
    @PrimaryColumn()
    Q_ID!: string  // The ! tells TypeScript it will be initialized by TypeORM

    @Column()
    Term!: string

    @Column()
    Topic!: string

    @Column()
    Difficulty!: string

    @Column({ name: 'Question_Type' })
    Question_Type!: string

    @Column({ name: 'Parent_ID', nullable: true })
    Parent_ID?: string  // ? means optional

    @Column({ name: 'Order_in_Parent', nullable: true })
    Order_in_Parent?: number

    @Column({ name: 'Question_Text' })
    Question_Text!: string

    @Column({ name: 'Option_A' })
    Option_A!: string

    @Column({ name: 'Option_B' })
    Option_B!: string

    @Column({ name: 'Option_C' })
    Option_C!: string

    @Column({ name: 'Option_D' })
    Option_D!: string

    @Column({ name: 'Correct_Answer' })
    Correct_Answer!: string

    @Column({ nullable: true })
    Hint?: string

    @Column({ name: 'Detailed_Solution', nullable: true })
    Detailed_Solution?: string

    @Column({ name: 'Image_Prompt', nullable: true })
    Image_Prompt?: string

    @Column({ name: 'Image_Link', nullable: true })
    Image_Link?: string

    @Column({ name: 'Image_Location', nullable: true })
    Image_Location?: string

    @Column('simple-json', { nullable: true })
    Tags?: string[]
}
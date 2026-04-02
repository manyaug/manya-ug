import "reflect-metadata"
import { DataSource } from "typeorm"
import { Question } from "./entity/Question"
import { UserAnswer } from "./entity/UserAnswer"

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "manya.db",  // Your database file
    synchronize: true,      // Creates UserAnswer table automatically
    logging: true,         // Shows SQL queries (helpful for debugging)
    entities: [Question, UserAnswer],
    migrations: [],
    subscribers: [],
})
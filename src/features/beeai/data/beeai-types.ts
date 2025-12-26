import { type conversations } from './conversations.json'

export type AIAgent = (typeof conversations)[number]
export type Message = AIAgent['messages'][number]


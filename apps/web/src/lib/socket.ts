import { io } from 'socket.io-client'

export const socket = io('http://localhost:5174', {
  autoConnect: true,
})



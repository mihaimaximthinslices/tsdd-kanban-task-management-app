import { useQuery } from 'react-query'
import axios from 'axios'
import { Task } from '../../backend/src/domain/entities'
import { useBoards } from './useBoards.tsx'
import { useBoardColumns } from './useBoardColumns.tsx'

export const useColumnTasks = (boardId: string, columnId: string) => {
  const { boards } = useBoards()
  const { boardColumns } = useBoardColumns(columnId)

  const match =
    boards &&
    boardColumns &&
    boards!.find((board) => board.id === boardId) &&
    boardColumns!.find(
      (column) => column.id === columnId && column.boardId === boardId,
    )

  const { data: columnTasks, ...options } = useQuery<Task[], Error>(
    `columnTasks` + columnId,
    async () => {
      try {
        if (match) {
          const data = await axios.get(
            `/api/boards/${boardId}/columns/${columnId}/tasks`,
          )
          return data.data
        }
        return []
      } catch (err) {
        return []
      }
    },
    {
      retry: false,
    },
  )

  return {
    columnTasks,
    ...options,
  }
}
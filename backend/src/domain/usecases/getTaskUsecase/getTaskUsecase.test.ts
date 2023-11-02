import { afterEach, vi, describe, beforeEach, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { BoardColumnRepository, BoardRepository, TaskRepository, UserRepository } from '../../repositorties'
import { EntityNotFoundError, InvalidInputError, UnauthorizedError } from '../../types/Errors'
import { boardBuilder, userBuilder } from '../../../infrastructure/shared'
import { boardColumnBuilder } from '../../../infrastructure/shared/BoardColumnBuilder'
import { taskBuilder } from '../../../infrastructure/shared/TaskBuilder'
import { getTaskUsecase } from './getTaskUsecase'

describe('getTaskUsecase', () => {
  const userId = 'userId'
  const boardId = 'boardId'
  const columnId = 'columnId'
  const taskId = 'taskId'

  const userRepository = mock<UserRepository>()
  const boardRepository = mock<BoardRepository>()
  const boardColumnRepository = mock<BoardColumnRepository>()
  const taskRepository = mock<TaskRepository>()

  const usecase = getTaskUsecase({
    userRepository,
    boardRepository,
    boardColumnRepository,
    taskRepository,
  })

  afterEach(() => {
    vi.clearAllMocks()
  })
  const runningTheUsecase = async () =>
    usecase({
      userId,
      taskId,
    })

  describe('given the user does not exist', () => {
    beforeEach(() => {
      userRepository.getById.mockResolvedValue(null)
    })
    it('should throw InvalidInputError', async () => {
      await expect(runningTheUsecase).rejects.toThrow(InvalidInputError)
      expect(userRepository.getById).toHaveBeenCalledWith(userId)
    })
  })
  describe('given the user exists', () => {
    const user = userBuilder.build({
      id: userId,
    })
    beforeEach(() => {
      userRepository.getById.mockResolvedValue(user)
    })
    describe('given the task does not exist', () => {
      beforeEach(() => {
        taskRepository.getById.mockResolvedValue(null)
      })
      it('should throw EntityNotFoundError', async () => {
        await expect(runningTheUsecase).rejects.toThrow(EntityNotFoundError)
        expect(taskRepository.getById).toHaveBeenCalledWith(taskId)
      })
    })

    describe('given the task exists', () => {
      const task = taskBuilder.build({
        id: taskId,
      })

      beforeEach(() => {
        taskRepository.getById.mockResolvedValue(task)
      })
      describe('given the column does not exist', () => {
        beforeEach(() => {
          boardColumnRepository.getById.mockResolvedValue(null)
        })
        it('should throw EntityNotFoundError', async () => {
          await expect(runningTheUsecase).rejects.toThrow(EntityNotFoundError)
          expect(boardColumnRepository.getById).toHaveBeenCalledWith(task.columnId)
        })
      })
      describe('given the column exists', () => {
        const column = boardColumnBuilder.build({
          id: columnId,
        })
        beforeEach(() => {
          boardColumnRepository.getById.mockResolvedValue(column)
        })

        describe('given the board does not exist', () => {
          beforeEach(() => {
            boardRepository.getById.mockResolvedValue(null)
          })
          it('should throw EntityNotFoundError', async () => {
            await expect(runningTheUsecase).rejects.toThrow(EntityNotFoundError)
            expect(boardRepository.getById).toHaveBeenCalledWith(column.boardId)
          })
        })
        describe('given the board exists', () => {
          const board = boardBuilder.build({
            id: boardId,
          })
          beforeEach(() => {
            boardRepository.getById.mockResolvedValue(board)
          })
          describe('given the user is not authorized to access the board', () => {
            it('should throw UnauthorizedError', async () => {
              await expect(runningTheUsecase).rejects.toThrow(UnauthorizedError)
            })
          })
          describe('given the user is authorized to access the board', () => {
            beforeEach(() => {
              board.userId = userId
            })
            it('should return the task', async () => {
              const result = await runningTheUsecase()
              expect(result).toEqual(task)
            })
          })
        })
      })
    })
  })
})

import { useContext, useEffect, useState } from 'react'
import { DashboardContext } from '../store/DashboardContext.tsx'
import { PortalModal } from '../modal/PortalModal.tsx'
import { clsx } from 'clsx'
import IconCross from '../svg/icon-cross.tsx'
import * as yup from 'yup'
import { ValidationError } from 'yup'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { AxiosError } from 'axios'
import { useBoards } from '../hooks/useBoards.tsx'
import { LoadingSpinner } from './LoadingSpinner.tsx'
import { scrollToBottomOfElement } from '../helpers/scroll.tsx'

export type BoardStateType = {
  name: string
  columns: string[]
  columnIds: string[]
  callback: (() => void) | null
}

export type BoardStateTypeErrors = {
  name?: string
  columnErrors: Record<string, { error: string }>
}

const SubmitNewBoardValidationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .matches(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
    .min(1, 'Name should contain at least 1 character')
    .max(25, 'Name should contain at most 25 characters'),
  columns: yup
    .array()
    .of(
      yup
        .string()
        .matches(
          /^[a-zA-Z\s]+$/,
          'Column name can only contain letters and spaces',
        )
        .min(1, 'Column name should contain at least 1 character')
        .max(25, 'Column name should contain at most 25 characters'),
    )
    .test('unique', 'Column names must be unique', function (value) {
      if (!value || value.length === 0) return true // No need to validate if the array is empty.

      const uniqueSet = new Set(value)
      return uniqueSet.size === value.length
    }),
})

export function AddNewBoardModal() {
  const { refetch } = useBoards()

  const [requestState, setRequestState] = useState({
    loading: false,
    error: false,
  })
  const { setDashboardState } = useContext(DashboardContext)

  const examplePlaceholders = [
    'eg. Todo',
    'eg. Doing',
    'eg. Done',
    'eg. Testing',
  ]
  const [boardState, setBoardState] = useState<BoardStateType>({
    name: '',
    columns: ['Todo', 'Doing'],
    columnIds: [uuidv4(), uuidv4()],
    callback: () => {},
  })

  const [boardErrors, setBoardErrors] = useState<BoardStateTypeErrors>({
    columnErrors: {},
  })

  function changeColumnName(index: number, name: string) {
    setBoardState((old) => ({
      ...old,
      columns: old.columns.map((_, i) => (i === index ? name : _)),
    }))
  }

  function changeBoardName(name: string) {
    setBoardState((old) => ({
      ...old,
      name,
    }))
  }

  function deleteBoardColumn(index: number) {
    setBoardState((old) => {
      return {
        ...old,
        columns: [
          ...old.columns.filter((_val: string, i: number) => {
            return i !== index
          }),
        ],
        columnIds: old.columnIds.filter((_val: string, i: number) => {
          return i !== index
        }),
      }
    })
    setBoardErrors({
      columnErrors: {},
    })
  }

  useEffect(() => {
    if (boardState.callback) {
      boardState.callback()

      setBoardState((old) => ({ ...old, callback: null }))
    }
  }, [boardState.columns])

  function addNewColumn() {
    setBoardState((old) => ({
      ...old,
      columns: [...old.columns, ''],
      columnIds: [...old.columnIds, uuidv4()],
      callback: () => scrollToBottomOfElement('add-new-board-modal'),
    }))
    setBoardErrors({
      columnErrors: {},
    })
  }

  function findDuplicateIndices(arr: string[]) {
    const occurances: Record<string, number[]> = {}

    for (let i = 0; i < arr.length; i++) {
      occurances[arr[i]] = [...(occurances[arr[i]] || []), i]
    }

    return Object.values(occurances)
      .filter((l) => l.length > 1)
      .reduce((a, c) => [...a, ...c], [])
      .map((n) => n.toString())
  }

  async function verifyBoard(callback?: (boardState: BoardStateType) => void) {
    const errors: Record<string, string> = {}
    await SubmitNewBoardValidationSchema.validate(boardState, {
      abortEarly: false,
    }).catch((err) => {
      err.inner.forEach((error: ValidationError) => {
        errors[error.path!] = error.message
      })
    })

    let newBoardErrors: BoardStateTypeErrors = {
      columnErrors: {},
    }

    if (errors.name) {
      newBoardErrors.name = errors.name
    }

    const affectedIndexes = []

    for (let i = 0; i < boardState.columns.length; i++) {
      if (errors[`columns["${i}"]`] || errors[`columns[${i}]`]) {
        affectedIndexes.push(i)
      }
    }

    if (affectedIndexes.length) {
      affectedIndexes.forEach((index) => {
        newBoardErrors.columnErrors[index] = {
          error: errors[`columns["${index}"]`] || errors[`columns[${index}]`],
        }
      })
      setBoardErrors(newBoardErrors)
      return
    }

    if (errors.columns) {
      const affectedIndexes = findDuplicateIndices(boardState.columns)

      affectedIndexes.forEach((index) => {
        newBoardErrors.columnErrors[index] = { error: errors.columns }
      })

      setBoardErrors(newBoardErrors)
      return
    }

    setBoardErrors(newBoardErrors)

    newBoardErrors = newBoardErrors as BoardStateTypeErrors
    if (
      !newBoardErrors.name &&
      Object.keys(newBoardErrors.columnErrors).length === 0
    ) {
      if (callback) {
        callback(boardState)
      }
    }
  }

  function createNewBoard() {
    verifyBoard(async (data) => {
      try {
        setRequestState((prev) => ({ ...prev, loading: true }))
        const response = await axios.post('/api/boards', data)
        refetch().then(() => {
          setDashboardState!((old) => ({
            ...old,
            showAddNewBoardModal: false,
            selectedBoard: response.data.boardId,
          }))
          setRequestState((prev) => ({ ...prev, loading: false }))
        })
      } catch (err) {
        const error = err as AxiosError
        if (error.response!.status === 409) {
          setBoardErrors((old) => ({
            ...old,
            name: 'You already created a board with this name',
          }))
          setRequestState({ loading: false, error: false })
        } else {
          setRequestState({ loading: false, error: true })
        }
      }
    })
  }

  return (
    <PortalModal
      onClose={() => {
        setDashboardState!((old) => ({ ...old, showAddNewBoardModal: false }))
      }}
    >
      <div
        id="add-new-board-modal"
        style={{
          maxHeight: '90vh',
        }}
        className="min-w-[343px] md:w-[480px] bg-white dark:bg-black2 rounded-md flex flex-col p-8 gap-6 shadow-md dark:border border-black1 overflow-y-auto"
      >
        <div>
          <h1 className="font-plusJSans text-headingL text-black dark:text-white">
            Add New Board
          </h1>
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="font-plusJSans text-bodyM text-black1 dark:text-white"
            data-cy="board-name-input-label"
            htmlFor="boardName"
          >
            Board Name
          </label>

          <input
            data-cy="board-name-input"
            className={clsx(
              'pl-4 pb-[10px] pt-[10px] pr-4 border rounded-md text-bodyL dark:bg-black2 dark:text-white dark:border-black1',
            )}
            onChange={(e) => {
              changeBoardName(e.target.value)
            }}
            onFocus={() => {
              setBoardErrors((old) => ({
                ...old,
                name: undefined,
              }))
            }}
            type="text"
            id="boardName"
            placeholder="eg. Web Design"
          />
          {boardErrors.name && (
            <div className="font-plusJSans text-headingS text-red2">
              <span>{boardErrors.name}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {boardState.columns.length > 0 && (
            <label
              className="font-plusJSans text-bodyM text-black1 dark:text-white"
              data-cy="board-columns-input-label"
            >
              Board Columns
            </label>
          )}
          <div className="flex flex-col gap-[12px]">
            {boardState.columns.map((name, index) => {
              return (
                <div
                  key={boardState.columnIds[index]}
                  className="flex flex-col"
                >
                  <div className="flex w-full items-center gap-4">
                    <input
                      onFocus={() => {
                        if (boardErrors.columnErrors[index]) {
                          setBoardErrors((old) => {
                            const newErrors = { ...old }
                            delete newErrors.columnErrors[index]
                            return newErrors
                          })
                        }
                      }}
                      data-cy="column-name-input"
                      className={clsx(
                        'pl-4 pb-[10px] pt-[10px] pr-4 border rounded-md text-bodyL dark:bg-black2 dark:text-white dark:border-black1 grow',
                      )}
                      type="text"
                      id="boardName"
                      defaultValue={name}
                      placeholder={
                        examplePlaceholders[index % examplePlaceholders.length]
                      }
                      onChange={(e) => {
                        changeColumnName(index, e.target.value)
                      }}
                    />
                    <button
                      disabled={requestState.loading || requestState.error}
                      data-cy="remove-column-button"
                      onClick={() => {
                        deleteBoardColumn(index)
                      }}
                    >
                      <IconCross />
                    </button>
                  </div>
                  {boardErrors.columnErrors[index] && (
                    <div className="font-plusJSans text-headingS text-red2">
                      <span>{boardErrors.columnErrors[index]?.error}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-1">
            <button
              data-cy="create-new-column-button"
              disabled={requestState.loading || requestState.error}
              onClick={() => {
                addNewColumn()
              }}
              className="font-plusJSans text-bodyL text-blue2 w-full pt-2 pb-2 rounded-2xl bg-white2 dark:bg-white hover:bg-white3"
            >
              + Add New Column
            </button>
          </div>
        </div>
        <div onClick={createNewBoard} className="w-full">
          <button
            disabled={requestState.loading || requestState.error}
            data-cy="create-new-board-button"
            className="font-plusJSans text-bodyL text-white w-full pt-2 pb-2 rounded-2xl bg-blue2 hover:bg-blue1 disabled:cursor-not-allowed"
          >
            {requestState.loading ? (
              <LoadingSpinner />
            ) : (
              <span>Create New Board</span>
            )}
          </button>
        </div>
      </div>
    </PortalModal>
  )
}

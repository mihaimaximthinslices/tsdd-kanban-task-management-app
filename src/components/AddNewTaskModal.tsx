import { useContext, useEffect, useState } from 'react'
import { DashboardContext } from '../store/DashboardContext.tsx'
import { PortalModal } from '../modal/PortalModal.tsx'
import { clsx } from 'clsx'
import IconCross from '../svg/icon-cross.tsx'
import * as yup from 'yup'
import { ValidationError } from 'yup'
import { v4 as uuidv4 } from 'uuid'
import { LoadingSpinner } from './LoadingSpinner.tsx'
import IconChevronDown from '../svg/icon-chevron-down.tsx'
import { useBoardColumns } from '../hooks/useBoardColumns.tsx'
import axios from 'axios'
import { scrollToBottomOfElement } from '../helpers/scroll.tsx'

export type TaskStateType = {
  title: string
  description: string
  subtasks: string[]
  subtasksIds: string[]
  callback: (() => void) | null
}

export type TaskStateTypeErrors = {
  title?: string
  description?: string
  subtasksErrors: Record<string, { error: string }>
}

const SubmitNewTaskValidationSchema = yup.object().shape({
  title: yup
    .string()
    .required('Title is required')
    .min(1, 'Title should contain at least 1 character')
    .max(280, 'Title should contain at most 280 characters'),
  description: yup
    .string()
    .min(0, 'Title should contain at least 1 character')
    .max(10000, 'Title should contain at most 280 characters'),
  subtasks: yup
    .array()
    .of(
      yup
        .string()
        .min(1, 'Subtask should contain at least 1 character')
        .max(280, 'Subtask should contain at most 280 characters'),
    ),
})
export function AddNewTaskModal() {
  const [requestState, setRequestState] = useState({
    loading: false,
    error: false,
  })

  const { promiseCounter, addToPromiseQueue } = useContext(DashboardContext)

  const { setDashboardState, selectedBoard } = useContext(DashboardContext)

  const { boardColumns, refetch: boardColumnsRefetch } =
    useBoardColumns(selectedBoard)

  const [showColumOptions, setShowColumnOptions] = useState(false)

  const [selectedColumnOption, setSelectedColumnOption] = useState(
    boardColumns![0],
  )

  const examplePlaceholders = [
    'eg. Make coffee',
    'eg. Drink coffee & smile',
    'eg. Take a hike',
  ]
  const [taskState, setTaskState] = useState<TaskStateType>({
    title: '',
    description: '',
    subtasks: [],
    subtasksIds: [],
    callback: null,
  })

  const [taskErrors, setTaskErrors] = useState<TaskStateTypeErrors>({
    subtasksErrors: {},
  })

  function changeSubtaskName(index: number, name: string) {
    setTaskState((old) => ({
      ...old,
      subtasks: old.subtasks.map((_, i) => (i === index ? name : _)),
    }))
  }

  function changeTaskTitle(title: string) {
    setTaskState((old) => ({
      ...old,
      title,
    }))
  }

  function changeTaskDescription(description: string) {
    setTaskState((old) => ({
      ...old,
      description,
    }))
  }

  function deleteSubtask(index: number) {
    setTaskState((old) => {
      return {
        ...old,
        subtasks: [
          ...old.subtasks.filter((_val: string, i: number) => {
            return i !== index
          }),
        ],
        subtasksIds: old.subtasksIds.filter((_val: string, i: number) => {
          return i !== index
        }),
      }
    })
    setTaskErrors({
      subtasksErrors: {},
    })
  }

  function addNewSubtask() {
    setTaskState((old) => ({
      ...old,
      subtasks: [...old.subtasks, ''],
      subtasksIds: [...old.subtasksIds, uuidv4()],
      callback: () =>
        !showColumOptions && scrollToBottomOfElement('add-new-task-modal'),
    }))
    setTaskErrors({
      subtasksErrors: {},
    })
  }

  useEffect(() => {
    if (taskState.callback) {
      taskState.callback()
      setTaskState((old) => ({ ...old, callback: null }))
    }
  }, [taskState.callback])

  async function verifyTask(callback?: (boardState: TaskStateType) => void) {
    const errors: Record<string, string> = {}
    await SubmitNewTaskValidationSchema.validate(taskState, {
      abortEarly: false,
    }).catch((err) => {
      err.inner.forEach((error: ValidationError) => {
        errors[error.path!] = error.message
      })
    })

    let newTaskErrors: TaskStateTypeErrors = {
      subtasksErrors: {},
    }

    if (errors.title) {
      newTaskErrors.title = errors.title
    }

    if (errors.description) {
      newTaskErrors.description = errors.description
    }

    const affectedIndexes = []

    for (let i = 0; i < taskState.subtasks.length; i++) {
      if (errors[`subtasks["${i}"]`] || errors[`subtasks[${i}]`]) {
        affectedIndexes.push(i)
      }
    }

    if (affectedIndexes.length) {
      affectedIndexes.forEach((index) => {
        newTaskErrors.subtasksErrors[index] = {
          error: errors[`subtasks["${index}"]`] || errors[`subtasks[${index}]`],
        }
      })
      setTaskErrors(newTaskErrors)
      return
    }

    setTaskErrors(newTaskErrors)

    newTaskErrors = newTaskErrors as TaskStateTypeErrors
    if (
      !newTaskErrors.title &&
      !newTaskErrors.description &&
      Object.keys(newTaskErrors.subtasksErrors).length === 0
    ) {
      if (callback) {
        callback(taskState)
      }
    }
  }

  function createNewTask() {
    verifyTask(async (data) => {
      addToPromiseQueue(async () => {
        try {
          setRequestState((prev) => ({ ...prev, loading: true }))
          await axios.post(
            `/api/boards/${selectedBoard}/columns/${selectedColumnOption.id}/tasks`,
            data,
          )
          boardColumnsRefetch().then(() => {
            setDashboardState!((old) => ({
              ...old,
              showAddNewTaskModal: false,
            }))
            setRequestState((prev) => ({ ...prev, loading: false }))
          })
        } catch (err) {
          setRequestState({ loading: false, error: true })
        }
      })
    })
  }

  return (
    <PortalModal
      onClose={() => {
        setDashboardState!((old) => ({ ...old, showAddNewTaskModal: false }))
      }}
    >
      <div
        style={{
          maxHeight: '90vh',
        }}
        id={'add-new-task-modal'}
        className="min-w-[343px] md:w-[480px] bg-white dark:bg-black2 rounded-md flex flex-col p-6 gap-6 shadow-md dark:border border-black1 overflow-y-auto"
      >
        <div>
          <h1 className="font-plusJSans text-headingL text-black dark:text-white">
            Add New Task
          </h1>
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="font-plusJSans text-bodyM text-white4 dark:text-white"
            data-cy="task-title-input-label"
          >
            Title
          </label>

          <input
            data-cy="task-title-input"
            className={clsx(
              'pl-4 pb-[10px] pt-[10px] pr-4 border rounded-md text-bodyL dark:bg-black2 dark:text-white dark:border-black1',
            )}
            onChange={(e) => {
              changeTaskTitle(e.target.value)
            }}
            onFocus={() => {
              setTaskErrors((old) => ({
                ...old,
                title: undefined,
              }))
            }}
            type="text"
            id="boardName"
            placeholder="eg. Take coffee break"
          />
          {taskErrors.title && (
            <div className="font-plusJSans text-headingS text-red2">
              <span>{taskErrors.title}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label
            className="font-plusJSans text-bodyM text-white4  dark:text-white"
            data-cy="task-description-input-label"
          >
            Description
          </label>

          <textarea
            data-cy="task-description-input"
            rows={5}
            className={clsx(
              'p-4 pt-2 pb-2 border rounded-md text-bodyL dark:bg-black2 dark:text-white dark:border-black1 resize-none',
            )}
            onChange={(e) => {
              changeTaskDescription(e.target.value)
            }}
            onFocus={() => {
              setTaskErrors((old) => ({
                ...old,
                description: undefined,
              }))
            }}
            placeholder="e.g. It’s always good to take a break. This 15 minute break will recharge the batteries a little."
          />
          {taskErrors.description && (
            <div className="font-plusJSans text-headingS text-red2">
              <span>{taskErrors.description}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {taskState.subtasks.length > 0 && (
            <label
              className="font-plusJSans text-bodyM text-white4  dark:text-white"
              data-cy="subtask-input-label"
            >
              Subtasks
            </label>
          )}
          <div className="flex flex-col gap-[12px]">
            {taskState.subtasks.map((name, index) => {
              return (
                <div
                  key={taskState.subtasksIds[index]}
                  className="flex flex-col"
                >
                  <div className="flex w-full items-center gap-4">
                    <input
                      onFocus={() => {
                        if (taskErrors.subtasksErrors[index]) {
                          setTaskErrors((old) => {
                            const newErrors = { ...old }
                            delete newErrors.subtasksErrors[index]
                            return newErrors
                          })
                        }
                      }}
                      data-cy="subtask-name-input"
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
                        changeSubtaskName(index, e.target.value)
                      }}
                    />
                    <button
                      disabled={requestState.loading || requestState.error}
                      data-cy="remove-column-button"
                      onClick={() => {
                        deleteSubtask(index)
                      }}
                    >
                      <IconCross />
                    </button>
                  </div>
                  {taskErrors.subtasksErrors[index] && (
                    <div className="font-plusJSans text-headingS text-red2">
                      <span>{taskErrors.subtasksErrors[index]?.error}</span>
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
                addNewSubtask()
              }}
              className="font-plusJSans text-bodyL text-blue2 w-full pt-2 pb-2 rounded-2xl bg-white2 dark:bg-white hover:bg-white3"
            >
              + Add New Subtask
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-plusJSans text-bodyM text-white4 dark:text-white">
            Column
          </label>
          <div
            data-cy="link-card-platform"
            onClick={() => setShowColumnOptions((old) => !old)}
            className="flex flex-col w-full gap-1 relative"
          >
            <div
              className={clsx(
                'cursor-pointer absolute right-4 top-[16px]',
                showColumOptions && 'transform: rotate-180',
              )}
            >
              <IconChevronDown />
            </div>
            <button
              data-cy="link-card-platform-viewname"
              className="pt-2 pl-4 pr-4 pb-2 rounded-md border border-blackS bg-no-repeat bg-custom-arrow-up text-left bg-white font-plusJSans text-bodyL dark:bg-black2 dark:border-black1 dark:text-white"
            >
              {selectedColumnOption.columnName}
            </button>
          </div>
          {showColumOptions && (
            <div className="w-full flex flex-col -mt-1">
              {boardColumns!.map((column) => {
                return (
                  <button
                    key={column.id}
                    onClick={() => {
                      setSelectedColumnOption(column)
                      setShowColumnOptions(false)
                    }}
                    className="relative font-plusJSans text-bodyL bg-white2 w-full pt-2 pb-2 pl-4 text-black hover:bg-white3 text-left  flex items-center dark:text-white dark:bg-black1 dark:hover:bg-blue1"
                  >
                    {column.id === selectedColumnOption.id && (
                      <span className="h-[15px] text-center absolute left-[5px] text-blue2">
                        *
                      </span>
                    )}
                    <span>{column.columnName}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div
          onClick={() => {
            setShowColumnOptions(false)
            createNewTask()
          }}
          className="w-full"
        >
          <button
            disabled={
              requestState.loading || requestState.error || promiseCounter > 0
            }
            data-cy="create-new-board-button"
            className="font-plusJSans text-bodyL text-white w-full pt-2 pb-2 rounded-2xl bg-blue2 hover:bg-blue1 disabled:cursor-not-allowed disabled:bg-blue1"
          >
            {requestState.loading ? (
              <LoadingSpinner />
            ) : (
              <span>Create Task</span>
            )}
          </button>
        </div>
      </div>
    </PortalModal>
  )
}

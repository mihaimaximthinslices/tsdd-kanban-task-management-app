import { PortalModal } from '../modal/PortalModal.tsx'
import React, { useContext, useState } from 'react'
import { DashboardContext } from '../store/DashboardContext.tsx'
import { useTask } from '../hooks/useTask.tsx'
import { useSubtasks } from '../hooks/useSubtasks.tsx'
import { Subtask, SubtaskStatus } from '../../backend/src/domain/entities'
import ColumnDropdown from './ColumnDropdown.tsx'
import CheckboxSubtask from './CheckboxSubtask.tsx'
import IconVerticalEllipsis from '../svg/icon-vertical-ellipsis.tsx'
import axios from 'axios'
import { TaskViewSkeleton } from './TaskViewSkeleton.tsx'

function TaskView() {
  const { setDashboardState } = useContext(DashboardContext)
  const { addToPromiseQueue, promiseCounter } = useContext(DashboardContext)
  const { selectedTask } = useContext(DashboardContext)
  const { task } = useTask(selectedTask!)
  const { subtasks } = useSubtasks(selectedTask!)

  const [localSubtasks, setLocalSubtasks] = useState(subtasks!)

  const [completedSubtasks, setCompletedSubtasks] = useState(
    localSubtasks?.filter((subtask) => subtask.status === 'completed').length ??
      0,
  )

  const [showTaskOptions, setShowTaskOptions] = useState(false)

  const handleSubtaskChange = (
    subtaskId: string,
    description: string,
    status: SubtaskStatus,
  ) => {
    setLocalSubtasks((prev) => {
      const subtask = prev!.find((sub: Subtask) => sub.id === subtaskId)
      if (subtask) {
        subtask.status = status
      }
      return prev
    })

    if (status === SubtaskStatus.in_progress) {
      setCompletedSubtasks((old) => old - 1)
    } else {
      setCompletedSubtasks((old) => old + 1)
    }

    addToPromiseQueue(
      () =>
        new Promise<void>((resolve, reject) => {
          axios
            .patch(`/api/tasks/${task!.id}/subtasks/${subtaskId}`, {
              description,
              status,
            })
            .then(() => resolve())
            .catch((err: unknown) => reject(err))
        }),
    )
  }

  return (
    <div
      onClick={(e) => {
        if (showTaskOptions) {
          const target = e.target as HTMLElement
          if (
            !(
              target.id === 'edit-task-button' ||
              target.id === 'delete-task-button'
            )
          ) {
            setShowTaskOptions(false)
          }
        }
      }}
      className="flex flex-col gap-6 relative"
    >
      <div className="flex justify-between">
        <div className="max-w-full pr-4">
          <span className="font-plusJSans text-headingL text-black dark:text-white break-words max-w-full">
            {task?.title}
          </span>
        </div>
        <div className="flex flex-col">
          <button
            onClick={() => {
              setShowTaskOptions((old) => !old)
            }}
          >
            <IconVerticalEllipsis />
          </button>
          {showTaskOptions && (
            <div className="fixed bg-black2 overflow-visible z-40 mt-8">
              <div className="relative">
                <div className="absolute w-[120px] -right-[40px] md:-right-[96px] md:w-[192px]">
                  <div className="bg-white p-4 dark:bg-black3 text-white flex flex-col items-center gap-4 shadow-md rounded-md dark:border dark:border-black1">
                    <button
                      onClick={() => {
                        setShowTaskOptions(false)
                        setDashboardState!((old) => ({
                          ...old,
                          showViewTaskModal: false,
                          showEditTaskModal: true,
                        }))
                      }}
                      id="edit-task-button"
                      className="w-full text-start font-plusJSans text-white4 text-bodyL hover:underline"
                    >
                      Edit Task
                    </button>
                    <button
                      onClick={() => {
                        setShowTaskOptions(false)
                        setDashboardState!((old) => ({
                          ...old,
                          showViewTaskModal: false,
                          showDeleteTaskModal: true,
                        }))
                      }}
                      id="delete-task-button"
                      className="w-full text-start font-plusJSans text-red2 text-bodyL hover:underline"
                    >
                      Delete Task
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {task?.description && (
        <div>
          <p className="font-plusJSans text-bodyL text-white4 break-words max-w-full">
            {task?.description}
          </p>
        </div>
      )}
      {localSubtasks && localSubtasks.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="font-plusJSans text-bodyM text-white4 dark:text-white">
            Subtasks ({completedSubtasks} of {localSubtasks!.length})
          </p>
          <div className="flex flex-col gap-2">
            {localSubtasks?.map((subtask) => {
              return (
                <CheckboxSubtask
                  subtask={subtask}
                  key={subtask.id}
                  handleStatusChange={handleSubtaskChange}
                />
              )
            })}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="font-plusJSans text-white4 dark:text-white text-bodyM">
          Current Status
        </span>
        <ColumnDropdown currentColumnId={task!.columnId} />
      </div>
      <div className="relative">
        {promiseCounter > 0 && (
          <div className="flex w-full justify-end">
            <div className="flex items-center justify-center space-x-1 animate-pulse absolute top-[-10px]">
              <span className="font-plusJSans text-bodyM text-blue2">
                Syncing...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ViewTaskModal() {
  const { setDashboardState } = useContext(DashboardContext)
  return (
    <PortalModal
      onClose={() => {
        setDashboardState!((prev) => ({
          ...prev,
          showViewTaskModal: false,
        }))
      }}
    >
      <div
        style={{
          maxHeight: '90vh',
        }}
        className="z-20 w-[343px] md:w-[480px] bg-white dark:bg-black2 rounded-md flex flex-col p-6 gap-6 shadow-md dark:border border-black1 overflow-y-auto"
      >
        <React.Suspense fallback={<TaskViewSkeleton />}>
          <TaskView />
        </React.Suspense>
      </div>
    </PortalModal>
  )
}

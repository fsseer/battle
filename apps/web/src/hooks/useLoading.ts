import { useState, useCallback, useRef } from 'react'

interface LoadingTask {
  id: string
  startTime: number
  description?: string
}

interface UseLoadingReturn {
  isLoading: boolean
  loadingTasks: Set<string>
  startLoading: (taskId: string, description?: string) => void
  stopLoading: (taskId: string) => void
  clearAll: () => void
  getLoadingTime: (taskId: string) => number
  getActiveTasks: () => LoadingTask[]
}

export function useLoading(): UseLoadingReturn {
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set())
  const taskRefs = useRef<Map<string, LoadingTask>>(new Map())

  const startLoading = useCallback((taskId: string, description?: string) => {
    setLoadingTasks((prev) => {
      const newSet = new Set(prev)
      newSet.add(taskId)
      return newSet
    })

    taskRefs.current.set(taskId, {
      id: taskId,
      startTime: Date.now(),
      description,
    })
  }, [])

  const stopLoading = useCallback((taskId: string) => {
    setLoadingTasks((prev) => {
      const newSet = new Set(prev)
      newSet.delete(taskId)
      return newSet
    })

    taskRefs.current.delete(taskId)
  }, [])

  const clearAll = useCallback(() => {
    setLoadingTasks(new Set())
    taskRefs.current.clear()
  }, [])

  const getLoadingTime = useCallback((taskId: string): number => {
    const task = taskRefs.current.get(taskId)
    if (!task) return 0
    return Date.now() - task.startTime
  }, [])

  const getActiveTasks = useCallback((): LoadingTask[] => {
    return Array.from(taskRefs.current.values())
  }, [])

  return {
    isLoading: loadingTasks.size > 0,
    loadingTasks,
    startLoading,
    stopLoading,
    clearAll,
    getLoadingTime,
    getActiveTasks,
  }
}

// 특정 작업에 대한 로딩 상태만 관리하는 훅
export function useTaskLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)

  const start = useCallback(() => {
    setIsLoading(true)
    setStartTime(Date.now())
  }, [])

  const stop = useCallback(() => {
    setIsLoading(false)
    setStartTime(null)
  }, [])

  const getElapsedTime = useCallback(() => {
    if (!startTime) return 0
    return Date.now() - startTime
  }, [startTime])

  return {
    isLoading,
    start,
    stop,
    getElapsedTime,
  }
}

// 여러 작업을 동시에 관리하는 훅
export function useMultipleLoading() {
  const [tasks, setTasks] = useState<Map<string, boolean>>(new Map())

  const startTask = useCallback((taskId: string) => {
    setTasks((prev) => new Map(prev).set(taskId, true))
  }, [])

  const stopTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const newMap = new Map(prev)
      newMap.delete(taskId)
      return newMap
    })
  }, [])

  const isTaskLoading = useCallback(
    (taskId: string) => {
      return tasks.get(taskId) || false
    },
    [tasks]
  )

  const isAnyLoading = useCallback(() => {
    return tasks.size > 0
  }, [tasks])

  const clearAll = useCallback(() => {
    setTasks(new Map())
  }, [])

  return {
    tasks,
    startTask,
    stopTask,
    isTaskLoading,
    isAnyLoading,
    clearAll,
  }
}

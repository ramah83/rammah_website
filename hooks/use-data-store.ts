"use client"

import { useState, useEffect } from "react"
import { dataStore } from "@/lib/data-store"
import type { Activity } from "@/lib/data-store"

export function useDataStore() {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      forceUpdate({})
    })
    return unsubscribe
  }, [])

  return dataStore
}

export function useCurrentUser() {
  const store = useDataStore()
  return store.getCurrentUser()
}

export function useUsers() {
  const store = useDataStore()
  return store.getUsers()
}

export function useActivities() {
  const store = useDataStore()
  return store.getActivities()
}

export function useUserActivities(userId: string) {
  const store = useDataStore()
  const activities = store.getActivities()
  return activities.filter((activity) => activity.currentParticipants.includes(userId))
}

export function useAchievements(userId?: string) {
  const store = useDataStore()
  return userId ? store.getUserAchievements(userId) : store.getAchievements()
}

export function useEvents() {
  const store = useDataStore()
  return store.getEvents()
}

export function useStatistics() {
  const store = useDataStore()
  return store.getStatistics()
}

export function useJoinActivity() {
  const store = useDataStore()
  return (activityId: string, userId: string) => {
    return store.joinActivity(activityId, userId)
  }
}

export function useCreateActivity() {
  const store = useDataStore()
  return (activityData: Omit<Activity, "id" | "createdAt" | "currentParticipants">) => {
    return store.createActivity(activityData)
  }
}

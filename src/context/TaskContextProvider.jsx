// src/context/TaskContextProvider.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { TaskContext } from "./TaskContext"; // ← Debe apuntar a TaskContext.jsx

export const TaskContextProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [currentDoneFilter, setCurrentDoneFilter] = useState(false);

  // ============================================
  // TAREAS NORMALES
  // ============================================

  const getTasks = useCallback(async (done = false) => {
    try {
      setLoading(true);
      setCurrentDoneFilter(done);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user logged in");
        setTasks([]);
        return;
      }

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", user.id)
        .eq("deleted", false)
        .eq("done", done)
        .order("id", { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getDeletedTasks = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user logged in");
        return [];
      }

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", user.id)
        .eq("deleted", true)
        .order("id", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching deleted tasks:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = async (taskName) => {
    if (!taskName.trim()) return;

    setAdding(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user logged in");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          name: taskName,
          userId: user.id,
          done: false,
          deleted: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (!currentDoneFilter) {
        setTasks((prevTasks) => [data, ...prevTasks]);
      }

      return data;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    } finally {
      setAdding(false);
    }
  };

  const permanentDeleteTask = async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("userId", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting task permanently:", error);
      throw error;
    }
  };

  const softDeleteTask = async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: true })
        .eq("id", id)
        .eq("userId", user.id);

      if (error) throw error;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error soft deleting task:", error);
      throw error;
    }
  };

  const restoreTask = async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: false })
        .eq("id", id)
        .eq("userId", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error restoring task:", error);
      throw error;
    }
  };

  const updateTask = async (id, updateFields) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .update(updateFields)
        .eq("id", id)
        .eq("userId", user.id)
        .select()
        .single();

      if (error) throw error;

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, ...updateFields } : task,
        ),
      );

      return data;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const toggleTaskDone = async (id, currentDone) => {
    const newDoneState = !currentDone;

    try {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: newDoneState } : task,
        ),
      );

      await updateTask(id, { done: newDoneState });

      if (currentDoneFilter !== newDoneState) {
        await getTasks(currentDoneFilter);
      }
    } catch (error) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: currentDone } : task,
        ),
      );
      console.error("Error toggling task:", error);
    }
  };

  // ============================================
  // TAREAS PROGRAMADAS (SCHEDULED)
  // ============================================

  const getScheduledTasks = useCallback(async () => {
    try {
      setScheduledLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user logged in");
        setScheduledTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .eq("user_email", user.email)
        .in("status", ["pending", "sent", "failed", "cancelled"])
        .order("scheduled_for", { ascending: true });

      if (error) throw error;

      console.log("📋 Tareas programadas cargadas:", data?.length || 0);
      setScheduledTasks(data || []);
    } catch (error) {
      console.error("Error fetching scheduled tasks:", error);
      setScheduledTasks([]);
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  // ✅ SUSCRIPCIÓN EN TIEMPO REAL
  useEffect(() => {
    console.log("🔄 Iniciando suscripción a scheduled_notifications...");

    const channel = supabase
      .channel("scheduled_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_notifications",
        },
        (payload) => {
          console.log("🔄 Cambio detectado en scheduled_notifications:");
          console.log("  📋 Evento:", payload.eventType);
          console.log("  📋 Nuevo estado:", payload.new);

          if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new;
            setScheduledTasks((prevTasks) =>
              prevTasks.map((task) =>
                task.id === updatedTask.id ? updatedTask : task
              )
            );
            console.log("✅ Tarea actualizada localmente:", updatedTask.status);
          } else if (payload.eventType === "INSERT") {
            setScheduledTasks((prevTasks) => [payload.new, ...prevTasks]);
            console.log("✅ Nueva tarea agregada");
          } else if (payload.eventType === "DELETE") {
            setScheduledTasks((prevTasks) =>
              prevTasks.filter((task) => task.id !== payload.old.id)
            );
            console.log("✅ Tarea eliminada");
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Estado de la suscripción:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ ¡Suscripción a scheduled_notifications ACTIVA!");
        }
      });

    return () => {
      console.log("🔄 Limpiando suscripción...");
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ POLLING DE RESPALDO
  useEffect(() => {
    const hasPendingTasks = scheduledTasks.some(
      (task) => task.status === "pending"
    );

    if (!hasPendingTasks) return;

    const interval = setInterval(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
          .from("scheduled_notifications")
          .select("*")
          .eq("user_email", user.email)
          .in("status", ["pending", "sent", "failed"]);

        if (error) throw error;

        const currentStatuses = scheduledTasks.map((t) => ({
          id: t.id,
          status: t.status,
        }));
        const newStatuses = data.map((t) => ({ id: t.id, status: t.status }));

        const hasChanges =
          JSON.stringify(currentStatuses) !== JSON.stringify(newStatuses);

        if (hasChanges) {
          console.log("🔄 Polling detectó cambios, actualizando...");
          setScheduledTasks(data);
        }
      } catch (error) {
        console.error("Error en polling:", error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [scheduledTasks]);

  // ============================================
  // VALORES DEL CONTEXTO
  // ============================================

  const value = {
    // Tareas normales
    tasks,
    loading,
    adding,
    getTasks,
    createTask,
    deleteTask: softDeleteTask,
    softDeleteTask,
    permanentDeleteTask,
    restoreTask,
    getDeletedTasks,
    updateTask,
    toggleTaskDone,
    currentDoneFilter,

    // Tareas programadas
    scheduledTasks,
    scheduledLoading,
    getScheduledTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
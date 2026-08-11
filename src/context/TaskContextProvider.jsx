// src/context/TaskContextProvider.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { TaskContext } from "./TaskContext";

export const TaskContextProvider = ({ children }) => {
  //  ESTADO DEL USUARIO (centralizado)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  //  ESTADO DE TAREAS NORMALES
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [currentDoneFilter, setCurrentDoneFilter] = useState(false);

  //  ESTADO DE TAREAS PROGRAMADAS
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  // ============================================
  // OBTENER USUARIO - Centralizado
  // ============================================

  const getUser = useCallback(async () => {
    try {
      setLoading(true);

      //  PRIMERO: Intentar obtener de localStorage
      const stored = localStorage.getItem("supabaseSession");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.user) {
            setUser(parsed.user);
            setLoading(false);
            return parsed.user;
          }
        } catch (e) {
          console.error("Error parseando sesión:", e);
        }
      }

      //  SEGUNDO: Intentar con Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      if (user) {
        setUser(user);
      }
    } catch (error) {
      console.error("❌ Error obteniendo usuario:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // TAREAS NORMALES
  // ============================================

  const getTasks = useCallback(async (done = false) => {
    try {
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
    }
  }, []);

  const getDeletedTasks = useCallback(async () => {
    try {
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
  // TAREAS PROGRAMADAS
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

      setScheduledTasks(data || []);
    } catch (error) {
      console.error("Error fetching scheduled tasks:", error);
      setScheduledTasks([]);
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const scheduleTaskLater = useCallback(
    async (task, scheduledDate, scheduledTime) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !user.email) {
          throw new Error("No se encontró el email del usuario");
        }

        if (!scheduledDate || !scheduledTime) {
          throw new Error("Debes seleccionar fecha y hora");
        }

        const [year, month, day] = scheduledDate.split("-");
        const [hour, minute] = scheduledTime.split(":");

        const localDateString = `${year}-${month}-${day} ${hour}:${minute}:00`;

        const selectedDate = new Date(year, month - 1, day, hour, minute, 0);
        const now = new Date();

        if (selectedDate < now) {
          throw new Error("No puedes programar una notificación en el pasado");
        }

        const { data, error } = await supabase
          .from("scheduled_notifications")
          .insert({
            task_id: task.id,
            task_name: task.name,
            user_email: user.email,
            scheduled_for: localDateString,
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;

        setScheduledTasks((prevTasks) => [data, ...prevTasks]);

        return data;
      } catch (error) {
        console.error("Error programando tarea:", error);
        throw error;
      }
    },
    [],
  );

  const rescheduleScheduledTask = useCallback(
    async (id, scheduledDate, scheduledTime) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !user.email) {
          throw new Error("No se encontró el email del usuario");
        }

        if (!scheduledDate || !scheduledTime) {
          throw new Error("Debes seleccionar fecha y hora");
        }

        const [year, month, day] = scheduledDate.split("-");
        const [hour, minute] = scheduledTime.split(":");

        const localDateString = `${year}-${month}-${day} ${hour}:${minute}:00`;

        const selectedDate = new Date(year, month - 1, day, hour, minute, 0);
        const now = new Date();

        if (selectedDate < now) {
          throw new Error("No puedes reprogramar para una fecha pasada");
        }

        const { error } = await supabase
          .from("scheduled_notifications")
          .update({
            scheduled_for: localDateString,
            status: "pending",
            sent_at: null,
          })
          .eq("id", id);

        if (error) throw error;

        await getScheduledTasks();

        return true;
      } catch (error) {
        console.error("Error reprogramando tarea:", error);
        throw error;
      }
    },
    [getScheduledTasks],
  );

  const deleteScheduledTask = useCallback(async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("id", id)
        .eq("user_email", user.email);

      if (error) throw error;

      setScheduledTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== id),
      );

      return true;
    } catch (error) {
      console.error("Error eliminando tarea:", error);
      throw error;
    }
  }, []);

  const cancelScheduledTask = useCallback(async (id) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("user_email", user.email);

      if (error) throw error;

      setScheduledTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, status: "cancelled" } : task,
        ),
      );

      return true;
    } catch (error) {
      console.error("Error cancelando tarea:", error);
      throw error;
    }
  }, []);

  // ============================================
  // 1. SUSCRIPCIÓN EN TIEMPO REAL (PRINCIPAL)
  // ============================================

  useEffect(() => {
    const channel = supabase
      .channel("scheduled_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scheduled_notifications",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new;
            setScheduledTasks((prevTasks) =>
              prevTasks.map((task) =>
                task.id === updatedTask.id ? updatedTask : task,
              ),
            );
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("¡Suscripción a scheduled_notifications ACTIVA!");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error en la suscripción, reintentando...");
          setTimeout(() => {
            channel.subscribe();
          }, 5000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ============================================
  // 2. POLLING DE RESPALDO (cada 10 segundos)
  // ============================================

  useEffect(() => {
    const hasPendingTasks = scheduledTasks.some(
      (task) => task.status === "pending",
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

        // Verificar si hay cambios
        const currentStatuses = scheduledTasks.map((t) => ({
          id: t.id,
          status: t.status,
        }));
        const newStatuses = data.map((t) => ({ id: t.id, status: t.status }));

        const hasChanges =
          JSON.stringify(currentStatuses) !== JSON.stringify(newStatuses);

        if (hasChanges) {
          setScheduledTasks(data);
        }
      } catch (error) {
        console.error("Error en polling:", error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [scheduledTasks]);

  // ============================================
  // INICIALIZAR USUARIO
  // ============================================

  useEffect(() => {
    getUser();
  }, [getUser]);

  // ============================================
  // VALORES DEL CONTEXTO
  // ============================================

  const value = {
    // Usuario
    user,
    loading,
    getUser,

    // Tareas normales
    tasks,
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
    scheduleTaskLater,
    rescheduleScheduledTask,
    deleteScheduledTask,
    cancelScheduledTask,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

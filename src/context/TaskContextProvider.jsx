// src/context/TaskContextProvider.jsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { TaskContext } from "./TaskContext";

export const TaskContextProvider = ({ children, initialSession }) => {
  // ✅ ESTADO DEL USUARIO - INICIALIZADO DESDE initialSession
  const [user, setUser] = useState(initialSession?.user || null);
  const [loading, setLoading] = useState(!initialSession?.user);

  // ESTADO DE TAREAS NORMALES
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [currentDoneFilter, setCurrentDoneFilter] = useState(false);

  // ESTADO DE TAREAS PROGRAMADAS
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [updateCounter, setUpdateCounter] = useState(0);

  // ============================================
  // OBTENER USUARIO - CON FALLBACK A initialSession
  // ============================================

  const getUser = useCallback(async () => {
    try {
      // ✅ Si ya tenemos usuario, devolverlo
      if (user) {
        console.log(`👤 Usuario ya existe: ${user.email}`);
        setLoading(false);
        return user;
      }

      setLoading(true);

      // ✅ Intentar obtener de localStorage primero
      const stored = localStorage.getItem("supabaseSession");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.user) {
            console.log(`👤 Usuario desde localStorage: ${parsed.user.email}`);
            setUser(parsed.user);
            setLoading(false);
            return parsed.user;
          }
        } catch (e) {
          console.error("Error parseando sesión:", e);
        }
      }

      // ✅ Intentar con Supabase
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        // ✅ Si falla, verificar si tenemos initialSession
        if (initialSession?.user) {
          console.log(`👤 Usuario desde initialSession: ${initialSession.user.email}`);
          setUser(initialSession.user);
          setLoading(false);
          return initialSession.user;
        }
        throw error;
      }

      if (supabaseUser) {
        console.log(`👤 Usuario desde Supabase: ${supabaseUser.email}`);
        setUser(supabaseUser);
      }

      setLoading(false);
      return supabaseUser || null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario:", error);
      setUser(null);
      setLoading(false);
      return null;
    }
  }, [user, initialSession]);

  // ============================================
  // TAREAS NORMALES - MEJORADAS
  // ============================================

  const getTasks = useCallback(async (done = false) => {
    try {
      // ✅ Usar el usuario del estado, no getUser()
      const currentUser = user || initialSession?.user;
      
      if (!currentUser) {
        console.error("❌ No user logged in");
        setTasks([]);
        return;
      }

      console.log(`📋 Cargando tareas para: ${currentUser.email} (done: ${done})`);

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", currentUser.id)
        .eq("deleted", false)
        .eq("done", done)
        .order("id", { ascending: false });

      if (error) {
        // ✅ Si el error es de sesión, intentar restaurar
        if (error.message?.includes("AuthSessionMissingError")) {
          console.log("⚠️ Error de sesión, reintentando...");
          // Esperar un momento y reintentar
          await new Promise(resolve => setTimeout(resolve, 500));
          const retry = await supabase
            .from("tasks")
            .select()
            .eq("userId", currentUser.id)
            .eq("deleted", false)
            .eq("done", done)
            .order("id", { ascending: false });
          
          if (!retry.error) {
            setTasks(retry.data || []);
            console.log(`✅ ${retry.data?.length || 0} tareas cargadas (reintento)`);
            return;
          }
        }
        throw error;
      }

      setTasks(data || []);
      console.log(`✅ ${data?.length || 0} tareas cargadas`);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    }
  }, [user, initialSession]);

  // ============================================
  // EFECTO: CARGAR TAREAS CUANDO HAY USUARIO
  // ============================================

  useEffect(() => {
    if (user) {
      console.log("✅ Usuario disponible, cargando tareas...");
      getTasks(currentDoneFilter);
    } else if (initialSession?.user) {
      console.log("✅ initialSession disponible, estableciendo usuario...");
      setUser(initialSession.user);
      getTasks(currentDoneFilter);
    }
  }, [user, initialSession, getTasks, currentDoneFilter]);

  // ============================================
  // EFECTO: ESCUCHAR CAMBIOS DE AUTENTICACIÓN
  // ============================================

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 Contexto - Evento: ${event}`);
      
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          console.log(`✅ Contexto - Usuario autenticado: ${session.user.email}`);
          setUser(session.user);
          localStorage.setItem("supabaseSession", JSON.stringify(session));
          // ✅ Recargar tareas automáticamente
          getTasks(currentDoneFilter);
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👋 Contexto - Sesión cerrada");
        setUser(null);
        setTasks([]);
        localStorage.removeItem("supabaseSession");
      }
    });

    return () => subscription.unsubscribe();
  }, [getTasks, currentDoneFilter]);

  // ============================================
  // RESTO DE FUNCIONES (SIN CAMBIOS)
  // ============================================

  const getDeletedTasks = useCallback(async () => {
    try {
      const currentUser = user || initialSession?.user;
      if (!currentUser) return [];

      const { error, data } = await supabase
        .from("tasks")
        .select()
        .eq("userId", currentUser.id)
        .eq("deleted", true)
        .order("id", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching deleted tasks:", error);
      return [];
    }
  }, [user, initialSession]);

  const createTask = async (taskName) => {
    if (!taskName.trim()) return;

    setAdding(true);
    try {
      const currentUser = user || initialSession?.user;
      if (!currentUser) {
        console.error("No user logged in");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          name: taskName,
          userId: currentUser.id,
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
      const currentUser = user || initialSession?.user;
      if (!currentUser) return;

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("userId", currentUser.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting task permanently:", error);
      throw error;
    }
  };

  const softDeleteTask = async (id) => {
    try {
      const currentUser = user || initialSession?.user;
      if (!currentUser) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: true })
        .eq("id", id)
        .eq("userId", currentUser.id);

      if (error) throw error;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error("Error soft deleting task:", error);
      throw error;
    }
  };

  const restoreTask = async (id) => {
    try {
      const currentUser = user || initialSession?.user;
      if (!currentUser) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted: false })
        .eq("id", id)
        .eq("userId", currentUser.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error restoring task:", error);
      throw error;
    }
  };

  const updateTask = async (id, updateFields) => {
    try {
      const currentUser = user || initialSession?.user;
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("tasks")
        .update(updateFields)
        .eq("id", id)
        .eq("userId", currentUser.id)
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
      setUpdateCounter((prev) => prev + 1);
      await getTasks(currentDoneFilter);
    } catch (error) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === id ? { ...task, done: currentDone } : task,
        ),
      );
      console.error("Error toggling task:", error);
    }
  };

  // TAREAS PROGRAMADAS (sin cambios, solo usar currentUser)
  const getScheduledTasks = useCallback(async () => {
    try {
      setScheduledLoading(true);
      const currentUser = user || initialSession?.user;
      
      if (!currentUser) {
        console.error("No user logged in");
        setScheduledTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .eq("user_email", currentUser.email)
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
  }, [user, initialSession]);

  const scheduleTaskLater = useCallback(
    async (task, scheduledDate, scheduledTime) => {
      try {
        const currentUser = user || initialSession?.user;
        if (!currentUser || !currentUser.email) {
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
            user_email: currentUser.email,
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
    [user, initialSession],
  );

  const rescheduleScheduledTask = useCallback(
    async (id, scheduledDate, scheduledTime) => {
      try {
        const currentUser = user || initialSession?.user;
        if (!currentUser || !currentUser.email) {
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
      const currentUser = user || initialSession?.user;
      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .delete()
        .eq("id", id)
        .eq("user_email", currentUser.email);

      if (error) throw error;

      setScheduledTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== id),
      );

      return true;
    } catch (error) {
      console.error("Error eliminando tarea:", error);
      throw error;
    }
  }, [user, initialSession]);

  const cancelScheduledTask = useCallback(async (id) => {
    try {
      const currentUser = user || initialSession?.user;
      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      const { error } = await supabase
        .from("scheduled_notifications")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("user_email", currentUser.email);

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
  }, [user, initialSession]);

  // SUSCRIPCIÓN EN TIEMPO REAL (sin cambios)
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

  // POLLING DE RESPALDO (sin cambios)
  useEffect(() => {
    const hasPendingTasks = scheduledTasks.some(
      (task) => task.status === "pending",
    );

    if (!hasPendingTasks) return;

    const interval = setInterval(async () => {
      try {
        const currentUser = user || initialSession?.user;
        if (!currentUser) return;

        const { data, error } = await supabase
          .from("scheduled_notifications")
          .select("*")
          .eq("user_email", currentUser.email)
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
          setScheduledTasks(data);
        }
      } catch (error) {
        console.error("Error en polling:", error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [scheduledTasks, user, initialSession]);

  // VALORES DEL CONTEXTO
  const value = {
    user,
    loading,
    getUser,
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
    scheduledTasks,
    scheduledLoading,
    getScheduledTasks,
    scheduleTaskLater,
    rescheduleScheduledTask,
    deleteScheduledTask,
    cancelScheduledTask,
    updateCounter,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
// src/context/TaskContextProvider.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { TaskContext } from "./TaskContext";

export const TaskContextProvider = ({ children, initialSession }) => {
  // ✅ REF para controlar suscripciones
  const channelRef = useRef(null);
  const subscriptionAttempts = useRef(0);
  const maxSubscriptionAttempts = 3;
  const isSubscribing = useRef(false);
  const isMounted = useRef(true);
  const authInitialized = useRef(false); // ← NUEVO: controlar primer SIGNED_IN

  // ✅ ESTADO DEL USUARIO
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
  // OBTENER USUARIO
  // ============================================

  const getUser = useCallback(async () => {
    try {
      if (user) {
        console.log(`👤 Usuario ya existe: ${user.email}`);
        setLoading(false);
        return user;
      }

      setLoading(true);

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

      const {
        data: { user: supabaseUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        if (initialSession?.user) {
          console.log(
            `👤 Usuario desde initialSession: ${initialSession.user.email}`,
          );
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
  // TAREAS NORMALES
  // ============================================

  const getTasks = useCallback(
    async (done = false) => {
      try {
        const currentUser = user || initialSession?.user;

        if (!currentUser) {
          console.error("❌ No user logged in");
          setTasks([]);
          return;
        }

        console.log(
          `📋 Cargando tareas para: ${currentUser.email} (done: ${done})`,
        );

        const { error, data } = await supabase
          .from("tasks")
          .select()
          .eq("userId", currentUser.id)
          .eq("deleted", false)
          .eq("done", done)
          .order("id", { ascending: false });

        if (error) {
          if (error.message?.includes("AuthSessionMissingError")) {
            console.log("⚠️ Error de sesión, reintentando...");
            await new Promise((resolve) => setTimeout(resolve, 500));
            const retry = await supabase
              .from("tasks")
              .select()
              .eq("userId", currentUser.id)
              .eq("deleted", false)
              .eq("done", done)
              .order("id", { ascending: false });

            if (!retry.error) {
              setTasks(retry.data || []);
              console.log(
                `✅ ${retry.data?.length || 0} tareas cargadas (reintento)`,
              );
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
    },
    [user, initialSession],
  );

  // ============================================
  // SUSCRIPCIÓN EN TIEMPO REAL
  // ============================================

  const setupRealtimeSubscription = useCallback(() => {
    // ✅ Si ya estamos suscribiendo, no hacer nada
    if (isSubscribing.current) {
      console.log("⏳ Ya estamos suscribiendo, esperando...");
      return;
    }

    // ✅ Si ya hay un canal activo, NO limpiarlo
    if (channelRef.current) {
      console.log("✅ Canal ya activo, no es necesario recrearlo");
      return;
    }

    // ✅ Si el componente está desmontado, no hacer nada
    if (!isMounted.current) {
      console.log("⏳ Componente desmontado, cancelando suscripción");
      return;
    }

    isSubscribing.current = true;

    try {
      console.log("🔌 Creando nueva suscripción...");

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
        );

      channel.subscribe((status, err) => {
        isSubscribing.current = false;

        if (status === "SUBSCRIBED") {
          console.log("✅ Suscripción a scheduled_notifications ACTIVA!");
          subscriptionAttempts.current = 0;
          if (!channelRef.current && isMounted.current) {
            channelRef.current = channel;
          }
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          console.error(`❌ Error en la suscripción (${status}):`, err);

          if (channelRef.current === channel) {
            channelRef.current = null;
          }

          if (!isMounted.current) return;

          if (subscriptionAttempts.current < maxSubscriptionAttempts) {
            subscriptionAttempts.current++;
            const delay = Math.min(
              1000 * Math.pow(2, subscriptionAttempts.current),
              10000,
            );
            console.log(
              `🔄 Reintentando en ${delay}ms (intento ${subscriptionAttempts.current})`,
            );

            setTimeout(() => {
              if (isMounted.current && !channelRef.current) {
                setupRealtimeSubscription();
              }
            }, delay);
          } else {
            console.error(
              "❌ Máximo de reintentos alcanzado para la suscripción",
            );
          }
        }
      });

      if (!channelRef.current && isMounted.current) {
        channelRef.current = channel;
      }
    } catch (error) {
      console.error("❌ Error configurando suscripción:", error);
      isSubscribing.current = false;
    }
  }, []);

  // ============================================
  // FUNCIÓN PARA LIMPIAR CANAL
  // ============================================

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      console.log("🧹 Limpiando canal...");
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.log("Error limpiando canal:", e);
      }
      channelRef.current = null;
    }
    isSubscribing.current = false;
  }, []);

  // ============================================
  // EFECTO: INICIALIZAR SUSCRIPCIÓN SOLO UNA VEZ
  // ============================================

  useEffect(() => {
    if (!user && !initialSession?.user) {
      console.log("⏳ Esperando usuario para iniciar suscripción...");
      return;
    }

    // ✅ Solo iniciar si no hay canal activo
    if (!channelRef.current && !isSubscribing.current && isMounted.current) {
      console.log("🔌 Iniciando suscripción a cambios en tiempo real...");
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setupRealtimeSubscription();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, initialSession, setupRealtimeSubscription]);

  // ============================================
  // EFECTO: CARGAR TAREAS CUANDO HAY USUARIO
  // ============================================

  useEffect(() => {
    if (user) {
      getTasks(currentDoneFilter);
    } else if (initialSession?.user) {
      setUser(initialSession.user);
      getTasks(currentDoneFilter);
    }
  }, [user, initialSession, getTasks, currentDoneFilter]);

  // ============================================
  // EFECTO: CLEANUP AL DESMONTAR
  // ============================================

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      cleanupChannel();
    };
  }, [cleanupChannel]);

  // ============================================
  // EFECTO: ESCUCHAR CAMBIOS DE AUTENTICACIÓN
  // ============================================

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 Contexto - Evento: ${event}`);

      // ✅ Ignorar INITIAL_SESSION - no es un cambio real
      if (event === "INITIAL_SESSION") {
        console.log("⏳ Ignorando INITIAL_SESSION (evento inicial)");
        return;
      }

      if (event === "SIGNED_IN") {
        // ✅ Solo procesar si realmente cambió algo
        if (!session?.user) return;

        // ✅ Verificar si el usuario ya está seteado (evitar duplicados)
        if (user?.email === session.user.email) {
          console.log("👤 Usuario ya autenticado, ignorando SIGNED_IN duplicado");
          return;
        }

        console.log(`✅ Contexto - Usuario autenticado: ${session.user.email}`);
        setUser(session.user);
        localStorage.setItem("supabaseSession", JSON.stringify(session));

        // ✅ Cargar tareas
        getTasks(currentDoneFilter);

        // ✅ Iniciar suscripción SOLO si no hay canal activo
        if (!channelRef.current && !isSubscribing.current && isMounted.current) {
          console.log("🔌 Iniciando suscripción después de SIGNED_IN...");
          setTimeout(() => {
            if (isMounted.current) {
              setupRealtimeSubscription();
            }
          }, 1000);
        }

      } else if (event === "SIGNED_OUT") {
        console.log("👋 Contexto - Sesión cerrada");
        setUser(null);
        setTasks([]);
        localStorage.removeItem("supabaseSession");
        cleanupChannel();
        authInitialized.current = false;
      } else if (event === "TOKEN_REFRESHED") {
        // ✅ Solo actualizar localStorage, no reiniciar todo
        if (session?.user) {
          console.log(`🔄 Token refrescado: ${session.user.email}`);
          localStorage.setItem("supabaseSession", JSON.stringify(session));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [
    getTasks,
    currentDoneFilter,
    cleanupChannel,
    setupRealtimeSubscription,
    user,
  ]);

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

  // TAREAS PROGRAMADAS
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

  // ============================================
  // POLLING DE RESPALDO
  // ============================================

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
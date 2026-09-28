// src/context/TaskContextProvider.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { TaskContext } from "./TaskContext";

export const TaskContextProvider = ({ children, initialSession }) => {
  // REF para controlar suscripciones
  const channelRef = useRef(null);
  const subscriptionAttempts = useRef(0);
  const maxSubscriptionAttempts = 3;
  const isSubscribing = useRef(false);
  const isMounted = useRef(true);
  const authInitialized = useRef(false);
  const initializedRef = useRef(false);

  // ESTADO DEL USUARIO
  const [user, setUser] = useState(initialSession?.user || null);
  const [loading, setLoading] = useState(!initialSession?.user);

  // ESTADO DE TAREAS NORMALES
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [currentDoneFilter, setCurrentDoneFilter] = useState(false);

  // ESTADO DE TAREAS PROGRAMADAS
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  // ============================================
  // OBTENER USUARIO
  // ============================================

  const getUser = useCallback(async () => {
    try {
      if (user) {
        setLoading(false);
        return user;
      }

      setLoading(true);

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

      const {
        data: { user: supabaseUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        if (initialSession?.user) {
          setUser(initialSession.user);
          setLoading(false);
          return initialSession.user;
        }
        throw error;
      }

      if (supabaseUser) {
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

        const { error, data } = await supabase
          .from("tasks")
          .select()
          .eq("userId", currentUser.id)
          .eq("deleted", false)
          .eq("done", done)
          .order("id", { ascending: false });

        if (error) {
          if (error.message?.includes("AuthSessionMissingError")) {
            console.warn("⚠️ Error de sesión, reintentando...");
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
              return;
            }
          }
          throw error;
        }

        setTasks(data || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      }
    },
    [user, initialSession],
  );

  // ============================================
  // EFECTO: INICIALIZACIÓN ÚNICA
  // ============================================
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Si hay initialSession, usarlo directamente
    if (initialSession?.user) {
      setUser(initialSession.user);
      setLoading(false);
      return;
    }

    // Si no hay initialSession, intentar recuperar de localStorage
    const stored = localStorage.getItem("supabaseSession");
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session?.user) {
          setUser(session.user);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("❌ Error parseando sesión:", e);
      }
    }

    // Si no hay sesión en localStorage, intentar con Supabase
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          setLoading(false);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("❌ Error obteniendo sesión de Supabase:", error);
        setLoading(false);
      });
  }, [initialSession]);

  // ============================================
  // EFECTO: CARGAR TAREAS CUANDO HAY USUARIO
  // ============================================
  useEffect(() => {
    if (user) {
      getTasks(currentDoneFilter);
    }
  }, [user, getTasks, currentDoneFilter]);

  // ============================================
  // EFECTO: ESCUCHAR CAMBIOS EN localStorage
  // ============================================
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "supabaseSession") {
        if (event.newValue) {
          try {
            const session = JSON.parse(event.newValue);
            if (session?.user) {
              setUser(session.user);
              setLoading(false);
            }
          } catch (e) {
            console.error("❌ Error parseando session:", e);
          }
        } else {
          setUser(null);
          setTasks([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // ============================================
  // EFECTO: ESCUCHAR CAMBIOS DE AUTENTICACIÓN DE SUPABASE
  // ============================================
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignorar INITIAL_SESSION
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (event === "SIGNED_IN") {
        if (!session?.user) return;

        // Verificar si el usuario ya está seteado
        if (user?.email === session.user.email) {
          return;
        }

        setUser(session.user);
        localStorage.setItem("supabaseSession", JSON.stringify(session));
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setTasks([]);
        localStorage.removeItem("supabaseSession");
        cleanupChannel();
        authInitialized.current = false;
      } else if (event === "TOKEN_REFRESHED") {
        if (session?.user) {
          localStorage.setItem("supabaseSession", JSON.stringify(session));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [user]);

  // ============================================
  // SUSCRIPCIÓN EN TIEMPO REAL
  // ============================================

  const setupRealtimeSubscription = useCallback(() => {
    if (isSubscribing.current) {
      return;
    }

    if (channelRef.current) {
      return;
    }

    if (!isMounted.current) {
      return;
    }

    isSubscribing.current = true;

    try {
      const channel = supabase.channel("scheduled_notifications_changes").on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scheduled_notifications",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new;
            setScheduledTasks((prevTasks) => {
              const updated = prevTasks.map((task) =>
                task.id === updatedTask.id ? updatedTask : task,
              );
              return updated.sort((a, b) => {
                return new Date(b.scheduled_for) - new Date(a.scheduled_for);
              });
            });
          }
        },
      );

      channel.subscribe((status, err) => {
        isSubscribing.current = false;

        if (status === "SUBSCRIBED") {
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
            console.warn(
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
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.error("Error limpiando canal:", e);
      }
      channelRef.current = null;
    }
    isSubscribing.current = false;
  }, []);

  // ============================================
  // EFECTO: INICIALIZAR SUSCRIPCIÓN
  // ============================================

  useEffect(() => {
    if (!user && !initialSession?.user) {
      return;
    }

    if (!channelRef.current && !isSubscribing.current && isMounted.current) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setupRealtimeSubscription();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, initialSession, setupRealtimeSubscription]);

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
        .order("id", { ascending: false });

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
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
      await updateTask(id, { done: newDoneState });
    } catch (error) {
      await getTasks(currentDoneFilter);
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
        .order("scheduled_for", { ascending: false });

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

  const deleteScheduledTask = useCallback(
    async (id) => {
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
    },
    [user, initialSession],
  );

  const cancelScheduledTask = useCallback(
    async (id) => {
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
    },
    [user, initialSession],
  );

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

        const sortedData = data.sort((a, b) => {
          return new Date(b.scheduled_for) - new Date(a.scheduled_for);
        });

        setScheduledTasks(sortedData);
      } catch (error) {
        console.error("Error en polling:", error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [scheduledTasks, user, initialSession]);

  // ============================================
  // VALORES DEL CONTEXTO
  // ============================================

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
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};